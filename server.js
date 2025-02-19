const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let gameState = Array(9).fill(null); // Represents a 3x3 Tic-Tac-Toe board
let currentPlayer = 'X'; // Starting player

io.on('connection', (socket) => {
    console.log('New player connected');

    // Send current game state to the new player
    socket.emit('gameState', gameState);

    // Handle player moves
    socket.on('makeMove', (index) => {
        if (!gameState[index]) {
            gameState[index] = currentPlayer;
            currentPlayer = currentPlayer === 'X' ? 'O' : 'X'; // Switch player
            
            io.emit('gameState', gameState); // Broadcast updated state to all clients

            // Check for win or draw conditions here (optional)
        }
    });

    socket.on('disconnect', () => {
        console.log('Player disconnected');
    });
});

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
