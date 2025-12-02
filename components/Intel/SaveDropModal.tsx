import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Lock, Globe, CheckCircle2 } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';

interface SaveDropModalProps {
  query: string;
  onClose: () => void;
}

export const SaveDropModal: React.FC<SaveDropModalProps> = ({ query, onClose }) => {
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { saveIntelDrop } = useOrbitStore();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveIntelDrop(query, isPrivate);
      setSaved(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Failed to save intel drop:', error);
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-900/60 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-100 tracking-wider">SAVE INTEL DROP</h3>
            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">Horde Feed Integration</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-500 hover:text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {saved ? (
          <div className="px-6 py-12 flex flex-col items-center justify-center gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.5 }}
            >
              <CheckCircle2 className="w-16 h-16 text-green-400" />
            </motion.div>
            <div className="text-center">
              <p className="text-slate-200 font-mono text-sm uppercase tracking-widest">Drop Saved</p>
              <p className="text-slate-500 text-xs mt-1">Broadcasting to Horde Feed...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Query Preview */}
            <div className="px-6 py-4 bg-slate-950/50">
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">Query</p>
              <p className="text-slate-300 text-sm font-mono leading-relaxed">{query}</p>
            </div>

            {/* Privacy Options */}
            <div className="px-6 py-4 space-y-3">
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3">Visibility</p>

              <button
                onClick={() => setIsPrivate(false)}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  !isPrivate
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    !isPrivate ? 'bg-cyan-500/20' : 'bg-slate-800'
                  }`}>
                    <Globe className={`w-5 h-5 ${!isPrivate ? 'text-cyan-400' : 'text-slate-600'}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`text-sm font-medium mb-1 ${!isPrivate ? 'text-cyan-400' : 'text-slate-400'}`}>
                      Public
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Visible to all operatives in the Horde Feed. Contribute to the collective intelligence network.
                    </p>
                  </div>
                  {!isPrivate && (
                    <div className="flex-shrink-0">
                      <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    </div>
                  )}
                </div>
              </button>

              <button
                onClick={() => setIsPrivate(true)}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  isPrivate
                    ? 'border-violet-500 bg-violet-500/10'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isPrivate ? 'bg-violet-500/20' : 'bg-slate-800'
                  }`}>
                    <Lock className={`w-5 h-5 ${isPrivate ? 'text-violet-400' : 'text-slate-600'}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`text-sm font-medium mb-1 ${isPrivate ? 'text-violet-400' : 'text-slate-400'}`}>
                      Private
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Only you can see this drop. Keep sensitive research classified.
                    </p>
                  </div>
                  {isPrivate && (
                    <div className="flex-shrink-0">
                      <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    </div>
                  )}
                </div>
              </button>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/40 flex gap-3">
              <button
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-mono uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white rounded-lg text-sm font-mono uppercase tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-violet-900/20"
              >
                {isSaving ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};
