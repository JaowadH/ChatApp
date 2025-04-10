const express = require('express');
const expressWs = require('express-ws');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');
const User = require('./models/user');

const PORT = 3000;
//TODO: Replace with the URI pointing to your own MongoDB setup
const MONGO_URI = 'mongodb+srv://TheCodingCrew:uHRnX8eDM9WaiqtU@cluster0.fjpxev1.mongodb.net/?appName=Cluster0';
const app = express();
expressWs(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(session({
    secret: 'chat-app-secret',
    resave: false,
    saveUninitialized: true
}));

let connectedClients = [];

//Note: These are (probably) not all the required routes, nor are the ones present all completed.
//But they are a decent starting point for the routes you'll probably need

app.ws('/ws', (socket, request) => {    
    socket.on('message', (rawMessage) => {
        const parsedMessage = JSON.parse(rawMessage);
        
    });

    socket.on('close', () => {
        
    });
});

app.get('/', async (req, res) => {
    res.render('index/unauthenticated');
});

app.get('/login', async (req, res) => {
    return res.render('login');
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({username});
        if (!user) {
            return res.send('Invalid username or password');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.send('Invalid username or password');
        }

        // Store user in session
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
    res.render('signup', {errorMessage: null});
});

app.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    try {
        const existingUser = await User.findOne({username});
        if (existingUser) {
            return res.send('Username already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({username, password: hashedPassword});
        await newUser.save();

        // Set session
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

app.get('/dashboard', async (req, res) => {
    return res.render('index/authenticated');
});

app.get('/profile', async (request, response) => {
    
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
    res.render('index/authenticated', {username: req.session.user.username});
});

mongoose.connect(MONGO_URI)
    .then(() => app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)))
    .catch((err) => console.error('MongoDB connection error:', err));