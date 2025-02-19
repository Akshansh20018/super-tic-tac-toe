const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

let gameState = Array(9).fill(null);
let currentPlayer = 'X';

io.on('connection', (socket) => {
    console.log('New player connected');

    socket.emit('gameState', gameState);

    socket.on('makeMove', (index) => {
        if (!gameState[index]) {
            gameState[index] = currentPlayer;
            currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
            
            io.emit('gameState', gameState);
        }
    });

    socket.on('disconnect', () => {
        console.log('Player disconnected');
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});