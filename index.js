const express = require('express');
const expressWs = require('express-ws');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv').config();

const PORT = 3000;
//TODO: Replace with the URI pointing to your own MongoDB setup
const MONGO_URI = process.env.MONGO_URI;
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

app.get('/', async (request, response) => {
    response.render('index/unauthenticated');
});

app.get('/login', async (request, response) => {
    
});

app.get('/signup', async (request, response) => {
    return response.render('signup');
});

app.get('/dashboard', async (request, response) => {
    return response.render('index/authenticated');
});

app.get('/profile', async (request, response) => {
    
});

app.post('/logout', (request, response) => {

});

mongoose.connect(MONGO_URI)
    .then(() => app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)))
    .catch((err) => console.error('MongoDB connection error:', err));