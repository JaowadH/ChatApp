
let onlineUsers = new Map(); // key: socket, value: { username, id }
let userSockets = new Map();
function onClientDisconnected(socket) {
    const userInfo = onlineUsers.get(socket);
    if (userInfo) {
        const leaveMsg = JSON.stringify({
            type: 'system',
            message: `${userInfo.username} has left the chat.`
        });

        // Broadcast to all clients except this one
        onlineUsers.forEach((_, clientSocket) => {
            if (clientSocket !== socket && clientSocket.readyState === 1) {
                clientSocket.send(leaveMsg);
            }
        });

        onlineUsers.delete(socket);
    }
}

function onNewClientConnected(socket, username, id) {
    onlineUsers.set(socket, { username, id });

    const joinMsg = JSON.stringify({
        type: 'system',
        message: `${username} has joined the chat!`
    });

    // Notify all users
    onlineUsers.forEach((_, clientSocket) => {
        if (clientSocket.readyState === 1) {
            clientSocket.send(joinMsg);
        }
    });
}

async function onNewMessage(message, username, id) {
    try {
        console.log(`[onNewMessage] ${username}: ${message}`);

        const timestamp = new Date().toLocaleTimeString();

        const msgPayload = JSON.stringify({
            type: 'message',
            message,
            sender: username,
            timestamp,
            status: 'sent',
            readBy: [username]
        });

        console.log('Broadcasting to all users...');
        onlineUsers.forEach((_, clientSocket) => {
            console.log(`Sending to: ${userSockets.get(clientSocket)}`);
            if (clientSocket.readyState === 1) {
                clientSocket.send(msgPayload);
            }
        });

    } catch (err) {
        console.error('Error in onNewMessage():', err);
    }
}


module.exports = {
    onNewClientConnected,
    onClientDisconnected,
    onNewMessage,
    userSockets 
};