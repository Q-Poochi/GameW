import React, { useState } from 'react';

/**
 * Room/Lobby waiting screen before game starts
 */
export default function Room({ roomCode, players, isHost, settings = { turnTime: 10, voteTime: 20 }, onStartGame, onUpdateSettings }) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = roomCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const canStart = players.length >= 2;

  const handleSettingsChange = (key, value) => {
    if (!isHost || !onUpdateSettings) return;
    onUpdateSettings({ ...settings, [key]: parseInt(value) });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <div className="glass-card p-6 md:p-8 w-full max-w-lg animate-fade-in">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Phòng chờ</h2>

          {/* Room Code */}
          <div className="mb-4">
            <p className="text-sm text-gray-400 mb-2">Mã phòng</p>
            <div
              onClick={copyCode}
              className="room-code cursor-pointer hover:opacity-80 transition-opacity select-all"
              title="Click để copy"
              id="room-code-display"
            >
              {roomCode}
            </div>
            <button
              onClick={copyCode}
              className="mt-2 text-xs text-gray-500 hover:text-primary-400 transition-colors flex items-center gap-1 mx-auto"
            >
              {copied ? '✅ Đã copy!' : '📋 Click để copy mã phòng'}
            </button>
          </div>
        </div>

        {/* Room Settings */}
        <div className="mb-6 p-4 rounded-xl bg-white/[0.02] border border-white/5">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            ⚙️ Cài đặt phòng
          </h3>
          
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">Thời gian 1 lượt</span>
                <span className="text-primary-400 font-bold">{settings.turnTime}s</span>
              </div>
              <input 
                type="range" 
                min="5" max="60" step="5"
                value={settings.turnTime}
                disabled={!isHost}
                onChange={(e) => handleSettingsChange('turnTime', e.target.value)}
                className={`w-full accent-primary-500 ${!isHost && 'opacity-50 cursor-not-allowed'}`}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">Thời gian bình chọn</span>
                <span className="text-amber-400 font-bold">{settings.voteTime}s</span>
              </div>
              <input 
                type="range" 
                min="10" max="60" step="5"
                value={settings.voteTime}
                disabled={!isHost}
                onChange={(e) => handleSettingsChange('voteTime', e.target.value)}
                className={`w-full accent-amber-500 ${!isHost && 'opacity-50 cursor-not-allowed'}`}
              />
            </div>
            
            {!isHost && (
              <p className="text-xs text-gray-500 italic text-center mt-2">Chỉ chủ phòng mới có thể thay đổi cài đặt</p>
            )}
          </div>
        </div>

        {/* Players List */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            👥 Người chơi ({players.length}/10)
          </h3>
          <div className="space-y-2">
            {players.map((player, index) => (
              <div
                key={player.id || index}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-300 font-bold">
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <span className="text-white font-medium text-sm">{player.name}</span>
                </div>
                {player.isHost && (
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    👑 Host
                  </span>
                )}
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: Math.min(4, 10 - players.length) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-white/5"
              >
                <div className="w-10 h-10 rounded-full bg-white/[0.02] flex items-center justify-center text-gray-600">
                  ?
                </div>
                <span className="text-gray-600 text-sm">Đang chờ...</span>
              </div>
            ))}
          </div>
        </div>

        {/* Start Button (Host only) */}
        {isHost && (
          <button
            onClick={onStartGame}
            disabled={!canStart}
            className={`w-full py-4 rounded-xl font-bold text-base transition-all duration-300 ${
              canStart
                ? 'btn-success glow-green hover:scale-[1.02]'
                : 'bg-gray-700/50 text-gray-500 cursor-not-allowed border border-white/5'
            }`}
            id="start-game-btn"
          >
            {canStart ? '🎮 Bắt đầu Game!' : `⏳ Cần thêm ${2 - players.length} người chơi`}
          </button>
        )}

        {!isHost && (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 text-gray-400 text-sm">
              <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
              Đang chờ host bắt đầu game...
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="mt-6 p-4 rounded-xl bg-primary-500/5 border border-primary-500/10">
          <h4 className="text-xs font-semibold text-primary-400 mb-2">💡 Cách chơi:</h4>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• Nối từ: từ cuối = từ đầu của cụm tiếp theo</li>
            <li>• VD: "con mèo" → "mèo cái" → "cái bàn"</li>
            <li>• Mỗi vòng sẽ có 1 từ bắt đầu ngẫu nhiên</li>
            <li>• Hết giờ hoặc sai → bị loại!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
