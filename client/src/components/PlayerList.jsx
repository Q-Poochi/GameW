import React from 'react';

/**
 * Displays list of players with status indicators
 */
export default function PlayerList({ players = [], currentPlayerId, myId }) {
  const sortedPlayers = [...players].sort((a, b) => {
    // Active players first, then eliminated
    if (a.isEliminated !== b.isEliminated) return a.isEliminated ? 1 : -1;
    // By score descending
    return (b.score || 0) - (a.score || 0);
  });

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
        <span>👥</span> Người chơi
        <span className="text-primary-400 text-xs font-normal">
          ({players.filter(p => !p.isEliminated).length}/{players.length})
        </span>
      </h3>

      <div className="space-y-2">
        {sortedPlayers.map((player) => {
          const isActive = player.id === currentPlayerId;
          const isMe = player.id === myId;
          const isEliminated = player.isEliminated;

          return (
            <div
              key={player.id}
              className={`
                flex items-center gap-3 p-3 rounded-xl border transition-all duration-300
                ${isEliminated ? 'player-eliminated border-transparent bg-white/[0.02]' :
                  isActive ? 'player-active border-primary-500/50 bg-primary-500/10' :
                  'border-white/5 bg-white/[0.03] hover:bg-white/[0.05]'}
              `}
            >
              {/* Avatar */}
              <div className={`
                w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                ${isEliminated ? 'bg-gray-700 text-gray-500' :
                  isActive ? 'bg-primary-500/30 text-primary-300' :
                  'bg-white/10 text-gray-300'}
              `}>
                {isEliminated ? '💀' : player.name.charAt(0).toUpperCase()}
              </div>

              {/* Name & Status */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-medium truncate ${
                    isEliminated ? 'text-gray-500 line-through' : 'text-white'
                  }`}>
                    {player.name}
                  </span>
                  {isMe && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-500/20 text-primary-400 font-medium">
                      Bạn
                    </span>
                  )}
                  {player.isHost && (
                    <span className="text-[10px]">👑</span>
                  )}
                </div>
                {isActive && !isEliminated && (
                  <span className="text-[10px] text-primary-400 font-medium animate-pulse">
                    Đang chơi...
                  </span>
                )}
                {isEliminated && (
                  <span className="text-[10px] text-gray-600">Đã bị loại</span>
                )}
              </div>

              {/* Score */}
              <div className={`text-sm font-bold px-2 py-1 rounded-lg ${
                isEliminated ? 'text-gray-600' : 'text-amber-400 bg-amber-400/10'
              }`}>
                {player.score || 0}⭐
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
