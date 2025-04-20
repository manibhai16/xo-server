const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
      origin: 'https://client-murex-eta.vercel.app/', // 🔁 Replace this with your actual Vercel URL
      methods: ['GET', 'POST']
    }
  });
  

// Serve static files from client folder
if (process.env.NODE_ENV !== 'production') {
    app.use(express.static(path.join(__dirname, '../client')));
  }
  

const rooms = {};

io.on('connection', socket => {
  socket.on('joinRoom', room => {
    socket.join(room);
    if (!rooms[room]) rooms[room] = { players: [] };
    if (rooms[room].players.length >= 2) return;

    rooms[room].players.push(socket);
    const symbol = rooms[room].players.length === 1 ? 'X' : 'O';
    socket.emit('init', symbol);

    if (rooms[room].players.length === 2) {
      rooms[room].board = Array(9).fill(null);
      rooms[room].current = 'X';
      rooms[room].players.forEach(p => p.emit('startGame'));
    }

    socket.on('makeMove', ({ room, index }) => {
      const game = rooms[room];
      if (!game || game.board[index] || game.players.length < 2) return;
      const playerSymbol = game.players[0].id === socket.id ? 'X' : 'O';
      if (game.current !== playerSymbol) return;

      game.board[index] = playerSymbol;
      io.to(room).emit('moveMade', { index, player: playerSymbol });
      const winner = checkWinner(game.board);
      if (winner) {
        io.to(room).emit('gameOver', winner);
        delete rooms[room];
      } else {
        game.current = game.current === 'X' ? 'O' : 'X';
      }
    });

    socket.on('disconnect', () => {
      if (rooms[room]) delete rooms[room];
    });
  });
});

function checkWinner(b) {
  const lines = [
    [0,1,2], [3,4,5], [6,7,8],
    [0,3,6], [1,4,7], [2,5,8],
    [0,4,8], [2,4,6]
  ];
  for (let [a,b1,c] of lines) {
    if (b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a];
  }
  if (b.every(cell => cell)) return 'draw';
  return null;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

