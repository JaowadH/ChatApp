const Message = require('../models/message');

let onlineUsers = new Map(); // key: socket, value: { username, id }
let userSockets = new Map(); // key: socket, value: username

// 🔁 Broadcasts the current number of online users
function broadcastOnlineCount() {
    const payload = JSON.stringify({
        type: 'onlineCount',
        total: onlineUsers.size
    });

    onlineUsers.forEach((_, clientSocket) => {
        if (clientSocket.readyState === 1) {
            clientSocket.send(payload);
        }
    });
}

// 🔁 Broadcast a system message (join/leave notices)
function broadcastSystemMessage(text, excludeSocket = null) {
    const msg = JSON.stringify({ type: 'system', message: text });
    onlineUsers.forEach((_, clientSocket) => {
        if (clientSocket !== excludeSocket && clientSocket.readyState === 1) {
            clientSocket.send(msg);
        }
    });
}

// 🔌 On new user connection
function onNewClientConnected(socket, username, id) {
    onlineUsers.set(socket, { username, id });
    userSockets.set(socket, username);

    broadcastSystemMessage(`${username} has joined the chat!`);
    broadcastOnlineCount();
}

// ❌ On disconnect
function onClientDisconnected(socket) {
    const userInfo = onlineUsers.get(socket);
    if (userInfo) {
        broadcastSystemMessage(`${userInfo.username} has left the chat.`, socket);

        onlineUsers.delete(socket);
        userSockets.delete(socket);

        broadcastOnlineCount();
    }
}

// 💬 New message received and broadcast
async function onNewMessage(message, username, userId) {
    try {
        const timestamp = new Date();

        // Save to MongoDB
        const saved = await Message.create({
            sender: username,
            userId,
            content: message,
            timestamp,
            readBy: [username] // sender has read it by default
        });

        const msgPayload = JSON.stringify({
            type: 'message',
            message,
            sender: username,
            timestamp,
            messageId: saved._id,
            readBy: [username] // for UI rendering
        });

        // Send to all clients
        onlineUsers.forEach((_, clientSocket) => {
            if (clientSocket.readyState === 1) {
                clientSocket.send(msgPayload);
            }
        });
    } catch (err) {
        console.error('Error in onNewMessage():', err);
    }
}

// 🧠 Handle typing event
function handleTyping(socket) {
    const sender = userSockets.get(socket);
    if (!sender) return;

    const payload = JSON.stringify({
        type: 'typing',
        username: sender
    });

    onlineUsers.forEach((_, clientSocket) => {
        if (clientSocket !== socket && clientSocket.readyState === 1) {
            clientSocket.send(payload);
        }
    });
}

// ✅ Handle read receipts
async function handleMarkRead(socket) {
    const reader = userSockets.get(socket);
    if (!reader) return;

    // Update all messages that this user hasn’t read and didn’t send
    await Message.updateMany(
        { sender: { $ne: reader }, readBy: { $ne: reader } },
        { $addToSet: { readBy: reader } }
    );

    // Get messages now read by this user
    const newlyRead = await Message.find({
        sender: { $ne: reader },
        readBy: reader
    });

    newlyRead.forEach((msg) => {
        // Send update only to the original sender
        onlineUsers.forEach(({ username }, clientSocket) => {
            if (
                username === msg.sender &&
                clientSocket.readyState === 1 &&
                username !== reader
            ) {
                clientSocket.send(JSON.stringify({
                    type: 'readReceipt',
                    messageId: msg._id,
                    reader
                }));
            }
        });
    });
}

module.exports = {
    onNewClientConnected,
    onClientDisconnected,
    onNewMessage,
    handleTyping,
    handleMarkRead,
    userSockets
};
