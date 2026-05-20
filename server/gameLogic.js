/**
 * Game Logic - Room & Game State Management
 * Manages rooms, players, turns, rounds, and game flow
 */

const { getRandomWord } = require('./wordDatabase');
const { validateWord, getLastWord } = require('./validator');

// In-memory store for all rooms
const rooms = {};

const DEFAULT_TURN_TIME = 10; // seconds per turn
const DEFAULT_VOTE_TIME = 20; // seconds for voting
const ROUND_END_DELAY = 5000; // ms before new round
const ROOM_TIMEOUT = 30 * 60 * 1000; // 30 minutes

/**
 * Generate a random 6-character room code
 */
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Make sure it's unique
  if (rooms[code]) return generateRoomCode();
  return code;
}



/**
 * Create a new room
 */
function createRoom(playerName, socketId) {
  const roomCode = generateRoomCode();
  const player = {
    id: socketId,
    name: playerName,
    isHost: true,
    isEliminated: false,
    score: 0
  };

  rooms[roomCode] = {
    code: roomCode,
    players: [player],
    hostId: socketId,
    state: 'waiting', // waiting, playing, voting, roundEnd
    currentRound: 0,
    currentPlayerIndex: 0,
    turnOrder: [],
    wordChain: [],
    usedWords: [],
    turnTime: DEFAULT_TURN_TIME,
    voteTime: DEFAULT_VOTE_TIME,
    timer: null,
    voteTimer: null,
    pendingVote: null,
    lastActivity: Date.now(),
    turnStartTime: null
  };

  return { roomCode, player };
}

/**
 * Join an existing room
 */
function joinRoom(roomCode, playerName, socketId) {
  const room = rooms[roomCode];
  if (!room) return { error: 'Phòng không tồn tại' };
  if (room.state !== 'waiting') return { error: 'Game đang diễn ra' };
  if (room.players.length >= 10) return { error: 'Phòng đã đầy (tối đa 10 người)' };
  if (room.players.some(p => p.name === playerName)) {
    return { error: 'Tên này đã được sử dụng trong phòng' };
  }

  const player = {
    id: socketId,
    name: playerName,
    isHost: false,
    isEliminated: false,
    score: 0
  };

  room.players.push(player);
  room.lastActivity = Date.now();

  return { player };
}

/**
 * Remove a player from room
 */
function removePlayer(roomCode, socketId) {
  const room = rooms[roomCode];
  if (!room) return null;

  const playerIndex = room.players.findIndex(p => p.id === socketId);
  if (playerIndex === -1) return null;

  const player = room.players[playerIndex];
  room.players.splice(playerIndex, 1);

  // If room is empty, clean up
  if (room.players.length === 0) {
    cleanupRoom(roomCode);
    return { player, roomEmpty: true };
  }

  // If host left, assign new host
  if (player.isHost && room.players.length > 0) {
    room.players[0].isHost = true;
    room.hostId = room.players[0].id;
  }

  room.lastActivity = Date.now();
  return { player, roomEmpty: false, newHost: room.players[0] };
}

/**
 * Update room settings (only host can do this)
 */
function updateRoomSettings(roomCode, socketId, settings) {
  const room = rooms[roomCode];
  if (!room) return { error: 'Phòng không tồn tại' };
  if (room.hostId !== socketId) return { error: 'Chỉ chủ phòng mới có thể thay đổi cài đặt' };
  if (room.state !== 'waiting' && room.state !== 'roundEnd') return { error: 'Không thể thay đổi cài đặt khi đang chơi' };

  if (settings.turnTime) room.turnTime = Math.max(5, Math.min(60, settings.turnTime));
  if (settings.voteTime) room.voteTime = Math.max(10, Math.min(60, settings.voteTime));

  room.lastActivity = Date.now();
  return { success: true, settings: { turnTime: room.turnTime, voteTime: room.voteTime } };
}

/**
 * Start a new game
 */
function startGame(roomCode) {
  const room = rooms[roomCode];
  if (!room) return { error: 'Phòng không tồn tại' };
  if (room.players.length < 2) return { error: 'Cần ít nhất 2 người chơi' };

  room.state = 'playing';
  room.currentRound = 0;

  return startNewRound(roomCode);
}

/**
 * Start a new round
 */
function startNewRound(roomCode) {
  const room = rooms[roomCode];
  if (!room) return { error: 'Phòng không tồn tại' };

  room.currentRound++;
  const startWord = getRandomWord();

  // Reset round state
  room.wordChain = [{ word: startWord, player: 'Hệ thống' }];
  room.usedWords = [startWord.toLowerCase()];
  room.state = 'playing';

  // Set turn order (all active players, shuffled)
  room.turnOrder = room.players
    .map(p => {
      p.isEliminated = false;
      return p.id;
    })
    .sort(() => Math.random() - 0.5);

  room.currentPlayerIndex = 0;

  return {
    startWord,
    turnOrder: room.turnOrder.map(id => {
      const p = room.players.find(pl => pl.id === id);
      return p ? p.name : 'Unknown';
    }),
    currentPlayer: getCurrentPlayer(room)
  };
}

/**
 * Get current player info
 */
function getCurrentPlayer(room) {
  if (!room || room.turnOrder.length === 0) return null;
  const playerId = room.turnOrder[room.currentPlayerIndex];
  const player = room.players.find(p => p.id === playerId);
  return player ? { id: player.id, name: player.name } : null;
}

/**
 * Get active (non-eliminated) players in turn order
 */
function getActivePlayers(room) {
  return room.turnOrder
    .map(id => room.players.find(p => p.id === id))
    .filter(p => p && !p.isEliminated);
}

/**
 * Move to next player
 */
function nextPlayer(room) {
  const activePlayers = getActivePlayers(room);
  if (activePlayers.length <= 1) return null; // Round should end

  // Find next non-eliminated player
  let attempts = 0;
  do {
    room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.turnOrder.length;
    const playerId = room.turnOrder[room.currentPlayerIndex];
    const player = room.players.find(p => p.id === playerId);
    if (player && !player.isEliminated) {
      return { id: player.id, name: player.name };
    }
    attempts++;
  } while (attempts < room.turnOrder.length);

  return null;
}

/**
 * Eliminate a player
 */
function eliminatePlayer(room, socketId) {
  const player = room.players.find(p => p.id === socketId);
  if (player) {
    player.isEliminated = true;
  }

  const activePlayers = getActivePlayers(room);

  if (activePlayers.length <= 1) {
    // Round over
    const winner = activePlayers[0] || null;
    if (winner) winner.score++;
    return {
      roundOver: true,
      winner: winner ? { id: winner.id, name: winner.name, score: winner.score } : null,
      wordChain: room.wordChain
    };
  }

  // Move to next player
  const next = nextPlayer(room);
  return {
    roundOver: false,
    eliminatedPlayer: player ? { id: player.id, name: player.name } : null,
    nextPlayer: next,
    remaining: activePlayers.length - (player && !player.isEliminated ? 0 : 0)
  };
}

/**
 * Process a submitted word
 */
function processWord(roomCode, socketId, word) {
  const room = rooms[roomCode];
  if (!room) return { error: 'Phòng không tồn tại' };
  if (room.state !== 'playing') return { error: 'Game chưa bắt đầu' };

  const currentPlayer = getCurrentPlayer(room);
  if (!currentPlayer || currentPlayer.id !== socketId) {
    return { error: 'Chưa đến lượt của bạn' };
  }

  const lastPhrase = room.wordChain.length > 0
    ? room.wordChain[room.wordChain.length - 1].word
    : null;

  const result = validateWord(
    word,
    lastPhrase,
    room.usedWords
  );

  room.lastActivity = Date.now();

  return {
    ...result,
    currentPlayer,
    lastPhrase
  };
}

/**
 * Accept a word (add to chain)
 */
function acceptWord(roomCode, word, playerName) {
  const room = rooms[roomCode];
  if (!room) return;

  room.wordChain.push({ word, player: playerName });
  room.usedWords.push(word.toLowerCase().trim());

  const next = nextPlayer(room);
  return {
    wordChain: room.wordChain,
    nextPlayer: next
  };
}

/**
 * Setup vote for a word
 */
function setupVote(roomCode, word, submitterId) {
  const room = rooms[roomCode];
  if (!room) return null;

  const activePlayers = getActivePlayers(room);
  const voters = activePlayers.filter(p => p.id !== submitterId);

  // If only 2 players, not enough voters - reject the word
  // (only 1 voter = unfair, so we require dictionary match)
  if (activePlayers.length <= 2) {
    return { skipVoting: true, reject: true };
  }

  room.state = 'voting';
  room.pendingVote = {
    word,
    submitterId,
    votes: {},
    totalVoters: voters.length,
    voterIds: voters.map(p => p.id)
  };

  return {
    skipVoting: false,
    voters: voters.map(p => ({ id: p.id, name: p.name })),
    totalVoters: voters.length
  };
}

/**
 * Process a vote
 */
function processVote(roomCode, socketId, vote) {
  const room = rooms[roomCode];
  if (!room || !room.pendingVote) return null;

  const pending = room.pendingVote;

  // Check if this player can vote
  if (!pending.voterIds.includes(socketId)) return null;
  if (pending.votes[socketId] !== undefined) return null; // Already voted

  pending.votes[socketId] = vote;

  const voteCount = Object.keys(pending.votes).length;
  const yesCount = Object.values(pending.votes).filter(v => v === true).length;
  const noCount = voteCount - yesCount;

  // Check if voting is complete
  const allVoted = voteCount >= pending.totalVoters;
  const majorityYes = yesCount > pending.totalVoters / 2;
  const majorityNo = noCount >= pending.totalVoters / 2;

  if (allVoted || majorityYes || majorityNo) {
    const accepted = majorityYes;
    room.state = 'playing';
    const result = {
      complete: true,
      accepted,
      yesCount,
      noCount,
      word: pending.word,
      submitterId: pending.submitterId
    };
    room.pendingVote = null;
    return result;
  }

  return {
    complete: false,
    currentVotes: voteCount,
    totalVoters: pending.totalVoters,
    yesCount,
    noCount
  };
}

/**
 * Get room info for clients
 */
function getRoomInfo(roomCode) {
  const room = rooms[roomCode];
  if (!room) return null;

  return {
    code: room.code,
    state: room.state,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      isEliminated: p.isEliminated,
      score: p.score
    })),
    settings: {
      turnTime: room.turnTime,
      voteTime: room.voteTime
    },
    currentRound: room.currentRound,
    currentPlayer: getCurrentPlayer(room),
    wordChain: room.wordChain,
    turnOrder: room.turnOrder.map(id => {
      const p = room.players.find(pl => pl.id === id);
      return p ? p.name : 'Unknown';
    })
  };
}

/**
 * Get raw room object (for internal use)
 */
function getRoom(roomCode) {
  return rooms[roomCode] || null;
}

/**
 * Clean up a room
 */
function cleanupRoom(roomCode) {
  const room = rooms[roomCode];
  if (room) {
    if (room.timer) clearTimeout(room.timer);
    if (room.voteTimer) clearTimeout(room.voteTimer);
    delete rooms[roomCode];
  }
}

/**
 * Clean up inactive rooms (called periodically)
 */
function cleanupInactiveRooms() {
  const now = Date.now();
  for (const code in rooms) {
    if (now - rooms[code].lastActivity > ROOM_TIMEOUT) {
      console.log(`Cleaning up inactive room: ${code}`);
      cleanupRoom(code);
    }
  }
}

/**
 * Find which room a socket is in
 */
function findRoomBySocket(socketId) {
  for (const code in rooms) {
    if (rooms[code].players.some(p => p.id === socketId)) {
      return code;
    }
  }
  return null;
}

module.exports = {
  createRoom,
  joinRoom,
  removePlayer,
  startGame,
  startNewRound,
  getCurrentPlayer,
  getActivePlayers,
  nextPlayer,
  eliminatePlayer,
  processWord,
  acceptWord,
  setupVote,
  processVote,
  getRoomInfo,
  getRoom,
  cleanupRoom,
  cleanupInactiveRooms,
  findRoomBySocket,
  updateRoomSettings,
  ROUND_END_DELAY
};
