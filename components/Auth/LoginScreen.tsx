
import React, { useState } from 'react';
import { useOrbitStore } from '../../store/useOrbitStore';
import { motion } from 'framer-motion';
import { Fingerprint, ArrowRight, Loader2, UserPlus, HardDrive, Mail, Lock } from 'lucide-react';
import { Nebula } from '../Trails/Nebula';
import clsx from 'clsx';

export const LoginScreen: React.FC = () => {
  const { login, register } = useOrbitStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); // Only for register

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (mode === 'register' && !username) return;

    setIsLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        const result = await login(email, password);
        if (!result.success) setError(result.error || "AUTH FAILED");
      } else {
        const result = await register(email, password, username);
        if (!result.success) setError(result.error || "REGISTRATION FAILED");
      }
    } catch (e) {
      setError("SYSTEM MALFUNCTION.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full h-screen flex items-center justify-center overflow-hidden bg-slate-950">
      <Nebula />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="z-10 w-full max-w-md p-8"
      >
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700 rounded-3xl p-8 shadow-2xl shadow-violet-900/20 relative overflow-hidden">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-violet-600/30 mb-4">
              <Fingerprint className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-widest">ORBIT OS</h1>
            <p className="text-xs text-slate-500 font-mono mt-2">CLOUD UPLINK SECURE</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">

            {/* Email */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 pl-10 text-slate-200 focus:outline-none focus:border-violet-500 transition-colors placeholder:text-slate-800 font-mono text-sm"
                  placeholder="operative@orbit.os"
                  required
                />
                <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-600" />
              </div>
            </div>

            {/* Username (Register Only) */}
            {mode === 'register' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="space-y-1"
              >
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Username</label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 pl-10 text-slate-200 focus:outline-none focus:border-violet-500 transition-colors placeholder:text-slate-800 font-mono text-sm"
                    placeholder="USERNAME"
                    required
                  />
                  <UserPlus className="absolute left-3 top-3.5 w-4 h-4 text-slate-600" />
                </div>
              </motion.div>
            )}

            {/* Password */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 pl-10 text-slate-200 focus:outline-none focus:border-violet-500 transition-colors placeholder:text-slate-800 font-mono text-sm"
                  placeholder="••••••••"
                  required
                />
                <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-600" />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-950/30 border border-red-900/50 rounded-lg p-3 text-center"
              >
                <p className="text-[10px] text-red-400 font-mono">{error}</p>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={clsx(
                "w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg mt-4",
                mode === 'login'
                  ? "bg-white text-slate-950 hover:bg-slate-200"
                  : "bg-violet-600 text-white hover:bg-violet-500"
              )}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'AUTHENTICATE' : 'INITIALIZE'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-8 text-center relative z-10">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
              }}
              className="text-xs text-slate-500 hover:text-white transition-colors underline decoration-slate-700 underline-offset-4"
            >
              {mode === 'login' ? "NO CREDENTIALS? REGISTER IDENTITY" : "HAVE CREDENTIALS? LOGIN"}
            </button>
          </div>
        </div>

        {/* Node Status Footer */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-slate-600 font-mono">
          <HardDrive className="w-3 h-3 text-violet-500" />
          <span>CONNECTED: SUPABASE INSTANCE</span>
          <span className="w-1 h-1 bg-violet-500 rounded-full animate-pulse" />
        </div>
      </motion.div>
    </div>
  );
};
