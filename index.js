require('dotenv').config(); // Load .env variables

const express = require('express');
const expressWs = require('express-ws');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const User = require('./models/user');

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

// Session setup with MongoDB store
app.use(session({
    secret: SESSION_SECRET || 'fallbackSecret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGO_URI })
}));

let connectedClients = [];

// WebSocket route
app.ws('/ws', (socket, request) => {    
    socket.on('message', (rawMessage) => {
        const parsedMessage = JSON.parse(rawMessage);
        // handle incoming message
    });

    socket.on('close', () => {
        // handle socket close
    });
});

// Routes
app.get('/', async (req, res) => {
    res.render('index/unauthenticated');
});

app.get('/login', async (req, res) => {
    return res.render('login');
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) return res.send('Invalid username or password');

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.send('Invalid username or password');

        req.session.user = {
            username: user.username,
            role: user.role
        };

        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.send('Login error');
    }
});

app.get('/signup', async (req, res) => {
    res.render('signup', { errorMessage: null });
});

app.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) return res.send('Username already exists');

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
        res.send('Error during signup');
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }
    res.render('index/authenticated', { username: req.session.user.username });
});

// Connect to MongoDB and start the server
mongoose.connect(MONGO_URI)
    .then(() => app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`)))
    .catch((err) => console.error('❌ MongoDB connection error:', err));
