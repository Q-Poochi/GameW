import React, { useState } from 'react';
import { initAudio } from '../utils/sounds';

/**
 * Lobby screen - Create or Join a room
 */
export default function Lobby({ onCreateRoom, onJoinRoom, isConnected }) {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState(null); // null, 'create', 'join'
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    initAudio();
    setError('');

    if (!playerName.trim()) {
      setError('Vui lòng nhập tên của bạn');
      return;
    }

    if (playerName.trim().length > 20) {
      setError('Tên tối đa 20 ký tự');
      return;
    }

    if (mode === 'create') {
      onCreateRoom(playerName.trim());
    } else if (mode === 'join') {
      if (!roomCode.trim()) {
        setError('Vui lòng nhập mã phòng');
        return;
      }
      onJoinRoom(roomCode.trim().toUpperCase(), playerName.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <div className="glass-card p-6 md:p-8 w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔗</div>
          <h1 className="text-3xl font-extrabold text-white mb-2">
            Nối Từ
          </h1>
          <p className="text-gray-400 text-sm">
            Game nối từ tiếng Việt multiplayer
          </p>
          {/* Connection status */}
          <div className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs ${
            isConnected
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${
              isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
            }`} />
            {isConnected ? 'Đã kết nối' : 'Đang kết nối...'}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name Input */}
          <div className="mb-5">
            <label className="text-sm text-gray-400 font-medium mb-2 block">
              Tên của bạn
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Nhập tên hiển thị..."
              className="game-input"
              maxLength={20}
              autoFocus
              id="player-name-input"
            />
          </div>

          {/* Mode Selection */}
          {!mode ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setMode('create')}
                disabled={!isConnected}
                className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base"
                id="create-room-btn"
              >
                <span className="text-xl">🏠</span> Tạo phòng mới
              </button>
              <button
                type="button"
                onClick={() => setMode('join')}
                disabled={!isConnected}
                className="btn-secondary w-full flex items-center justify-center gap-2 py-4 text-base"
                id="join-room-btn"
              >
                <span className="text-xl">🚪</span> Tham gia phòng
              </button>
            </div>
          ) : (
            <div className="animate-slide-up">
              {mode === 'join' && (
                <div className="mb-4">
                  <label className="text-sm text-gray-400 font-medium mb-2 block">
                    Mã phòng
                  </label>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="VD: AB12CD"
                    className="game-input text-center text-xl tracking-widest font-bold"
                    maxLength={6}
                    id="room-code-input"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setMode(null); setError(''); }}
                  className="btn-secondary flex-1"
                >
                  ← Quay lại
                </button>
                <button
                  type="submit"
                  disabled={!isConnected}
                  className="btn-primary flex-1"
                  id="submit-lobby-btn"
                >
                  {mode === 'create' ? '🚀 Tạo phòng' : '🎮 Vào phòng'}
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center animate-shake">
            {error}
          </div>
        )}

        {/* Info */}
        <div className="mt-6 text-center text-xs text-gray-600">
          <p>Tối đa 10 người chơi mỗi phòng</p>
          <p className="mt-1">Hỗ trợ tiếng Việt & tiếng Anh</p>
        </div>
      </div>
    </div>
  );
}
