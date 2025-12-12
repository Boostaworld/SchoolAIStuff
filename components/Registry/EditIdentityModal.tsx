import React, { useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Upload, User, FileText, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';
import { supabase } from '../../lib/supabase';
import { ProfileModal } from '../Operative/ProfileModal';

interface EditIdentityModalProps {
  onClose: () => void;
}

export const EditIdentityModal: React.FC<EditIdentityModalProps> = ({ onClose }) => {
  const { currentUser, initialize } = useOrbitStore();
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [intelInstructions, setIntelInstructions] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load current profile data
  React.useEffect(() => {
    const loadProfile = async () => {
      if (!currentUser) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('username, bio, intel_instructions')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (data && !error) {
        setUsername(data.username || '');
        setBio(data.bio || '');
        setIntelInstructions(data.intel_instructions || '');
      }
    };

    loadProfile();
  }, [currentUser]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!currentUser) return;

    // Validate username
    if (!username || username.trim().length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      // Check if username is taken (only if it's different from current)
      if (username.trim().toLowerCase() !== currentUser.username.toLowerCase()) {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .ilike('username', username.trim())
          .single();

        if (existingUser && existingUser.id !== currentUser.id) {
          setError(`Username "${username}" is already taken. Please choose another.`);
          setIsSaving(false);
          return;
        }
      }

      let avatarUrl = currentUser.avatar;

      // Upload new avatar if selected
      if (avatarFile) {
        setIsUploading(true);
        const fileExt = avatarFile.name.split('.').pop();
        // Fix: Use folder structure to match RLS policy (auth.uid() = storage.foldername(name)[1])
        const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        avatarUrl = publicUrl;
        setIsUploading(false);
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: currentUser.id,
          username: username.trim(),
          avatar_url: avatarUrl,
          bio: bio,
          intel_instructions: intelInstructions
        }, { onConflict: 'id' });

      if (error) throw error;

      // Refresh store to show new data
      await initialize();
      onClose();
    } catch (error: any) {
      console.error('Failed to update profile:', error);

      // Handle specific error types
      let errorMessage = 'Failed to save changes. Please try again.';

      if (error.message?.includes('duplicate key') || error.message?.includes('profiles_username_key')) {
        errorMessage = `Username "${username}" is already taken. Please choose another.`;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  const previewProfile = currentUser ? {
    id: currentUser.id,
    username: username || currentUser.username, // Show edited username in preview
    avatar_url: avatarPreview || currentUser.avatar || '',
    bio,
    tasks_completed: currentUser.stats?.tasksCompleted ?? 0,
    tasks_forfeited: currentUser.stats?.tasksForfeited ?? 0,
    status: 'Online',
    orbit_points: currentUser.orbit_points,
    is_admin: currentUser.isAdmin,
    can_customize_ai: currentUser.can_customize_ai
  } : null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-950/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-900/60 relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(124,58,237,0.05)_50%,transparent_100%)] animate-shimmer" />
            <div className="relative flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-100 tracking-wider">EDIT IDENTITY</h3>
                <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">
                  Operative Profile Configuration
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-500 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="px-6 pt-4">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Avatar Upload */}
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-3">
                Avatar
              </label>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-slate-800 bg-slate-950">
                  <img
                    src={avatarPreview || currentUser?.avatar}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                  {isUploading && (
                    <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-mono uppercase tracking-wider transition-colors disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    Upload New
                  </button>
                  <p className="text-xs text-slate-600 mt-2">JPG, PNG, or GIF. Max 2MB.</p>
                </div>
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-3">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5" />
                  Username
                </div>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="YourUsername"
                maxLength={30}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors placeholder:text-slate-600 font-mono"
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-slate-600">Alphanumeric and underscores only</p>
                <span className="text-xs text-slate-600 font-mono">{username.length}/30</span>
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-3">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5" />
                  Bio
                </div>
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell other operatives about yourself..."
                maxLength={200}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors placeholder:text-slate-600 font-mono resize-none"
                rows={3}
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-slate-600">Public profile description</p>
                <span className="text-xs text-slate-600 font-mono">{bio.length}/200</span>
              </div>
            </div>

            {/* Intel AI Instructions */}
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Custom Intel AI Instructions
                </div>
              </label>
              <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3 mb-3">
                <p className="text-xs text-cyan-400/80 leading-relaxed">
                  These instructions customize how the Intel AI researches queries for you. Example: "Focus on academic sources" or "Prioritize recent news articles from 2024-2025"
                </p>
              </div>
              <textarea
                value={intelInstructions}
                onChange={(e) => setIntelInstructions(e.target.value)}
                placeholder="Provide comprehensive, factual research with credible sources."
                maxLength={500}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-slate-600 font-mono resize-none"
                rows={4}
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-slate-600">Customize AI research behavior</p>
                <span className="text-xs text-slate-600 font-mono">{intelInstructions.length}/500</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/40 flex gap-3 items-center">
            <button
              onClick={() => setShowPreview(true)}
              disabled={!previewProfile}
              className="px-4 py-2 bg-slate-800/70 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-mono uppercase tracking-wider transition-colors disabled:opacity-50"
              type="button"
            >
              Preview Profile
            </button>
            <div className="flex-1 flex gap-3">
              <button
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-mono uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || isUploading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white rounded-lg text-sm font-mono uppercase tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-violet-900/20"
              >
                {isSaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showPreview && previewProfile && (
          <ProfileModal
            profile={previewProfile}
            onClose={() => setShowPreview(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};
