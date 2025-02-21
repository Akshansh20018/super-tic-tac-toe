const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const INITIAL_TIME = 5 * 60; // 5 minutes in seconds

app.use(express.static(path.join(__dirname, 'public')));

// Initialize the game state
let gameState = Array(9).fill().map(() => Array(9).fill(null));
let currentPlayer = 'X';
let currentBoard = -1; // -1 means any board can be played
let players = [];
let timers = {
    X: INITIAL_TIME,
    O: INITIAL_TIME
};
let timerInterval;


io.on('connection', (socket) => {
    if (players.length < 2) {
        console.log('New player connected');
        const player = {
            id: socket.id,
            symbol: players.length === 0 ? 'X' : 'O'
        };
        players.push(player);
        socket.emit('id_status', 'Player: '+player.symbol);
        socket.emit('gameState', { gameState, currentPlayer, currentBoard, timers });
        if (players.length === 2) {
            startTimer();
        }
        } else {
        console.log('Spectator connected');
        socket.emit('id_status', 'Spectator');
        socket.emit('gameState', { gameState, currentPlayer, currentBoard, timers });
        socket.emit('You are a spectator');
    }

    socket.on('makeMove', ({ boardIndex, cellIndex }) => {
        const player = players.find(p => p.id === socket.id);
        if (player && player.symbol === currentPlayer) {
            if (currentBoard === -1 || currentBoard === boardIndex) {
                if (!gameState[boardIndex][cellIndex]) {
                    gameState[boardIndex][cellIndex] = currentPlayer;
                    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
                    currentBoard = cellIndex;

                    // Check if the next board is already full or won
                    if (isBoardComplete(gameState[currentBoard])) {
                        currentBoard = -1;
                    }
                    
                    startTimer();
                    io.emit('gameState', { gameState, currentPlayer, currentBoard, timers });

                    // Check for a winner in the sub-board
                    const subBoardWinner = checkWinner(gameState[boardIndex]);
                    if (subBoardWinner) {
                        io.emit('subBoardWin', { boardIndex, winner: subBoardWinner });
                    }

                    // Check for a winner in the main board
                    const mainBoardWinner = checkMainBoardWinner();
                    if (mainBoardWinner) {
                        io.emit('gameWin', { winner: mainBoardWinner });
                        stopTimer();
                        // resetGame();
                    }
                }
            }
        } else {
            socket.emit('notYourTurn');
        }
    });

    socket.on('disconnect', () => {
        console.log('Player disconnected');
    });
});

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timers[currentPlayer]--;
        if (timers[currentPlayer] <= 0) {
            clearInterval(timerInterval);
            const winner = currentPlayer === 'X' ? 'O' : 'X';
            io.emit('gameWin', { winner, reason: 'timeout' });
            stopTimer();
            // resetGame();
        } else {
            io.emit('updateTimers', timers);
        }
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

function isBoardComplete(board) {
    return board.every(cell => cell !== null) || checkWinner(board) !== null;
}

function checkWinner(board) {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6]             // Diagonals
    ];

    for (let line of lines) {
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}

function checkMainBoardWinner() {
    const mainBoard = gameState.map((subBoard, index) => {
        const winner = checkWinner(subBoard);
        return winner || (isBoardComplete(subBoard) ? 'T' : null);
    });
    return checkWinner(mainBoard);
}

function resetGame() {
    gameState = Array(9).fill().map(() => Array(9).fill(null));
    currentPlayer = 'X';
    currentBoard = -1;
    io.emit('gameState', { gameState, currentPlayer, currentBoard });
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
