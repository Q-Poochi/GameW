import React, { useState, useRef, useEffect } from 'react';
import Timer from './Timer';
import WordChain from './WordChain';
import PlayerList from './PlayerList';
import VotePopup from './VotePopup';

/**
 * Main game board - the core gameplay screen
 */
export default function GameBoard({
  gameState,
  myId,
  onSubmitWord,
  onVote,
  toast
}) {
  const [input, setInput] = useState('');
  const inputRef = useRef(null);
  const {
    topic,
    currentPlayer,
    players,
    wordChain,
    timeLeft,
    timerActive,
    round,
    isEliminated,
    voteData,
    roundResult
  } = gameState;

  const isMyTurn = currentPlayer?.id === myId && !isEliminated;
  const lastWord = wordChain.length > 0 ? wordChain[wordChain.length - 1].word : null;

  // Focus input on my turn
  useEffect(() => {
    if (isMyTurn && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMyTurn, currentPlayer]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || !isMyTurn) return;
    onSubmitWord(input.trim());
    setInput('');
  };

  // Round end screen
  if (roundResult) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div className="glass-card p-8 max-w-lg w-full text-center animate-bounce-in">
          {/* Confetti */}
          <Confetti />

          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-2xl font-bold text-white mb-2">Kết thúc vòng {round}!</h2>

          {roundResult.winner ? (
            <div className="mb-6">
              <p className="text-gray-400 mb-1">Người chiến thắng</p>
              <p className="text-3xl font-extrabold text-amber-400 glow-gold inline-block px-6 py-2 rounded-xl">
                🎉 {roundResult.winner.name}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Điểm: {roundResult.winner.score}⭐
              </p>
            </div>
          ) : (
            <p className="text-gray-400 mb-6">Không có người thắng</p>
          )}

          {/* Word Chain Summary */}
          {roundResult.wordChain && roundResult.wordChain.length > 0 && (
            <div className="mb-6">
              <p className="text-sm text-gray-400 mb-3">Chuỗi từ ({roundResult.wordChain.length} từ):</p>
              <div className="flex flex-wrap gap-2 justify-center max-h-32 overflow-y-auto">
                {roundResult.wordChain.map((item, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-lg bg-white/5 text-gray-300">
                    {item.word}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Scoreboard */}
          <div className="mb-4">
            <p className="text-sm text-gray-400 mb-2">Bảng điểm</p>
            <div className="space-y-1">
              {[...players]
                .sort((a, b) => (b.score || 0) - (a.score || 0))
                .slice(0, 5)
                .map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]">
                    <span className="text-sm text-gray-300">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {p.name}
                    </span>
                    <span className="text-sm text-amber-400 font-bold">{p.score || 0}⭐</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
            Vòng mới bắt đầu trong giây lát...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 md:p-4 relative z-10">
      {/* Vote Popup */}
      {voteData && (
        <VotePopup
          word={voteData.word}
          playerName={voteData.playerName}
          timeout={voteData.timeout || 8}
          isSubmitter={voteData.playerId === myId}
          onVote={onVote}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' && '✅ '}
          {toast.type === 'error' && '❌ '}
          {toast.type === 'info' && 'ℹ️ '}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="topic-badge">
            <span className="text-lg">{topic?.emoji || '🎮'}</span>
            <span className="text-white">{topic?.name || 'Đang tải...'}</span>
          </div>
          <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-lg">
            Vòng {round}
          </span>
        </div>

        {isEliminated && (
          <div className="px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-1.5">
            <span>👀</span> Chế độ xem - Bạn đã bị loại
          </div>
        )}
      </div>

      {/* Main Layout */}
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:h-[calc(100vh-120px)] pb-10 lg:pb-0">
        {/* Left: Word Chain */}
        <div className="lg:col-span-4 xl:col-span-3 order-2 lg:order-1 h-[350px] lg:h-auto">
          <WordChain wordChain={wordChain} lastWord={lastWord} />
        </div>

        {/* Center: Timer + Input */}
        <div className="lg:col-span-5 xl:col-span-6 order-1 lg:order-2 flex flex-col items-center justify-center py-6 lg:py-0">
          {/* Current Player */}
          <div className="text-center mb-6">
            {currentPlayer && (
              <div className="animate-fade-in">
                <p className="text-sm text-gray-400 mb-1">
                  {isMyTurn ? 'Lượt của bạn!' : 'Lượt của'}
                </p>
                <p className={`text-2xl font-bold ${isMyTurn ? 'text-primary-400' : 'text-white'}`}>
                  {isMyTurn ? '🎯 Bạn' : currentPlayer.name}
                </p>
              </div>
            )}
          </div>

          {/* Timer */}
          <div className="mb-6">
            <Timer timeLeft={timeLeft} maxTime={10} isActive={timerActive} />
          </div>

          {/* Last Word Hint */}
          {lastWord && (
            <div className="text-center mb-4 animate-fade-in">
              <p className="text-xs text-gray-500 mb-1">Từ trước:</p>
              <p className="text-lg text-gray-300 font-medium">"{lastWord}"</p>
              <p className="text-sm text-primary-400 mt-1">
                → Bắt đầu bằng "<strong>{lastWord.trim().split(/\s+/).pop()}</strong>"
              </p>
            </div>
          )}

          {!lastWord && wordChain.length === 0 && (
            <div className="text-center mb-4 text-gray-500 text-sm">
              <p>Từ đầu tiên - bạn được chọn tự do!</p>
              <p className="text-xs mt-1">(phải thuộc chủ đề {topic?.name})</p>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="w-full max-w-md">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isMyTurn ? 'Nhập từ/cụm từ...' : 'Chờ lượt của bạn...'}
                disabled={!isMyTurn}
                className={`game-input flex-1 ${isMyTurn ? 'glow-blue' : ''}`}
                maxLength={100}
                id="word-input"
              />
              <button
                type="submit"
                disabled={!isMyTurn || !input.trim()}
                className="btn-primary px-6 shrink-0"
                id="submit-word-btn"
              >
                Gửi
              </button>
            </div>
          </form>
        </div>

        {/* Right: Players */}
        <div className="lg:col-span-3 order-3">
          <PlayerList
            players={players}
            currentPlayerId={currentPlayer?.id}
            myId={myId}
          />
        </div>
      </div>
    </div>
  );
}

/** Simple confetti animation */
function Confetti() {
  const colors = ['#5c7cfa', '#f06595', '#fcc419', '#51cf66', '#ff6b6b', '#845ef7'];
  const pieces = Array.from({ length: 30 }).map((_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2}s`,
    duration: `${2 + Math.random() * 2}s`,
    size: `${6 + Math.random() * 8}px`
  }));

  return (
    <>
      {pieces.map(p => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            top: '-10px',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            transform: `rotate(${Math.random() * 360}deg)`
          }}
        />
      ))}
    </>
  );
}
