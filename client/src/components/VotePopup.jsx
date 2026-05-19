import React, { useState, useEffect } from 'react';

/**
 * Vote popup shown when a word needs player validation
 */
export default function VotePopup({ word, playerName, timeout = 20, isSubmitter, onVote }) {
  const [timeLeft, setTimeLeft] = useState(timeout);
  const [voted, setVoted] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleVote = (vote) => {
    if (voted || isSubmitter) return;
    setVoted(true);
    onVote(vote);
  };

  return (
    <div className="vote-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="glass-card p-5 md:p-6 max-w-md w-full mx-4 animate-bounce-in">
        {/* Header */}
        <div className="text-center mb-5">
          <div className="text-3xl mb-2">🗳️</div>
          <h3 className="text-lg font-bold text-white">Bình chọn từ</h3>
          <p className="text-sm text-gray-400 mt-1">
            <span className="text-primary-300 font-medium">{playerName}</span> đã gửi từ:
          </p>
        </div>

        {/* Word Display */}
        <div className="text-center p-4 rounded-xl bg-primary-500/10 border border-primary-500/20 mb-5">
          <span className="text-2xl font-bold text-white">"{word}"</span>
        </div>

        {/* Timer */}
        <div className="flex items-center justify-center gap-2 mb-5">
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-linear"
              style={{
                width: `${(timeLeft / timeout) * 100}%`,
                background: timeLeft <= 3
                  ? 'linear-gradient(90deg, #ef4444, #f87171)'
                  : 'linear-gradient(90deg, #5c7cfa, #748ffc)'
              }}
            />
          </div>
          <span className={`text-sm font-mono font-bold min-w-[2rem] text-right ${
            timeLeft <= 3 ? 'text-red-400' : 'text-gray-400'
          }`}>
            {timeLeft}s
          </span>
        </div>

        {/* Vote Buttons */}
        {isSubmitter ? (
          <div className="text-center text-gray-400 text-sm py-3">
            <p>⏳ Đang chờ mọi người bình chọn...</p>
          </div>
        ) : voted ? (
          <div className="text-center text-gray-400 text-sm py-3">
            <p>✅ Bạn đã bình chọn! Đang chờ kết quả...</p>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => handleVote(true)}
              className="btn-success flex-1 flex items-center justify-center gap-2 text-base py-3"
            >
              <span>👍</span> Hợp lệ
            </button>
            <button
              onClick={() => handleVote(false)}
              className="btn-danger flex-1 flex items-center justify-center gap-2 text-base py-3"
            >
              <span>👎</span> Không hợp lệ
            </button>
          </div>
        )}

        <p className="text-center text-xs text-gray-500 mt-4">
          Từ này không có trong từ điển. Bạn quyết định!
        </p>
      </div>
    </div>
  );
}
