require('dotenv').config();

const express = require('express');
const expressWs = require('express-ws');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const User = require('./models/user');
const Message = require('./models/message');
const { v4: uuidv4 } = require('uuid');
const {
    onNewClientConnected,
    onClientDisconnected,
    onNewMessage,
    handleTyping,
    handleMarkRead,
    userSockets
} = require('./utils/chatUtils');

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGODB_URI;
const SESSION_SECRET = process.env.SESSION_SECRET;

const app = express();
const wsInstance = expressWs(app); // Store instance in case needed later

let connectedClients = {};

// ---------- Middleware ----------

const sessionMiddleware = session({
    secret: SESSION_SECRET || 'fallbackSecret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGO_URI }),
    cookie: { secure: false }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Attach session to HTTP requests
app.use(sessionMiddleware);

// Makes req.session.user available to all EJS views via `user`
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// ----------------------------------------------------------------
// Broadcast the full list of online usernames to every socket
function broadcastOnlineUsers() {
  // userSockets is a Map<socket, { username, userId }>
  const users = Array.from(userSockets.values()).map(u => {
    // handle if you stored just a string vs. an object
    if (typeof u === 'string') {
      return { username: u };
    } else if (u && typeof u.username === 'string') {
      return { username: u.username };
    } else {
      return { username: String(u) };
    }
  });

  const payload = JSON.stringify({ type: 'onlineUsers', users });

  for (const [sock] of userSockets) {
    if (sock.readyState === 1) { // OPEN
      sock.send(payload);
    }
  }
}
// ----------------------------------------------------------------

// ---------- WebSocket Management ----------

// Apply session to WebSocket requests
app.use((req, res, next) => {
    sessionMiddleware(req, res, next);
});

app.ws('/ws', (socket, req) => {
    sessionMiddleware(req, {}, async () => {
        try {
            console.log('WebSocket setup triggered');

            const sessionUser = req.session?.user;
            console.log('WebSocket session user:', sessionUser);

            if (!sessionUser) {
                console.log('WebSocket rejected: No session');
                socket.close();
                return;
            }

            const username = sessionUser.username;
            const userId = sessionUser._id;

            connectedClients[username] = socket;

            console.log(`🔌 WebSocket connected: ${username}`);
            onNewClientConnected(socket, username, userId);
            // <- newly added: notify everyone of the updated user list
            broadcastOnlineUsers();

            socket.on('message', async (rawMessage) => {
                console.log(`Received from ${username}:`, rawMessage);
                try {
                    const data = JSON.parse(rawMessage);
                    console.log('Parsed:', data);

                    if (data.type === 'message') {
                        await onNewMessage(data.message, username, userId);
                    } else if (data.type === 'typing') {
                        handleTyping(socket);
                    } else if (data.type === 'markRead') {
                        await handleMarkRead(socket);
                    } else {
                        console.warn('Unknown type:', data.type);
                    }
                } catch (err) {
                    console.error('Error handling socket message:', err);
                }
            });

            socket.on('close', () => {
                delete connectedClients[username];
                onClientDisconnected(socket);
                // <- newly added: update everyone when someone leaves
                broadcastOnlineUsers();
                console.log(`WebSocket disconnected: ${username}`);
            });

            socket.on('error', (err) => {
                console.error('WebSocket error:', err);
            });

        } catch (err) {
            console.error('WebSocket connection crash:', err);
        }
    });
});

function requireLogin(req, res, next) {
    if (!req.session.user) {
      return res.redirect('/login');
    }
    next();
}

function requireAdmin(req, res, next) {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    return res.status(403).send('Access denied.');
}

// ---------- Routes ----------

// Landing page
app.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect('/authenticated');
    }
    res.render('index/unauthenticated');
});

app.get('/api/online-users', (req, res) => {
    res.json({ count: Object.keys(connectedClients).length });
  });  

// Login page and handler
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
        req.session.user = { _id: user._id, username: user.username, role: user.role };

        // Redirect to admin dashboard if admin, otherwise to user dashboard
        if (user.role === 'admin') {
            return res.redirect('/admin');
        } else {
            return res.redirect('/authenticated');
        }
    } catch (err) {
        console.error(err);
        res.render('login', { errorMessage: 'Login error, please try again.' });
    }
});

// Signup page and handler
app.get('/signup', (req, res) => {
    res.render('signup', { errorMessage: null });
});

app.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) return res.render('signup', { errorMessage: 'Username already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword, role: 'user' });
        await newUser.save();

        req.session.user = { _id: newUser._id, username: newUser.username, role: newUser.role };
        res.redirect('/authenticated');
    } catch (err) {
        console.error(err);
        res.render('signup', { errorMessage: 'Signup error, please try again.' });
    }
});

// Profile Route
app.get('/profile', requireLogin, async (req, res) => {
    const user = await User.findOne({ username: req.session.user.username });

    if (!user) return res.status(404).send('User Not Found');

    res.render('profile', {
        profileUser: user,
        isSelf: true
    });
});

// View another user's profile
app.get('/profile/:username', requireLogin, async (req, res) => {
    const user = await User.findOne({ username: req.params.username });
  
    if (!user) return res.status(404).send('User not found');
  
    const isSelf = req.session.user.username === req.params.username;
  
    res.render('profile', {
      profileUser: user,
      isSelf
    });
});

// Logout route
app.post('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

// Authenticated dashboard
app.get('/dashboard', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    res.redirect('/authenticated');
});

app.get('/authenticated', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }

    const messages = await Message.find().sort({ timestamp: 1 });

    res.render('index/authenticated', {
        username: req.session.user.username,
        userId: req.session.user._id,
        role: req.session.user.role,
        messages
    });
});

// Admin dashboard view
app.get('/admin', requireAdmin, async (req, res) => {
    try {
        const users = await User.find({}, 'username role');
        res.render('admin/dashboard', { users });
    } catch (err) {
        res.status(500).send('Error loading admin dashboard.');
    }
});

// Admin: delete user
app.post('/admin/delete-user', requireAdmin, async (req, res) => {
    const { username } = req.body;
    try {
        if (username === req.session.user.username) {
            return res.status(400).send('Admins cannot delete themselves.');
        }
        await User.deleteOne({ username });
        res.redirect('/admin');
    } catch (err) {
        res.status(500).send('Error deleting user.');
    }
});

// Admin: update user role
app.post('/admin/update-role', requireAdmin, async (req, res) => {
    const { username, role } = req.body;
    try {
        await User.updateOne({ username }, { role });
        res.redirect('/admin');
    } catch (err) {
        res.status(500).send('Error updating user role.');
    }
});

// ---------- Default Admin Account ----------

async function createDefaultAdmin() {
    try {
        const existingAdmin = await User.findOne({ username: 'admin' });
        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash('password', 10);
            const admin = new User({
                username: 'admin',
                password: hashedPassword, // default pass: password
                role: 'admin'
            });
            await admin.save();
            console.log('✅ Default admin account created: admin / password');
        } else {
            console.log('ℹ️ Admin account already exists');
        }
    } catch (err) {
        console.error('❌ Error creating default admin:', err);
    }
}

// ---------- MongoDB Connection and App Launch ----------

mongoose.connect(MONGO_URI)
    .then(async () => {
        await createDefaultAdmin();
        app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
    })
    .catch((err) => console.error('❌ MongoDB connection error:', err));
