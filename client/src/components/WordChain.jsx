import React, { useRef, useEffect } from 'react';

/**
 * Displays the chain of words played in the current round
 */
export default function WordChain({ wordChain = [], lastWord }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [wordChain]);

  return (
    <div className="glass-card p-4 flex flex-col h-full">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
        <span>🔗</span> Chuỗi từ
        <span className="text-primary-400 text-xs font-normal">({wordChain.length} từ)</span>
      </h3>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-1 min-h-0 pr-1"
        style={{ maxHeight: '350px' }}
      >
        {wordChain.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="text-2xl mb-2">💬</p>
            <p className="text-sm">Chưa có từ nào</p>
            <p className="text-xs text-gray-600 mt-1">Hãy bắt đầu nối từ!</p>
          </div>
        ) : (
          wordChain.map((item, index) => (
            <div key={index} className="word-item">
              {index > 0 && <div className="word-connector" />}
              <div className="flex items-center gap-3 glass-card-light p-3 group hover:border-primary-500/30 transition-colors">
                <span className="text-xs text-gray-500 w-6 text-right font-mono">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-white font-medium text-sm break-words">
                    {item.word}
                  </span>
                </div>
                <span className="text-xs text-gray-500 shrink-0">
                  {item.player}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {lastWord && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <p className="text-xs text-gray-500">Từ tiếp theo phải bắt đầu bằng:</p>
          <p className="text-lg font-bold text-primary-400 mt-1">
            "{lastWord.trim().split(/\s+/).pop()}"
          </p>
        </div>
      )}
    </div>
  );
}
