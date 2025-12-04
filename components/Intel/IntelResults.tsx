import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, ExternalLink, Lightbulb, Save, BookOpen, MessageSquarePlus, Send, Loader2 } from 'lucide-react';
import { IntelResult } from '../../lib/ai/intel';
import { Streamdown } from 'streamdown';

interface IntelResultsProps {
  result: IntelResult;
  query: string;
  onSave?: () => void;
  onFollowUp?: (followUpQuery: string) => void;
  isLoading?: boolean;
  modelUsed?: string;
}

export const IntelResults: React.FC<IntelResultsProps> = ({ result, query, onSave, onFollowUp, isLoading, modelUsed }) => {
  const [followUpText, setFollowUpText] = useState('');
  const [showFollowUp, setShowFollowUp] = useState(false);

  // Defensive checks to prevent crashes
  if (!result) {
    return (
      <div className="text-center text-red-400 p-4">
        <p className="font-mono text-sm">Error: No result data received</p>
      </div>
    );
  }

  const summaryBullets = Array.isArray(result.summary_bullets) ? result.summary_bullets : [];
  const sources = Array.isArray(result.sources) ? result.sources : [];
  const relatedConcepts = Array.isArray(result.related_concepts) ? result.related_concepts : [];

  // Detect if this is a conversation response (no sources/concepts, single bullet with plain text)
  const isConversationMode = sources.length === 0 && relatedConcepts.length === 0 && summaryBullets.length === 1;

  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpText.trim() || !onFollowUp || isLoading) return;
    onFollowUp(followUpText);
    setFollowUpText('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* Query Header */}
      <div className="border border-slate-800 bg-slate-900/60 rounded-lg p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Query</p>
            <p className="text-slate-200 text-sm font-medium leading-relaxed">{query}</p>
          </div>
          {onSave && (
            <button
              onClick={onSave}
              className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white rounded-lg text-xs font-mono uppercase tracking-wider transition-all shadow-lg shadow-violet-900/20"
            >
              <Save className="w-3.5 h-3.5" />
              Save Drop
            </button>
          )}
        </div>

        {/* Attached Image - Subtle display below query */}
        {result.attachment_url && result.attachment_type?.startsWith('image/') && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 rounded-lg overflow-hidden border border-cyan-500/30 hover:border-cyan-500/50 transition-colors cursor-pointer max-w-sm"
            onClick={() => window.open(result.attachment_url, '_blank')}
          >
            <img
              src={result.attachment_url}
              alt="Transmission attachment"
              className="w-full h-auto object-cover max-h-64 hover:opacity-90 transition-opacity"
              loading="lazy"
            />
            <div className="px-2 py-1 bg-slate-900/80 text-[9px] text-slate-500 font-mono uppercase tracking-wider text-center">
              Click to expand
            </div>
          </motion.div>
        )}
      </div>

      {/* Response Content - Different rendering for conversation vs research */}
      {summaryBullets.length > 0 && (
        <div className="border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-900/40 rounded-lg overflow-hidden">
          <div className="bg-slate-900/90 px-4 py-2 border-b border-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <h3 className="font-mono text-xs uppercase tracking-widest text-slate-300">
              {isConversationMode ? 'Response' : 'Executive Summary'}
            </h3>
            <div className="flex-1" />
            {!isConversationMode && <span className="text-[9px] font-mono text-slate-600">CLASSIFIED: LEVEL 3</span>}
          </div>
          <div className="p-4 space-y-3">
            {isConversationMode ? (
              // Conversation mode: Just show the text naturally with markdown rendering
              <div className="text-slate-300 text-sm leading-relaxed prose prose-invert prose-sm max-w-none prose-p:my-2 prose-headings:text-slate-200 prose-strong:text-slate-100 prose-code:text-cyan-400 prose-pre:bg-slate-950">
                <Streamdown>{summaryBullets[0]}</Streamdown>
              </div>
            ) : (
              // Research mode: Show as numbered bullets with markdown rendering
              summaryBullets.map((bullet, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex gap-3 group"
            >
              <div className="flex-shrink-0 mt-1">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 flex items-center justify-center">
                  <span className="text-xs font-mono text-cyan-400">{idx + 1}</span>
                </div>
              </div>
              <div className="text-slate-300 text-sm leading-relaxed flex-1 prose prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:text-slate-200 prose-strong:text-slate-100 prose-code:text-cyan-400">
                <Streamdown>{bullet}</Streamdown>
              </div>
            </motion.div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Deep Dive Essay (Conditional) */}
      {result.essay && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="border border-violet-500/30 bg-slate-900/40 rounded-lg overflow-hidden relative"
        >
          <div className="absolute inset-0 bg-violet-500/5 pointer-events-none" />
          <div className="bg-slate-900/90 px-4 py-2 border-b border-violet-500/30 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-violet-400" />
            <h3 className="font-mono text-xs uppercase tracking-widest text-violet-300">Deep Dive Essay</h3>
            <div className="flex-1" />
            <span className="text-[9px] font-mono text-violet-500">
              {modelUsed ? `Generated by ${modelUsed}` : 'Generated by Intel Engine'}
            </span>
          </div>
          <div className="p-6 text-slate-300 text-sm leading-7 space-y-4 font-serif prose prose-invert max-w-none prose-headings:text-violet-200 prose-strong:text-slate-100 prose-em:text-violet-300 prose-code:text-cyan-400 prose-pre:bg-slate-950">
            <Streamdown>{result.essay}</Streamdown>
          </div>
        </motion.div>
      )}

      {/* Source Intelligence */}
      {sources.length > 0 && (
        <div className="border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-900/40 rounded-lg overflow-hidden">
          <div className="bg-slate-900/90 px-4 py-2 border-b border-slate-800 flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-violet-400" />
            <h3 className="font-mono text-xs uppercase tracking-widest text-slate-300">Source Intelligence</h3>
            <div className="flex-1" />
            <span className="text-[9px] font-mono text-slate-600">{sources.length} VERIFIED</span>
          </div>
          <div className="p-4 space-y-2">
            {sources.map((source, idx) => (
            <motion.a
              key={idx}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + idx * 0.1 }}
              className="block p-3 bg-slate-950/50 border border-slate-800 rounded-lg hover:border-violet-500/50 hover:bg-slate-950/80 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded bg-violet-500/10 border border-violet-500/20 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                  <ExternalLink className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 group-hover:text-violet-400 transition-colors truncate">
                    {source.title}
                  </p>
                  <p className="text-xs text-slate-500 font-mono truncate mt-0.5">{source.url}</p>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">{source.snippet}</p>
                </div>
              </div>
            </motion.a>
            ))}
          </div>
        </div>
      )}

      {/* Related Concepts */}
      {relatedConcepts.length > 0 && (
        <div className="border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-900/40 rounded-lg overflow-hidden">
          <div className="bg-slate-900/90 px-4 py-2 border-b border-slate-800 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <h3 className="font-mono text-xs uppercase tracking-widest text-slate-300">Related Concepts</h3>
            <div className="flex-1" />
            <span className="text-[9px] font-mono text-slate-600">FOLLOW-UP VECTORS</span>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              {relatedConcepts.map((concept, idx) => (
              <motion.button
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + idx * 0.1 }}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 hover:border-amber-500/40 rounded-full text-xs text-amber-400 hover:text-amber-300 font-mono uppercase tracking-wide transition-all hover:scale-105"
              >
                {concept}
              </motion.button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Follow-Up Conversation Section */}
      {onFollowUp && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="border border-violet-500/30 bg-gradient-to-br from-slate-900/80 to-violet-900/20 rounded-lg overflow-hidden"
        >
          <button
            onClick={() => setShowFollowUp(!showFollowUp)}
            className="w-full bg-slate-900/90 px-4 py-2 border-b border-violet-500/30 flex items-center justify-between hover:bg-slate-900/70 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <MessageSquarePlus className="w-4 h-4 text-violet-400" />
              <h3 className="font-mono text-xs uppercase tracking-widest text-violet-300">Continue Conversation</h3>
            </div>
            <span className="text-[9px] font-mono text-violet-500 group-hover:text-violet-400 transition-colors">
              {showFollowUp ? 'COLLAPSE' : 'EXPAND'}
            </span>
          </button>

          {showFollowUp && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="p-4"
            >
              <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                Ask follow-up questions while maintaining context from the previous response. The AI will remember the conversation.
              </p>
              <form onSubmit={handleFollowUpSubmit} className="relative">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-cyan-500/20 rounded-lg opacity-0 group-focus-within:opacity-100 blur transition-opacity" />
                  <div className="relative flex items-end gap-2 bg-slate-950/80 border border-violet-500/30 rounded-lg overflow-hidden group-focus-within:border-violet-500/50 transition-colors">
                    <textarea
                      value={followUpText}
                      onChange={(e) => setFollowUpText(e.target.value)}
                      placeholder="Ask a follow-up question..."
                      disabled={isLoading}
                      rows={2}
                      className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-200 focus:outline-none placeholder:text-slate-600 font-mono resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleFollowUpSubmit(e);
                        }
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!followUpText.trim() || isLoading}
                      className="px-4 py-2 bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-mono text-xs uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed hover:from-violet-500 hover:to-cyan-500 transition-all flex items-center gap-2 m-1 rounded"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          THINKING
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          SEND
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-600 font-mono mt-2">
                  Press <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-400">Enter</kbd> to send, <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-400">Shift+Enter</kbd> for new line
                </p>
              </form>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Metadata Footer */}
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-600 uppercase tracking-wider px-2">
        <span>Generated: {new Date().toLocaleTimeString()}</span>
        <span>{result.essay ? 'Gemini 3.0 Pro' : 'Gemini 2.5 Flash'}</span>
      </div>
    </motion.div>
  );
};
