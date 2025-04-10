require('dotenv').config();

const express = require('express');
const expressWs = require('express-ws');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const User = require('./models/user');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGODB_URI;
const SESSION_SECRET = process.env.SESSION_SECRET;

const app = express();
expressWs(app);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Session setup
app.use(session({
    secret: SESSION_SECRET || 'fallbackSecret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGO_URI })
}));

// In-memory user/socket maps
const connectedClients = {};
const userSockets = new Map();

// WebSocket endpoint
app.ws('/ws', (socket, req) => {
    const username = req.session?.user?.username;
    if (!username) {
        console.log('No session for WebSocket, closing connection.');
        socket.close();
        return;
    }

    console.log(`WebSocket connected: ${username}`);
    connectedClients[username] = socket;
    userSockets.set(socket, username);
    broadcastUserList();

    socket.on('message', (rawMessage) => {
        try {
            const data = JSON.parse(rawMessage);
            switch (data.type) {
                case 'message': {
                    const timestamp = new Date().toISOString();
                    const msg = {
                        type: 'message',
                        sender: username,
                        message: data.message,
                        timestamp,
                        status: 'sent',
                        readBy: [username],
                    };
                    broadcastMessage(msg);
                    break;
                }
                case 'typing': {
                    const typingPayload = JSON.stringify({ type: 'typing', username });
                    for (const [name, sock] of Object.entries(connectedClients)) {
                        if (name !== username) {
                            sock.send(typingPayload);
                        }
                    }
                    break;
                }
            }
        } catch (err) {
            console.error('WebSocket message error:', err);
        }
    });

    socket.on('close', () => {
        const user = userSockets.get(socket);
        delete connectedClients[user];
        userSockets.delete(socket);
        broadcastUserList();
        console.log(`WebSocket disconnected: ${user}`);
    });
});

function broadcastUserList() {
    const userListPayload = JSON.stringify({
        type: 'userList',
        users: Object.keys(connectedClients)
    });
    for (const sock of Object.values(connectedClients)) {
        sock.send(userListPayload);
    }
}

function broadcastMessage(message) {
    const msgString = JSON.stringify(message);
    for (const sock of Object.values(connectedClients)) {
        sock.send(msgString);
    }
}

// Routes
app.get('/', (req, res) => {
    res.render('index/unauthenticated');
});

app.get('/login', (req, res) => {
    res.render('login', { errorMessage: null });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.render('login', { errorMessage: 'Invalid username or password' });
        }

        req.session.user = {
            username: user.username,
            role: user.role
        };

        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.render('login', { errorMessage: 'Login error, please try again.' });
    }
});

app.get('/signup', (req, res) => {
    res.render('signup', { errorMessage: null });
});

app.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) return res.render('signup', { errorMessage: 'Username already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();

        req.session.user = {
            username: newUser.username,
            role: newUser.role
        };

        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.render('signup', { errorMessage: 'Signup error, please try again.' });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

app.get('/dashboard', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    res.render('index/authenticated', { username: req.session.user.username });
});

mongoose.connect(MONGO_URI)
    .then(() => app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`)))
    .catch((err) => console.error('❌ MongoDB connection error:', err));
