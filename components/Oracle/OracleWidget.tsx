import React, { useState, useRef, useEffect } from 'react';
import { useOrbitStore } from '../../store/useOrbitStore';
import { Send, AlertTriangle, BrainCircuit } from 'lucide-react';
import { motion } from 'framer-motion';

export const OracleWidget: React.FC = () => {
  const [input, setInput] = useState('');
  const { oracleHistory, askOracle, isOracleThinking, triggerSOS } = useOrbitStore();
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [oracleHistory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isOracleThinking) return;
    askOracle(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
        <div className="flex items-center gap-4">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <h2 className="font-bold text-slate-100 tracking-wide font-mono text-sm">TERMINAL</h2>
        </div>
        <div className="text-xs font-mono text-slate-500">v2.5 SYS</div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {oracleHistory.map((msg) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] p-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap break-words ${msg.role === 'user'
                  ? 'bg-violet-600 text-white rounded-br-none'
                  : msg.isSOS
                    ? 'bg-red-900/50 border border-red-500 text-red-200 rounded-bl-none animate-pulse'
                    : msg.text.startsWith('[ERROR]') || msg.text.startsWith('[BLOCKED]') || msg.text.startsWith('[SILENCE]')
                      ? 'bg-amber-900/20 border border-amber-700 text-amber-200 rounded-bl-none font-mono text-xs'
                      : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                }`}
            >
              {msg.text}
            </div>
          </motion.div>
        ))}
        {isOracleThinking && (
          <div className="flex justify-start">
            <div className="bg-slate-800/50 p-3 rounded-xl rounded-bl-none flex items-center gap-2">
              <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" />
              <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce delay-100" />
              <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce delay-200" />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 bg-slate-900/80 border-t border-slate-800 flex gap-2">
        <button
          type="button"
          onClick={triggerSOS}
          className="p-2 text-red-500 hover:bg-red-900/20 rounded-lg transition-colors border border-transparent hover:border-red-900/50 group"
          title="Trigger SOS"
        >
          <AlertTriangle className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask for a roast or advice..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors placeholder:text-slate-600"
        />
        <button
          type="submit"
          disabled={!input.trim() || isOracleThinking}
          className="p-2 bg-violet-600 text-white rounded-lg hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};