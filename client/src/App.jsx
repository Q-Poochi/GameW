import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './hooks/useSocket';
import { useTimer } from './hooks/useTimer';
import { useSound } from './hooks/useSound';
import Lobby from './components/Lobby';
import Room from './components/Room';
import GameBoard from './components/GameBoard';

/**
 * App - Main application component
 * Manages screen navigation and game state via Socket.io
 */
export default function App() {
  // Screen: 'lobby' | 'room' | 'game'
  const [screen, setScreen] = useState('lobby');
  const [myName, setMyName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // Game state
  const [gameState, setGameState] = useState({
    settings: { turnTime: 10, voteTime: 20 },
    currentPlayer: null,
    players: [],
    wordChain: [],
    timeLeft: 10,
    timerActive: false,
    round: 0,
    isEliminated: false,
    voteData: null,
    roundResult: null
  });

  const { socket, isConnected, emit, on, off } = useSocket();
  const { timeLeft, isRunning, start: startTimer, stop: stopTimer, reset: resetTimer } = useTimer(null, 10);
  const sound = useSound();

  // Show toast notification
  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), duration);
  }, []);

  // Update timeLeft in game state from timer hook
  useEffect(() => {
    setGameState(prev => ({ ...prev, timeLeft }));

    // Sound effects for countdown
    if (isRunning && timeLeft > 0 && timeLeft <= 10) {
      if (timeLeft <= 3) {
        sound.playUrgentTick();
      } else {
        sound.playTick();
      }
    }
  }, [timeLeft, isRunning]);

  // === Socket Event Handlers ===
  useEffect(() => {
    if (!socket) return;

    // Error handler
    const handleError = (data) => {
      showToast(data.message, 'error');
      setError(data.message);
    };

    // Room created
    const handleRoomCreated = (data) => {
      setRoomCode(data.roomCode);
      setIsHost(true);
      setGameState(prev => ({ ...prev, players: data.players, settings: data.settings || prev.settings }));
      setScreen('room');
      sound.init();
    };

    // Room joined
    const handleRoomJoined = (data) => {
      setRoomCode(data.code);
      setIsHost(false);
      setGameState(prev => ({ ...prev, players: data.players, settings: data.settings || prev.settings }));
      setScreen('room');
      sound.init();
    };

    // Player joined
    const handlePlayerJoined = (data) => {
      setGameState(prev => ({ ...prev, players: data.players }));
      showToast('Có người chơi mới tham gia!', 'info');
      sound.playNotify();
    };

    // Game started
    const handleGameStarted = (data) => {
      setGameState(prev => ({
        ...prev,
        currentPlayer: data.currentPlayer,
        round: data.round,
        wordChain: data.wordChain,
        isEliminated: false,
        voteData: null,
        roundResult: null,
        timerActive: false
      }));
      setScreen('game');
      showToast(`Từ bắt đầu: ${data.startWord}`, 'info');
    };

    // Turn started
    const handleTurnStarted = (data) => {
      setGameState(prev => ({
        ...prev,
        currentPlayer: data.currentPlayer,
        timerActive: true,
        voteData: null
      }));
      startTimer(data.startTime, data.timeLimit);
    };

    // Word accepted
    const handleWordAccepted = (data) => {
      stopTimer();
      setGameState(prev => ({
        ...prev,
        wordChain: data.wordChain,
        currentPlayer: data.nextPlayer,
        timerActive: false,
        voteData: null
      }));
      sound.playCorrect();
      showToast(`✓ "${data.word}" - ${data.player}`, 'success', 2000);
    };

    // Word rejected
    const handleWordRejected = (data) => {
      stopTimer();
      sound.playWrong();

      const isMe = data.eliminatedPlayer?.id === socket.id;
      if (isMe) {
        setGameState(prev => ({ ...prev, isEliminated: true, timerActive: false, voteData: null }));
        showToast(`${data.reason} - Bạn đã bị loại!`, 'error', 4000);
      } else {
        setGameState(prev => ({ ...prev, timerActive: false, voteData: null }));
        showToast(`${data.eliminatedPlayer?.name}: ${data.reason}`, 'error', 3000);
      }
    };

    // Player eliminated
    const handlePlayerEliminated = (data) => {
      setGameState(prev => ({
        ...prev,
        players: prev.players.map(p =>
          p.id === data.player.id ? { ...p, isEliminated: true } : p
        )
      }));
    };

    // Vote requested
    const handleVoteRequested = (data) => {
      stopTimer();
      setGameState(prev => ({
        ...prev,
        voteData: data,
        timerActive: false
      }));
      sound.playNotify();
    };

    // Vote result
    const handleVoteResult = (data) => {
      setGameState(prev => ({ ...prev, voteData: null }));
      if (data.accepted) {
        showToast(`"${data.word}" được chấp nhận (${data.yesCount} đồng ý)`, 'success');
      } else {
        showToast(`"${data.word}" bị từ chối (${data.noCount} phản đối)`, 'error');
      }
    };

    // Round ended
    const handleRoundEnded = (data) => {
      stopTimer();
      setGameState(prev => ({
        ...prev,
        roundResult: data,
        timerActive: false,
        voteData: null,
        players: data.players || prev.players
      }));
      if (data.winner) {
        sound.playWin();
      }
    };

    // New round
    const handleNewRound = (data) => {
      setGameState(prev => ({
        ...prev,
        currentPlayer: data.currentPlayer,
        round: data.round,
        wordChain: data.wordChain,
        isEliminated: false,
        voteData: null,
        roundResult: null,
        timerActive: false,
        players: prev.players.map(p => ({ ...p, isEliminated: false }))
      }));
      showToast(`Vòng ${data.round} - Bắt đầu bằng: ${data.startWord}`, 'info');
    };

    // Settings updated
    const handleSettingsUpdated = (data) => {
      setGameState(prev => ({ ...prev, settings: data }));
      showToast('Cập nhật cài đặt phòng', 'info');
    };

    // Player disconnected
    const handlePlayerDisconnected = (data) => {
      setGameState(prev => ({ ...prev, players: data.players }));
      showToast(`${data.player.name} đã rời phòng`, 'info');
      if (data.newHost?.id === socket.id) {
        setIsHost(true);
        showToast('Bạn là host mới!', 'info');
      }
    };

    // Register all listeners
    on('error_msg', handleError);
    on('room_created', handleRoomCreated);
    on('room_joined', handleRoomJoined);
    on('player_joined', handlePlayerJoined);
    on('game_started', handleGameStarted);
    on('turn_started', handleTurnStarted);
    on('word_accepted', handleWordAccepted);
    on('word_rejected', handleWordRejected);
    on('player_eliminated', handlePlayerEliminated);
    on('vote_requested', handleVoteRequested);
    on('vote_result', handleVoteResult);
    on('round_ended', handleRoundEnded);
    on('new_round', handleNewRound);
    on('settings_updated', handleSettingsUpdated);
    on('player_disconnected', handlePlayerDisconnected);

    return () => {
      off('error_msg', handleError);
      off('room_created', handleRoomCreated);
      off('room_joined', handleRoomJoined);
      off('player_joined', handlePlayerJoined);
      off('game_started', handleGameStarted);
      off('turn_started', handleTurnStarted);
      off('word_accepted', handleWordAccepted);
      off('word_rejected', handleWordRejected);
      off('player_eliminated', handlePlayerEliminated);
      off('vote_requested', handleVoteRequested);
      off('vote_result', handleVoteResult);
      off('round_ended', handleRoundEnded);
      off('new_round', handleNewRound);
      off('settings_updated', handleSettingsUpdated);
      off('player_disconnected', handlePlayerDisconnected);
    };
  }, [socket, on, off, showToast, startTimer, stopTimer, sound]);

  // === Actions ===
  const handleCreateRoom = (name) => {
    setMyName(name);
    emit('create_room', { playerName: name });
  };

  const handleJoinRoom = (code, name) => {
    setMyName(name);
    emit('join_room', { roomCode: code, playerName: name });
  };

  const handleStartGame = () => {
    emit('start_game');
  };

  const handleUpdateSettings = (settings) => {
    emit('update_settings', settings);
  };

  const handleSubmitWord = (word) => {
    emit('submit_word', { word });
  };

  const handleVote = (vote) => {
    emit('vote_word', { vote });
  };

  return (
    <>
      {/* Animated Background */}
      <div className="bg-animated" />

      {/* Main Content */}
      {screen === 'lobby' && (
        <Lobby
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          isConnected={isConnected}
        />
      )}

      {screen === 'room' && (
        <Room
          roomCode={roomCode}
          players={gameState.players}
          isHost={isHost}
          settings={gameState.settings}
          onStartGame={handleStartGame}
          onUpdateSettings={handleUpdateSettings}
        />
      )}

      {screen === 'game' && (
        <GameBoard
          gameState={gameState}
          myId={socket?.id}
          onSubmitWord={handleSubmitWord}
          onVote={handleVote}
          toast={toast}
        />
      )}

      {/* Global Toast (lobby/room screens) */}
      {screen !== 'game' && toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </>
  );
}
