/**
 * Connect Word Game - Server
 * Express + Socket.io server for real-time multiplayer word chain game
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const {
  createRoom, joinRoom, removePlayer, startGame, startNewRound,
  getCurrentPlayer, getActivePlayers, eliminatePlayer, processWord,
  acceptWord, setupVote, processVote, getRoomInfo, getRoom,
  cleanupInactiveRooms, findRoomBySocket,
  updateRoomSettings, ROUND_END_DELAY
} = require('./gameLogic');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Cleanup inactive rooms every 5 minutes
setInterval(cleanupInactiveRooms, 5 * 60 * 1000);

/**
 * Start turn timer for current player
 */
function startTurnTimer(roomCode) {
  const room = getRoom(roomCode);
  if (!room || room.state !== 'playing') return;

  // Clear existing timer
  if (room.timer) clearTimeout(room.timer);

  const currentPlayer = getCurrentPlayer(room);
  if (!currentPlayer) return;

  room.turnStartTime = Date.now();

  // Notify all clients
  io.to(roomCode).emit('turn_started', {
    currentPlayer: { id: currentPlayer.id, name: currentPlayer.name },
    timeLimit: room.turnTime,
    startTime: room.turnStartTime
  });

  // Set timeout
  room.timer = setTimeout(() => {
    handleTimeout(roomCode);
  }, room.turnTime * 1000);
}

/**
 * Handle turn timeout
 */
function handleTimeout(roomCode) {
  const room = getRoom(roomCode);
  if (!room || room.state !== 'playing') return;

  const currentPlayer = getCurrentPlayer(room);
  if (!currentPlayer) return;

  console.log(`[${roomCode}] Player ${currentPlayer.name} timed out`);

  // Eliminate player
  const result = eliminatePlayer(room, currentPlayer.id);

  io.to(roomCode).emit('word_rejected', {
    reason: 'Hết thời gian!',
    eliminatedPlayer: { id: currentPlayer.id, name: currentPlayer.name }
  });

  io.to(roomCode).emit('player_eliminated', {
    player: { id: currentPlayer.id, name: currentPlayer.name },
    remaining: getActivePlayers(room).length
  });

  if (result.roundOver) {
    handleRoundEnd(roomCode, result.winner);
  } else {
    startTurnTimer(roomCode);
  }
}

/**
 * Handle round end
 */
function handleRoundEnd(roomCode, winner) {
  const room = getRoom(roomCode);
  if (!room) return;

  room.state = 'roundEnd';
  if (room.timer) clearTimeout(room.timer);

  io.to(roomCode).emit('round_ended', {
    winner: winner,
    wordChain: room.wordChain,
    round: room.currentRound,
    players: room.players.map(p => ({
      id: p.id, name: p.name, score: p.score, isEliminated: p.isEliminated
    }))
  });

  // Auto start new round after delay
  setTimeout(() => {
    const currentRoom = getRoom(roomCode);
    if (!currentRoom || currentRoom.players.length < 2) return;

    const roundData = startNewRound(roomCode);
    if (roundData.error) return;

    io.to(roomCode).emit('new_round', {
      startWord: roundData.startWord,
      currentPlayer: roundData.currentPlayer,
      turnOrder: roundData.turnOrder,
      round: currentRoom.currentRound,
      wordChain: [{ word: roundData.startWord, player: 'Hệ thống' }]
    });

    startTurnTimer(roomCode);
  }, ROUND_END_DELAY);
}

/**
 * Handle vote timeout
 */
function handleVoteTimeout(roomCode) {
  const room = getRoom(roomCode);
  if (!room || room.state !== 'voting' || !room.pendingVote) return;

  const pending = room.pendingVote;
  const yesCount = Object.values(pending.votes).filter(v => v === true).length;
  const totalVoted = Object.keys(pending.votes).length;
  const accepted = yesCount > totalVoted / 2 && totalVoted > 0;

  room.state = 'playing';

  finishVoting(roomCode, accepted, yesCount, totalVoted - yesCount, pending);
}

/**
 * Finish voting and process result
 */
function finishVoting(roomCode, accepted, yesCount, noCount, pending) {
  const room = getRoom(roomCode);
  if (!room) return;

  if (room.voteTimer) {
    clearTimeout(room.voteTimer);
    room.voteTimer = null;
  }

  const submitter = room.players.find(p => p.id === pending.submitterId);
  const submitterName = submitter ? submitter.name : 'Unknown';

  io.to(roomCode).emit('vote_result', {
    word: pending.word,
    accepted,
    yesCount,
    noCount
  });

  if (accepted) {
    // Word accepted via vote
    const chainResult = acceptWord(roomCode, pending.word, submitterName);
    io.to(roomCode).emit('word_accepted', {
      word: pending.word,
      player: submitterName,
      nextPlayer: chainResult.nextPlayer,
      wordChain: chainResult.wordChain
    });
    room.pendingVote = null;
    startTurnTimer(roomCode);
  } else {
    // Word rejected via vote - eliminate player
    const elimResult = eliminatePlayer(room, pending.submitterId);
    io.to(roomCode).emit('word_rejected', {
      reason: 'Từ bị các người chơi khác từ chối!',
      eliminatedPlayer: { id: pending.submitterId, name: submitterName }
    });
    io.to(roomCode).emit('player_eliminated', {
      player: { id: pending.submitterId, name: submitterName },
      remaining: getActivePlayers(room).length
    });
    room.pendingVote = null;

    if (elimResult.roundOver) {
      handleRoundEnd(roomCode, elimResult.winner);
    } else {
      startTurnTimer(roomCode);
    }
  }
}

// =====================
// Socket.io Event Handlers
// =====================
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // === CREATE ROOM ===
  socket.on('create_room', ({ playerName }) => {
    if (!playerName || playerName.trim().length === 0) {
      socket.emit('error_msg', { message: 'Vui lòng nhập tên' });
      return;
    }

    const { roomCode, player } = createRoom(playerName.trim(), socket.id);
    socket.join(roomCode);

    console.log(`[${roomCode}] Room created by ${playerName}`);

    socket.emit('room_created', {
      roomCode,
      players: [{ id: player.id, name: player.name, isHost: true, score: 0 }],
      settings: { turnTime: 10, voteTime: 20 }
    });
  });

  // === UPDATE SETTINGS ===
  socket.on('update_settings', (settings) => {
    const roomCode = findRoomBySocket(socket.id);
    if (!roomCode) return;

    const result = updateRoomSettings(roomCode, socket.id, settings);
    if (result.error) {
      socket.emit('error_msg', { message: result.error });
      return;
    }

    io.to(roomCode).emit('settings_updated', result.settings);
  });

  // === JOIN ROOM ===
  socket.on('join_room', ({ roomCode, playerName }) => {
    if (!playerName || playerName.trim().length === 0) {
      socket.emit('error_msg', { message: 'Vui lòng nhập tên' });
      return;
    }
    if (!roomCode || roomCode.trim().length === 0) {
      socket.emit('error_msg', { message: 'Vui lòng nhập mã phòng' });
      return;
    }

    const code = roomCode.trim().toUpperCase();
    const result = joinRoom(code, playerName.trim(), socket.id);

    if (result.error) {
      socket.emit('error_msg', { message: result.error });
      return;
    }

    socket.join(code);
    console.log(`[${code}] ${playerName} joined`);

    const roomInfo = getRoomInfo(code);
    socket.emit('room_joined', roomInfo);
    socket.to(code).emit('player_joined', { players: roomInfo.players });
  });

  // === START GAME ===
  socket.on('start_game', () => {
    const roomCode = findRoomBySocket(socket.id);
    if (!roomCode) return;

    const room = getRoom(roomCode);
    if (!room || room.hostId !== socket.id) {
      socket.emit('error_msg', { message: 'Chỉ chủ phòng mới có thể bắt đầu game' });
      return;
    }

    const result = startGame(roomCode);
    if (result.error) {
      socket.emit('error_msg', { message: result.error });
      return;
    }

    console.log(`[${roomCode}] Game started! Start Word: ${result.startWord}`);

    io.to(roomCode).emit('game_started', {
      startWord: result.startWord,
      currentPlayer: result.currentPlayer,
      turnOrder: result.turnOrder,
      round: room.currentRound,
      wordChain: [{ word: result.startWord, player: 'Hệ thống' }]
    });

    startTurnTimer(roomCode);
  });

  // === SUBMIT WORD ===
  socket.on('submit_word', ({ word }) => {
    const roomCode = findRoomBySocket(socket.id);
    if (!roomCode) return;

    const room = getRoom(roomCode);
    if (!room) return;

    // Clear turn timer
    if (room.timer) clearTimeout(room.timer);

    const result = processWord(roomCode, socket.id, word);

    if (result.error) {
      socket.emit('error_msg', { message: result.error });
      startTurnTimer(roomCode); // Restart timer
      return;
    }

    if (result.valid === true) {
      // Word accepted by dictionary
      const chainResult = acceptWord(roomCode, word, result.currentPlayer.name);

      io.to(roomCode).emit('word_accepted', {
        word,
        player: result.currentPlayer.name,
        nextPlayer: chainResult.nextPlayer,
        wordChain: chainResult.wordChain
      });

      startTurnTimer(roomCode);

    } else if (result.valid === false) {
      // Word rejected
      const elimResult = eliminatePlayer(room, socket.id);

      io.to(roomCode).emit('word_rejected', {
        reason: result.reason,
        eliminatedPlayer: { id: socket.id, name: result.currentPlayer.name }
      });

      io.to(roomCode).emit('player_eliminated', {
        player: { id: socket.id, name: result.currentPlayer.name },
        remaining: getActivePlayers(room).length
      });

      if (elimResult.roundOver) {
        handleRoundEnd(roomCode, elimResult.winner);
      } else {
        startTurnTimer(roomCode);
      }

    } else if (result.needsVoting) {
      // Need player voting
      const voteSetup = setupVote(roomCode, word, socket.id);

      if (voteSetup.skipVoting) {
        if (voteSetup.reject) {
          // Not enough players to vote, word not in dictionary - reject
          const elimResult = eliminatePlayer(room, socket.id);

          io.to(roomCode).emit('word_rejected', {
            reason: 'Từ không có trong từ điển! (Cần 3+ người chơi để bình chọn từ mới)',
            eliminatedPlayer: { id: socket.id, name: result.currentPlayer.name }
          });

          io.to(roomCode).emit('player_eliminated', {
            player: { id: socket.id, name: result.currentPlayer.name },
            remaining: getActivePlayers(room).length
          });

          if (elimResult.roundOver) {
            handleRoundEnd(roomCode, elimResult.winner);
          } else {
            startTurnTimer(roomCode);
          }
        } else {
          // Fallback auto-accept (shouldn't normally reach here)
          const chainResult = acceptWord(roomCode, word, result.currentPlayer.name);
          io.to(roomCode).emit('word_accepted', {
            word,
            player: result.currentPlayer.name,
            nextPlayer: chainResult.nextPlayer,
            wordChain: chainResult.wordChain
          });
          startTurnTimer(roomCode);
        }
      } else {
        // Start voting
        io.to(roomCode).emit('vote_requested', {
          word,
          playerName: result.currentPlayer.name,
          playerId: socket.id,
          timeout: room.voteTime,
          totalVoters: voteSetup.totalVoters
        });

        // Vote timeout
        room.voteTimer = setTimeout(() => {
          handleVoteTimeout(roomCode);
        }, room.voteTime * 1000);
      }
    }
  });

  // === VOTE WORD ===
  socket.on('vote_word', ({ vote }) => {
    const roomCode = findRoomBySocket(socket.id);
    if (!roomCode) return;

    const result = processVote(roomCode, socket.id, vote);
    if (!result) return;

    if (result.complete) {
      finishVoting(
        roomCode,
        result.accepted,
        result.yesCount,
        result.noCount,
        { word: result.word, submitterId: result.submitterId }
      );
    } else {
      // Partial vote update
      io.to(roomCode).emit('vote_update', {
        currentVotes: result.currentVotes,
        totalVoters: result.totalVoters
      });
    }
  });

  // === DISCONNECT ===
  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);

    const roomCode = findRoomBySocket(socket.id);
    if (!roomCode) return;

    const room = getRoom(roomCode);
    const currentPlayer = room ? getCurrentPlayer(room) : null;
    const isCurrentPlayer = currentPlayer && currentPlayer.id === socket.id;

    const result = removePlayer(roomCode, socket.id);
    if (!result) return;

    if (result.roomEmpty) {
      console.log(`[${roomCode}] Room empty, cleaned up`);
      return;
    }

    io.to(roomCode).emit('player_disconnected', {
      player: { id: result.player.id, name: result.player.name },
      players: getRoomInfo(roomCode)?.players || [],
      newHost: result.newHost ? { id: result.newHost.id, name: result.newHost.name } : null
    });

    // If the disconnected player was the current player during a game
    if (isCurrentPlayer && room && room.state === 'playing') {
      if (room.timer) clearTimeout(room.timer);

      const activePlayers = getActivePlayers(room);
      if (activePlayers.length <= 1) {
        const winner = activePlayers[0] || null;
        if (winner) winner.score++;
        handleRoundEnd(roomCode, winner ? { id: winner.id, name: winner.name, score: winner.score } : null);
      } else {
        startTurnTimer(roomCode);
      }
    }
  });
});

const fs = require('fs');
const clientDistPath = path.join(__dirname, '../client/dist');
console.log('[Init] Client Dist Path:', clientDistPath);
console.log('[Init] Does Dist exist?', fs.existsSync(clientDistPath));

// Serve static frontend in production
app.use(express.static(clientDistPath));
app.get('*', (req, res) => {
  const indexPath = path.join(clientDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({
      error: 'Frontend build not found!',
      path: indexPath,
      __dirname: __dirname,
      cwd: process.cwd()
    });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🎮 Connect Word Game Server running on port ${PORT}`);
  console.log(`   http://localhost:${PORT}`);
});
