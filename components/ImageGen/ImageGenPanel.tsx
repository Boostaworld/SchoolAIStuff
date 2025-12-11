import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Wand2, Download, X, Maximize2, Zap, Cpu, Grid3x3, Palette, ImagePlus, Trash2, Eye, EyeOff, Search, Brain, ChevronDown, ChevronUp, Lightbulb, Folder, FolderPlus, FolderInput, Star, Heart, Filter, Tag, Move, Share2, Send, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrbitStore } from '../../store/useOrbitStore';
import { runIntelQuery } from '../../lib/ai/intel';
import { improvePrompt } from '../../lib/ai/promptImprover';
import { toast } from '@/lib/toast';
import clsx from 'clsx';
import { ConfirmModal } from '../Shared/ConfirmModal';
import { DynamicTextarea } from '../Shared/DynamicTextarea';
import { SplitEditor } from './SplitEditor';
import {
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  getImages,
  saveImage,
  deleteImage as dbDeleteImage,
  moveImageToFolder,
  toggleFavorite,
  incrementDownloadCount,
  type ImageFolder,
  type GeneratedImage as DBGeneratedImage
} from '../../lib/imageStorage';

// Types
interface GeneratedImage extends DBGeneratedImage {
  // UI-specific extensions if needed
}

// Constants
const ASPECT_RATIOS = [
  { id: '1:1', label: 'Square', icon: '⬜', width: 1024, height: 1024 },
  { id: '2:3', label: 'Photo', icon: '▯', width: 1365, height: 2048 },
  { id: '3:2', label: 'Wide', icon: '▭', width: 2048, height: 1365 },
  { id: '3:4', label: 'Portrait', icon: '▮', width: 1536, height: 2048 },
  { id: '4:3', label: 'Classic', icon: '▬', width: 2048, height: 1536 },
  { id: '4:5', label: 'Social', icon: '▯', width: 1638, height: 2048 },
  { id: '5:4', label: 'Monitor', icon: '▬', width: 2048, height: 1638 },
  { id: '9:16', label: 'Vertical', icon: '▯', width: 1080, height: 1920 },
  { id: '16:9', label: 'Cinema', icon: '▭', width: 1920, height: 1080 },
  { id: '21:9', label: 'Ultra', icon: '▬', width: 2560, height: 1080 }
];

const STYLES = [
  { id: 'none', label: 'Natural', gradient: 'from-slate-700 to-slate-800', description: 'No style modification' },
  { id: 'photorealistic', label: 'Photo', gradient: 'from-blue-600 to-cyan-500', description: 'Hyper-realistic photography' },
  { id: 'anime', label: 'Anime', gradient: 'from-pink-500 to-rose-600', description: 'Japanese animation style' },
  { id: 'digital-art', label: 'Digital', gradient: 'from-purple-600 to-indigo-500', description: 'Modern digital artwork' },
  { id: 'oil-painting', label: 'Oil Paint', gradient: 'from-amber-600 to-orange-700', description: 'Classical oil painting' },
  { id: 'cyberpunk', label: 'Cyber', gradient: 'from-fuchsia-600 to-violet-600', description: 'Neon-soaked futurism' },
  { id: 'studio-photo', label: 'Studio', gradient: 'from-emerald-600 to-teal-500', description: 'Professional studio lighting' }
];

const RESOLUTION_OPTIONS = [
  { id: '1K', label: '1K', description: 'Fast', particles: 3 },
  { id: '2K', label: '2K', description: 'Balanced', particles: 5 },
  { id: '3K', label: '3K', description: 'High', particles: 7 },
  { id: '4K', label: '4K', description: 'Ultra', particles: 10 }
];

const MODELS = [
  {
    id: 'gemini-3-image',
    name: 'Gemini 3 Pro Image',
    description: 'Advanced • Web Search • Thinking',
    icon: Brain,
    gradient: 'from-violet-600 to-fuchsia-600',
    features: ['Web Search', 'Thinking Process', 'Highest Quality']
  },
  {
    id: 'gemini-2.5-flash-image',
    name: 'Gemini 2.5 Flash',
    description: 'Fast • Efficient • Simple',
    icon: Zap,
    gradient: 'from-cyan-600 to-blue-600',
    features: ['Fast Generation', 'Lower Cost', 'Good Quality']
  }
];

export const ImageGenPanel: React.FC = () => {
  const { currentUser, dmChannels, createOrGetChannel, sendMessage } = useOrbitStore();

  // Access Control Check
  const hasImageGenAccess = currentUser?.unlocked_models?.includes('image-gen');

  if (!hasImageGenAccess) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8 max-w-md"
        >
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 border-2 border-red-500/30 flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-red-400" />
          </div>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400 mb-3"
            style={{ fontFamily: 'Orbitron, monospace' }}>
            ACCESS RESTRICTED
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            Image Generation requires special access permission.
          </p>
          <div className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-xs text-slate-500 font-mono">
            Contact an admin to unlock <code className="text-cyan-400">image-gen</code>
          </div>
        </motion.div>
      </div>
    );
  }

  // Core State
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [style, setStyle] = useState('none');
  const [resolution, setResolution] = useState('4K');
  const [model, setModel] = useState<'gemini-3-image' | 'gemini-2.5-flash-image'>('gemini-3-image');
  const [webSearch, setWebSearch] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showThinkingPanel, setShowThinkingPanel] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isImproving, setIsImproving] = useState(false);

  // Folder State
  const [folders, setFolders] = useState<ImageFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderIcon, setNewFolderIcon] = useState('📁');
  const [showFolderSidebar, setShowFolderSidebar] = useState(true);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [imageToMove, setImageToMove] = useState<string | null>(null);
  const [editingFolder, setEditingFolder] = useState<ImageFolder | null>(null);

  // Share State
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [imageToShare, setImageToShare] = useState<GeneratedImage | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [sharePrompt, setSharePrompt] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; type: 'folder' | 'image'; id: string | null; name?: string }>({ isOpen: false, type: 'image', id: null });

  // Image Editor State
  const [splitEditorImage, setSplitEditorImage] = useState<string | null>(null);

  // Load folders and images on mount
  useEffect(() => {
    loadFolders();
    loadImages();
  }, []);

  // Reload images when folder selection changes
  useEffect(() => {
    loadImages();
  }, [selectedFolderId]);

  const loadFolders = async () => {
    try {
      const data = await getFolders();
      setFolders(data);
    } catch (error: any) {
      console.error('Failed to load folders:', error);
      // Silently fail if tables don't exist yet
    }
  };

  const loadImages = async () => {
    setIsLoading(true);
    try {
      const data = await getImages(selectedFolderId || undefined);
      setGeneratedImages(data);
    } catch (error: any) {
      console.error('Failed to load images:', error);
      // Silently fail if tables don't exist yet
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      if (editingFolder) {
        // Editing existing folder
        await updateFolder(editingFolder.id, {
          name: newFolderName.trim(),
          icon: newFolderIcon
        });
        toast.success('Folder updated!');
      } else {
        // Creating new folder
        await createFolder({
          name: newFolderName.trim(),
          icon: newFolderIcon
        });
        toast.success('Folder created!');
      }

      setNewFolderName('');
      setNewFolderIcon('📁');
      setShowNewFolderDialog(false);
      setEditingFolder(null);
      await loadFolders();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${editingFolder ? 'update' : 'create'} folder`);
    }
  };

  const openEditFolder = (folder: ImageFolder) => {
    setEditingFolder(folder);
    setNewFolderName(folder.name);
    setNewFolderIcon(folder.icon);
    setShowNewFolderDialog(true);
  };

  const handleDeleteFolder = async (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    setDeleteConfirm({ isOpen: true, type: 'folder', id: folderId, name: folder?.name });
  };

  const confirmDeleteFolder = async () => {
    if (!deleteConfirm.id || deleteConfirm.type !== 'folder') return;
    try {
      await deleteFolder(deleteConfirm.id);
      if (selectedFolderId === deleteConfirm.id) {
        setSelectedFolderId(null);
      }
      await loadFolders();
      await loadImages();
      toast.success('Folder deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete folder');
    }
    setDeleteConfirm({ isOpen: false, type: 'image', id: null });
  };

  const handleMoveImage = async (targetFolderId: string | null) => {
    if (!imageToMove) return;

    try {
      await moveImageToFolder(imageToMove, targetFolderId);
      await Promise.all([
        loadImages(),
        loadFolders()
      ]);
      setShowMoveDialog(false);
      setImageToMove(null);
      toast.success('Image moved!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to move image');
    }
  };

  // Auto-progress simulation during generation
  useEffect(() => {
    if (isGenerating) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) return prev;
          return prev + Math.random() * 3;
        });
      }, 200);
      return () => clearInterval(interval);
    } else {
      setProgress(0);
    }
  }, [isGenerating]);

  // Prompt Improver Handler
  const handleImprovePrompt = async () => {
    if (!prompt.trim() || isImproving) return;

    setIsImproving(true);
    try {
      const result = await improvePrompt(prompt, 'image', model);
      setPrompt(result.improvedPrompt);
      if (result.changes.length > 0) {
        toast.success(`✨ ${result.changes.join(', ')}`);
      }
    } catch (error) {
      console.error('Prompt improvement failed:', error);
      toast.error('Failed to improve prompt');
    } finally {
      setIsImproving(false);
    }
  };

  // Handlers
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setProgress(0);

    try {
      // Build enhanced prompt with style
      const enhancedPrompt = style && style !== 'none'
        ? `${prompt.trim()}, ${style} style`
        : prompt.trim();

      // Call actual Gemini API
      const result = await runIntelQuery({
        prompt: enhancedPrompt,
        instructions: negativePrompt ? `Avoid: ${negativePrompt} ` : 'Generate a high-quality image',
        model: model,
        mode: 'generation',
        imageResolution: resolution,
        aspectRatio: aspectRatio as any,
        webSearch: webSearch && model === 'gemini-3-image',
        includeThinking: showThinking && model === 'gemini-3-image'
      });

      setProgress(100);

      // Extract image from result
      let imageUrl: string | null = null;

      // Check for image in various possible locations
      if (result.generatedImage) {
        imageUrl = result.generatedImage;
      } else if (result.essay?.includes('data:image')) {
        // Extract base64 from markdown image
        const match = result.essay.match(/!\[.*?\]\((data:image[^)]+)\)/);
        if (match) imageUrl = match[1];
      }

      if (imageUrl) {
        // Save to database
        const savedImage = await saveImage({
          image_url: imageUrl,
          prompt: prompt.trim(),
          negative_prompt: negativePrompt || undefined,
          model,
          aspect_ratio: aspectRatio,
          style,
          resolution,
          web_search_used: webSearch && model === 'gemini-3-image',
          thinking_enabled: showThinking && model === 'gemini-3-image',
          thinking_process: result.thinkingProcess,
          thought_images: result.thoughtImages,
          folder_id: selectedFolderId || undefined
        });

        // Reload images to show the new one
        await loadImages();

        // Show thinking panel if we have thinking data
        if (result.thinkingProcess || (result.thoughtImages && result.thoughtImages.length > 0)) {
          setShowThinkingPanel(true);
        }

        toast.success('✨ Image synthesized and saved!');
        setPrompt(''); // Clear prompt after success
      } else {
        throw new Error('No image data received from API');
      }

    } catch (error: any) {
      console.error('Image generation failed:', error);
      toast.error(error.message || 'Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const downloadImage = async (img: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = img.image_url;
    link.download = `orbit - gen - ${img.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Increment download count
    try {
      await incrementDownloadCount(img.id);
    } catch (error) {
      console.error('Failed to increment download count:', error);
    }

    toast.success('Image downloaded!');
  };

  const deleteImage = async (id: string) => {
    setDeleteConfirm({ isOpen: true, type: 'image', id });
  };

  const confirmDeleteImage = async () => {
    if (!deleteConfirm.id || deleteConfirm.type !== 'image') return;
    try {
      await dbDeleteImage(deleteConfirm.id);
      if (selectedImage?.id === deleteConfirm.id) setSelectedImage(null);
      await loadImages();
      toast.info('Image deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete image');
    }
    setDeleteConfirm({ isOpen: false, type: 'image', id: null });
  };

  const handleToggleFavorite = async (img: GeneratedImage) => {
    try {
      await toggleFavorite(img.id, !img.is_favorite);
      await loadImages();
      toast.success(img.is_favorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update favorite');
    }
  };

  const handleShareImage = async (recipientUserId: string) => {
    if (!imageToShare || !currentUser) return;

    setIsSharing(true);
    try {
      // Convert base64 image to Blob
      const base64Data = imageToShare.image_url.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });

      // Create File object
      const file = new File([blob], `${imageToShare.prompt.substring(0, 30)}.png`, { type: 'image/png' });

      // Create or get channel
      const channelId = await createOrGetChannel(recipientUserId);

      // Send message with image attachment
      const messageText = sharePrompt
        ? `🎨 Shared an AI - generated image: "${imageToShare.prompt}"`
        : `🎨 Shared an AI - generated image 🔒`;

      await sendMessage(channelId, messageText, file);

      toast.success('Image shared successfully!');
      setShowShareDialog(false);
      setImageToShare(null);
    } catch (error: any) {
      console.error('Failed to share image:', error);
      toast.error(error.message || 'Failed to share image');
    } finally {
      setIsSharing(false);
    }
  };

  const selectedStyle = STYLES.find(s => s.id === style);
  const selectedRatio = ASPECT_RATIOS.find(r => r.id === aspectRatio);
  const selectedModel = MODELS.find(m => m.id === model);
  const isAdvancedModel = model === 'gemini-3-image';

  // Get the latest image with thinking data
  const latestThinkingImage = generatedImages.find(img => img.thinking_process || img.thought_images);

  const selectedFolder = folders.find(f => f.id === selectedFolderId);

  return (
    <div className="h-full flex bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950 relative overflow-hidden">
      {/* Animated Background Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/30 rounded-full"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
              scale: Math.random()
            }}
            animate={{
              y: [null, Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080)],
              opacity: [0.3, 0.6, 0.3],
              scale: [Math.random(), Math.random() * 1.5]
            }}
            transition={{
              duration: 8 + Math.random() * 4,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}
      </div>

      {/* Folder Sidebar */}
      <AnimatePresence>
        {showFolderSidebar && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="w-64 flex-shrink-0 border-r border-cyan-500/20 bg-slate-900/40 backdrop-blur-md overflow-y-auto custom-scrollbar z-20"
          >
            <div className="p-4 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-cyan-400 font-mono uppercase tracking-wider flex items-center gap-2">
                  <Folder className="w-4 h-4" />
                  Collections
                </h3>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowNewFolderDialog(true)}
                  className="p-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
                >
                  <FolderPlus className="w-4 h-4" />
                </motion.button>
              </div>

              {/* All Images */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedFolderId(null)}
                className={clsx(
                  "w-full p-3 rounded-lg text-left transition-all",
                  selectedFolderId === null
                    ? "bg-cyan-500/20 border-2 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                    : "bg-slate-800/40 border-2 border-slate-700 hover:border-slate-600"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">🖼️</span>
                  <div className="flex-1">
                    <div className={clsx(
                      "text-sm font-mono font-bold",
                      selectedFolderId === null ? "text-cyan-200" : "text-slate-300"
                    )}>
                      All Images
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {isLoading && selectedFolderId === null ? 'Loading...' : `${generatedImages.length} total`}
                    </div>
                  </div>
                </div>
              </motion.button>

              {/* Uncategorized */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedFolderId('uncategorized')}
                className={clsx(
                  "w-full p-3 rounded-lg text-left transition-all",
                  selectedFolderId === 'uncategorized'
                    ? "bg-slate-500/20 border-2 border-slate-400 shadow-[0_0_15px_rgba(148,163,184,0.3)]"
                    : "bg-slate-800/40 border-2 border-slate-700 hover:border-slate-600"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">📦</span>
                  <div className="flex-1">
                    <div className={clsx(
                      "text-sm font-mono font-bold",
                      selectedFolderId === 'uncategorized' ? "text-slate-200" : "text-slate-300"
                    )}>
                      Uncategorized
                    </div>
                    <div className="text-[10px] text-slate-500">
                      No folder
                    </div>
                  </div>
                </div>
              </motion.button>

              {/* Folders */}
              <div className="space-y-2">
                {folders.map((folder) => (
                  <motion.div
                    key={folder.id}
                    whileHover={{ scale: 1.02 }}
                    className={clsx(
                      "p-3 rounded-lg transition-all group relative",
                      selectedFolderId === folder.id
                        ? "bg-opacity-20 border-2 shadow-[0_0_15px_rgba(148,163,184,0.3)]"
                        : "bg-slate-800/40 border-2 border-slate-700 hover:border-slate-600"
                    )}
                    style={{
                      backgroundColor: selectedFolderId === folder.id ? `${folder.color} 20` : undefined,
                      borderColor: selectedFolderId === folder.id ? folder.color : undefined
                    }}
                  >
                    <button
                      onClick={() => setSelectedFolderId(folder.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{folder.icon}</span>
                        <div className="flex-1">
                          <div className="text-sm font-mono font-bold text-slate-200">
                            {folder.name}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {folder.image_count} images
                          </div>
                        </div>
                      </div>
                    </button>
                    {/* Edit Button */}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => openEditFolder(folder)}
                      className="absolute top-2 right-8 p-1 rounded bg-blue-600/80 hover:bg-blue-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Pencil className="w-3 h-3" />
                    </motion.button>
                    {/* Delete Button */}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDeleteFolder(folder.id)}
                      className="absolute top-2 right-2 p-1 rounded bg-red-600/80 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex-shrink-0 px-6 py-4 border-b border-cyan-500/20 bg-slate-900/40 backdrop-blur-xl z-10 relative"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowFolderSidebar(!showFolderSidebar)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors"
              >
                <Folder className="w-5 h-5" />
              </motion.button>
              <motion.div
                className="relative p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600"
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(6,182,212,0.3)',
                    '0 0 40px rgba(6,182,212,0.6)',
                    '0 0 20px rgba(6,182,212,0.3)'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 tracking-tight"
                  style={{ fontFamily: 'Orbitron, monospace' }}>
                  SYNTHESIS LAB
                </h1>
                <p className="text-[10px] font-mono text-cyan-400/60 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Cpu className="w-3 h-3" />
                  {selectedFolder ? `${selectedFolder.icon} ${selectedFolder.name} ` : 'Neural Image Renderer'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-sm font-mono flex items-center gap-2">
                <Zap className="w-4 h-4" />
                {currentUser?.orbit_points || 0} OP
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <AnimatePresence>
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                    Synthesizing Image
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400">
                    {Math.round(progress)}%
                  </span>
                </div>
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}% ` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Content: Controls + Gallery */}
        <div className="flex-1 flex overflow-hidden relative z-0">
          {/* Left Panel - Controls */}
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-96 flex-shrink-0 border-r border-cyan-500/20 bg-slate-900/20 backdrop-blur-md overflow-y-auto custom-scrollbar"
          >
            <form onSubmit={handleGenerate} className="p-6 space-y-6">
              {/* Model Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-violet-400 font-mono uppercase tracking-wider flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Neural Core
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {MODELS.map((modelOption) => {
                    const ModelIcon = modelOption.icon;
                    return (
                      <motion.button
                        key={modelOption.id}
                        type="button"
                        onClick={() => setModel(modelOption.id as any)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={clsx(
                          "relative p-4 rounded-lg border-2 transition-all overflow-hidden group text-left",
                          model === modelOption.id
                            ? "border-violet-400 shadow-[0_0_25px_rgba(167,139,250,0.5)]"
                            : "border-slate-700 hover:border-slate-600"
                        )}
                      >
                        <div className={clsx(
                          "absolute inset-0 bg-gradient-to-br opacity-10 group-hover:opacity-20 transition-opacity",
                          modelOption.gradient
                        )} />
                        <div className="relative flex items-start gap-3">
                          <div className={clsx(
                            "p-2 rounded-lg",
                            model === modelOption.id ? "bg-violet-500/20" : "bg-slate-800"
                          )}>
                            <ModelIcon className={clsx(
                              "w-5 h-5",
                              model === modelOption.id ? "text-violet-300" : "text-slate-400"
                            )} />
                          </div>
                          <div className="flex-1">
                            <div className={clsx(
                              "text-sm font-bold font-mono mb-1",
                              model === modelOption.id ? "text-violet-200" : "text-slate-300"
                            )}>
                              {modelOption.name}
                            </div>
                            <div className="text-[10px] text-slate-500 mb-2">
                              {modelOption.description}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {modelOption.features.map((feature, idx) => (
                                <span key={idx} className={clsx(
                                  "px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider",
                                  model === modelOption.id
                                    ? "bg-violet-500/20 text-violet-300"
                                    : "bg-slate-800 text-slate-500"
                                )}>
                                  {feature}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Advanced Model Features (Gemini 3 Pro Image only) */}
              <AnimatePresence>
                {isAdvancedModel && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <label className="text-xs font-bold text-fuchsia-400 font-mono uppercase tracking-wider flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      Advanced Features
                    </label>
                    <div className="space-y-2">
                      {/* Web Search Toggle */}
                      <motion.button
                        type="button"
                        onClick={() => setWebSearch(!webSearch)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={clsx(
                          "w-full p-3 rounded-lg border-2 transition-all flex items-center gap-3",
                          webSearch
                            ? "bg-emerald-500/10 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]"
                            : "bg-slate-900/40 border-slate-700 hover:border-slate-600"
                        )}
                      >
                        <div className={clsx(
                          "w-10 h-6 rounded-full relative transition-all",
                          webSearch ? "bg-emerald-500" : "bg-slate-700"
                        )}>
                          <motion.div
                            className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow"
                            animate={{ x: webSearch ? 16 : 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          />
                        </div>
                        <div className="flex-1 text-left">
                          <div className={clsx(
                            "text-xs font-bold font-mono",
                            webSearch ? "text-emerald-200" : "text-slate-400"
                          )}>
                            <Search className="w-3 h-3 inline mr-1" />
                            Web Search Grounding
                          </div>
                          <div className="text-[9px] text-slate-500 mt-0.5">
                            {webSearch ? 'Real-time data enabled' : 'Use live web data'}
                          </div>
                        </div>
                      </motion.button>

                      {/* Thinking Toggle */}
                      <motion.button
                        type="button"
                        onClick={() => setShowThinking(!showThinking)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={clsx(
                          "w-full p-3 rounded-lg border-2 transition-all flex items-center gap-3",
                          showThinking
                            ? "bg-violet-500/10 border-violet-400 shadow-[0_0_15px_rgba(167,139,250,0.3)]"
                            : "bg-slate-900/40 border-slate-700 hover:border-slate-600"
                        )}
                      >
                        <div className={clsx(
                          "w-10 h-6 rounded-full relative transition-all",
                          showThinking ? "bg-violet-500" : "bg-slate-700"
                        )}>
                          <motion.div
                            className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow"
                            animate={{ x: showThinking ? 16 : 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          />
                        </div>
                        <div className="flex-1 text-left">
                          <div className={clsx(
                            "text-xs font-bold font-mono",
                            showThinking ? "text-violet-200" : "text-slate-400"
                          )}>
                            <Brain className="w-3 h-3 inline mr-1" />
                            Show Thinking Process
                          </div>
                          <div className="text-[9px] text-slate-500 mt-0.5">
                            {showThinking ? 'View reasoning steps' : 'See how AI thinks'}
                          </div>
                        </div>
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main Prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-cyan-400 font-mono uppercase tracking-wider flex items-center gap-2">
                    <Wand2 className="w-4 h-4" />
                    Imagination Prompt
                  </label>
                  <motion.button
                    type="button"
                    onClick={handleImprovePrompt}
                    disabled={!prompt.trim() || isImproving || isGenerating}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={clsx(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all",
                      prompt.trim() && !isImproving
                        ? "bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white shadow-[0_0_15px_rgba(192,132,252,0.4)] hover:shadow-[0_0_25px_rgba(192,132,252,0.6)]"
                        : "bg-slate-800 text-slate-500 cursor-not-allowed"
                    )}
                  >
                    {isImproving ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Sparkles className="w-3 h-3" />
                        </motion.div>
                        Enhancing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        Improve
                      </>
                    )}
                  </motion.button>
                </div>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                  <DynamicTextarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="A crystalline forest bathed in bioluminescent light, ethereal atmosphere..."
                    className="relative w-full min-h-[160px] bg-slate-950/80 border-2 border-slate-700 focus:border-cyan-500/50 rounded-xl p-4 text-sm text-slate-100 placeholder:text-slate-600 font-mono resize-none transition-all outline-none"
                    disabled={isGenerating}
                    style={{ lineHeight: '1.6' }}
                    maxHeight={400}
                  />
                </div>
                <p className="text-[10px] text-slate-500 font-mono">
                  {prompt.length}/500 characters • Be specific and descriptive
                </p>
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-blue-400 font-mono uppercase tracking-wider flex items-center gap-2">
                  <Grid3x3 className="w-4 h-4" />
                  Canvas Dimensions
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {ASPECT_RATIOS.map((ratio) => (
                    <motion.button
                      key={ratio.id}
                      type="button"
                      onClick={() => setAspectRatio(ratio.id)}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className={clsx(
                        "relative p-3 rounded-lg border-2 transition-all text-center",
                        aspectRatio === ratio.id
                          ? "bg-gradient-to-br from-blue-500/30 to-indigo-500/30 border-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.3)]"
                          : "bg-slate-800/40 border-slate-700 hover:border-slate-600"
                      )}
                    >
                      <div className="text-2xl mb-1">{ratio.icon}</div>
                      <div className={clsx(
                        "text-[9px] font-mono uppercase tracking-wider",
                        aspectRatio === ratio.id ? "text-blue-200" : "text-slate-500"
                      )}>
                        {ratio.id}
                      </div>
                    </motion.button>
                  ))}
                </div>
                {selectedRatio && (
                  <p className="text-[10px] text-slate-500 font-mono text-center">
                    {selectedRatio.label} • {selectedRatio.width} × {selectedRatio.height}px
                  </p>
                )}
              </div>

              {/* Style Presets */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-purple-400 font-mono uppercase tracking-wider flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Artistic Style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {STYLES.map((styleOption) => (
                    <motion.button
                      key={styleOption.id}
                      type="button"
                      onClick={() => setStyle(styleOption.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={clsx(
                        "relative p-3 rounded-lg border-2 transition-all overflow-hidden group",
                        style === styleOption.id
                          ? "border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                          : "border-slate-700 hover:border-slate-600"
                      )}
                    >
                      <div className={clsx(
                        "absolute inset-0 bg-gradient-to-br opacity-20 group-hover:opacity-30 transition-opacity",
                        styleOption.gradient
                      )} />
                      <div className="relative">
                        <div className={clsx(
                          "text-xs font-bold font-mono",
                          style === styleOption.id ? "text-purple-200" : "text-slate-300"
                        )}>
                          {styleOption.label}
                        </div>
                        <div className="text-[9px] text-slate-500 mt-0.5">
                          {styleOption.description}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Resolution */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-emerald-400 font-mono uppercase tracking-wider flex items-center gap-2">
                  <ImagePlus className="w-4 h-4" />
                  Render Quality
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {RESOLUTION_OPTIONS.map((res) => (
                    <motion.button
                      key={res.id}
                      type="button"
                      onClick={() => setResolution(res.id)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={clsx(
                        "relative p-2 rounded-lg border-2 transition-all",
                        resolution === res.id
                          ? "bg-emerald-500/20 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]"
                          : "bg-slate-800/40 border-slate-700"
                      )}
                    >
                      <div className={clsx(
                        "text-sm font-bold font-mono mb-0.5",
                        resolution === res.id ? "text-emerald-200" : "text-slate-400"
                      )}>
                        {res.label}
                      </div>
                      <div className="flex justify-center gap-0.5 mb-1">
                        {[...Array(res.particles)].map((_, i) => (
                          <div key={i} className={clsx(
                            "w-0.5 h-0.5 rounded-full",
                            resolution === res.id ? "bg-emerald-400" : "bg-slate-600"
                          )} />
                        ))}
                      </div>
                      <div className="text-[8px] text-slate-500 uppercase">
                        {res.description}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/30 border border-slate-700 rounded-lg hover:border-slate-600 transition-colors"
                >
                  <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">
                    Advanced Options
                  </span>
                  <motion.div
                    animate={{ rotate: showAdvanced ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </motion.div>
                </button>

                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2 space-y-2">
                        <label className="text-[10px] text-slate-500 font-mono uppercase">
                          Negative Prompt (Avoid)
                        </label>
                        <textarea
                          value={negativePrompt}
                          onChange={(e) => setNegativePrompt(e.target.value)}
                          placeholder="blurry, distorted, low quality, watermark..."
                          className="w-full h-20 bg-slate-950/60 border border-slate-700 focus:border-red-500/50 rounded-lg p-3 text-xs text-slate-300 placeholder:text-slate-700 font-mono resize-none outline-none transition-colors"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Generate Button */}
              <motion.button
                type="submit"
                disabled={isGenerating || !prompt.trim()}
                whileHover={!isGenerating && prompt.trim() ? { scale: 1.02, y: -2 } : {}}
                whileTap={!isGenerating && prompt.trim() ? { scale: 0.98 } : {}}
                className={clsx(
                  "relative w-full py-5 rounded-xl font-bold text-base uppercase tracking-widest overflow-hidden transition-all",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  isGenerating || !prompt.trim()
                    ? "bg-slate-800 text-slate-600"
                    : "bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white shadow-[0_0_40px_rgba(6,182,212,0.4)]"
                )}
                style={{ fontFamily: 'Orbitron, monospace' }}
              >
                {!isGenerating && prompt.trim() && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  />
                )}
                <span className="relative flex items-center justify-center gap-3">
                  {isGenerating ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Cpu className="w-5 h-5" />
                      </motion.div>
                      Synthesizing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate Image
                    </>
                  )}
                </span>
              </motion.button>
            </form>
          </motion.div>

          {/* Right Panel - Gallery & Thinking */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Thinking Panel */}
            <AnimatePresence>
              {showThinkingPanel && latestThinkingImage && (latestThinkingImage.thinking_process || latestThinkingImage.thought_images) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-b border-violet-500/20 bg-slate-900/40 backdrop-blur-md overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4 text-violet-400" />
                        <h3 className="text-sm font-bold text-violet-300 font-mono uppercase tracking-wider">
                          AI Thinking Process
                        </h3>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowThinkingPanel(false)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-300 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </motion.button>
                    </div>

                    {/* Thought Images */}
                    {latestThinkingImage.thought_images && latestThinkingImage.thought_images.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] text-slate-500 font-mono uppercase mb-2">
                          Thought Images ({latestThinkingImage.thought_images.length})
                        </p>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {latestThinkingImage.thought_images.map((thoughtImg, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: idx * 0.1 }}
                              className="flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden border-2 border-violet-500/30 bg-slate-900"
                            >
                              <img
                                src={thoughtImg}
                                alt={`Thought ${idx + 1} `}
                                className="w-full h-full object-cover"
                              />
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Thinking Text */}
                    {latestThinkingImage.thinking_process && (
                      <div className="bg-slate-950/60 border border-violet-500/20 rounded-lg p-3 max-h-[50vh] overflow-y-auto custom-scrollbar">
                        <p className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                          {latestThinkingImage.thinking_process}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Gallery */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              {generatedImages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="h-full flex flex-col items-center justify-center"
                >
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="w-32 h-32 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-indigo-500/10 border-2 border-dashed border-cyan-500/30 flex items-center justify-center mb-6"
                  >
                    <ImagePlus className="w-16 h-16 text-cyan-500/50" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-slate-400 mb-2" style={{ fontFamily: 'Orbitron, monospace' }}>
                    No Images Yet
                  </h3>
                  <p className="text-sm text-slate-600 font-mono text-center max-w-md">
                    {selectedFolder
                      ? `No images in "${selectedFolder.name}" folder`
                      : 'Enter a creative prompt and click Generate to begin'}
                  </p>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {generatedImages.map((img, idx) => (
                    <motion.div
                      key={img.id}
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group relative aspect-square rounded-xl overflow-hidden bg-slate-900 border-2 border-slate-800 hover:border-cyan-500/50 transition-all"
                    >
                      <img
                        src={img.image_url}
                        alt={img.prompt}
                        className="w-full h-full object-cover"
                      />

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <p className="text-xs text-slate-300 font-mono mb-2 line-clamp-2">
                            {img.prompt}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mb-3">
                            <span>{img.aspect_ratio}</span>
                            <span>•</span>
                            <span>{img.style}</span>
                            <span>•</span>
                            <span className="capitalize">{img.model === 'gemini-3-image' ? 'G3 Pro' : 'G2.5 Flash'}</span>
                          </div>
                          <div className="flex gap-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setSelectedImage(img)}
                              className="flex-1 py-2 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-mono uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setImageToShare(img);
                                setShowShareDialog(true);
                              }}
                              className="py-2 px-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors"
                              title="Share to friend"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </motion.button>
                            {/* EDIT BUTTON */}
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setSplitEditorImage(img.image_url)}
                              className="py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                              title="Edit Image"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setImageToMove(img.id);
                                setShowMoveDialog(true);
                              }}
                              className="py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                            >
                              <FolderInput className="w-3.5 h-3.5" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => downloadImage(img)}
                              className="py-2 px-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => deleteImage(img.id)}
                              className="py-2 px-3 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </motion.button>
                          </div>
                        </div>
                      </div>

                      {/* Corner Badges */}
                      <div className="absolute top-2 right-2 flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleToggleFavorite(img)}
                          className={clsx(
                            "p-1.5 rounded backdrop-blur-sm border transition-colors",
                            img.is_favorite
                              ? "bg-rose-500/80 border-rose-400 text-white"
                              : "bg-slate-950/80 border-slate-700 text-slate-400 hover:text-rose-400"
                          )}
                        >
                          <Heart className={clsx("w-3 h-3", img.is_favorite && "fill-current")} />
                        </motion.button>
                      </div>

                      {/* Thinking Badge */}
                      {(img.thinking_process || img.thought_images) && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-violet-950/80 backdrop-blur-sm border border-violet-500/30 rounded-md">
                          <Brain className="w-3 h-3 text-violet-400" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New Folder Dialog */}
      <AnimatePresence>
        {showNewFolderDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowNewFolderDialog(false)}
            className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-8"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border-2 border-cyan-500/30 rounded-2xl p-6 w-full max-w-md"
            >
              <h3 className="text-lg font-bold text-cyan-400 font-mono mb-4">Create New Folder</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 font-mono uppercase mb-2 block">Icon</label>
                  <input
                    type="text"
                    value={newFolderIcon}
                    onChange={(e) => setNewFolderIcon(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-mono outline-none focus:border-cyan-500"
                    placeholder="📁"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-mono uppercase mb-2 block">Name</label>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-mono outline-none focus:border-cyan-500"
                    placeholder="My Collection"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowNewFolderDialog(false)}
                    className="flex-1 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono uppercase tracking-wider transition-colors"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCreateFolder}
                    disabled={!newFolderName.trim()}
                    className="flex-1 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Move Image Dialog */}
      <AnimatePresence>
        {showMoveDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMoveDialog(false)}
            className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-8"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border-2 border-cyan-500/30 rounded-2xl p-6 w-full max-w-md"
            >
              <h3 className="text-lg font-bold text-cyan-400 font-mono mb-4">Move to Folder</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleMoveImage(null)}
                  className="w-full p-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-left border-2 border-slate-700 hover:border-slate-600 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📦</span>
                    <span className="text-sm font-mono text-slate-300">Uncategorized</span>
                  </div>
                </motion.button>
                {folders.map((folder) => (
                  <motion.button
                    key={folder.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleMoveImage(folder.id)}
                    className="w-full p-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-left border-2 border-slate-700 hover:border-slate-600 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{folder.icon}</span>
                      <span className="text-sm font-mono text-slate-300">{folder.name}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-8"
          >
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.1, rotate: 90 }}
              className="absolute top-6 right-6 p-3 bg-slate-800/80 hover:bg-red-600 text-white rounded-full transition-colors z-10"
              onClick={() => setSelectedImage(null)}
            >
              <X className="w-6 h-6" />
            </motion.button>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-6xl max-h-[90vh] relative"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImage.image_url}
                alt={selectedImage.prompt}
                className="max-w-full max-h-[80vh] rounded-2xl shadow-[0_0_60px_rgba(6,182,212,0.3)] border-2 border-cyan-500/30"
              />

              <div className="mt-4 p-4 bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-xl">
                <p className="text-sm text-slate-300 font-mono mb-2">
                  "{selectedImage.prompt}"
                </p>
                <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                  <div className="flex items-center gap-4">
                    <span>{selectedImage.aspect_ratio}</span>
                    <span>•</span>
                    <span className="capitalize">{selectedImage.style} style</span>
                    <span>•</span>
                    <span>{selectedImage.model === 'gemini-3-image' ? 'Gemini 3 Pro Image' : 'Gemini 2.5 Flash'}</span>
                    <span>•</span>
                    <span>{new Date(selectedImage.created_at).toLocaleString()}</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => downloadImage(selectedImage)}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </motion.button>
                </div>

                {/* Show Thinking in Modal */}
                {(selectedImage.thinking_process || selectedImage.thought_images) && (
                  <div className="mt-3 pt-3 border-t border-slate-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-4 h-4 text-violet-400" />
                      <span className="text-xs font-bold text-violet-300 font-mono uppercase">
                        Thinking Process
                      </span>
                    </div>
                    {selectedImage.thought_images && selectedImage.thought_images.length > 0 && (
                      <div className="flex gap-2 mb-2 overflow-x-auto">
                        {selectedImage.thought_images.map((thoughtImg, idx) => (
                          <img
                            key={idx}
                            src={thoughtImg}
                            alt={`Thought ${idx + 1} `}
                            className="w-24 h-24 object-cover rounded border border-violet-500/30"
                          />
                        ))}
                      </div>
                    )}
                    {selectedImage.thinking_process && (
                      <p className="text-xs text-slate-400 font-mono leading-relaxed max-h-32 overflow-y-auto">
                        {selectedImage.thinking_process}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Dialog */}
      <AnimatePresence>
        {showShareDialog && imageToShare && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isSharing && setShowShareDialog(false)}
            className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-8"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border-2 border-violet-500/30 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Share2 className="w-5 h-5 text-violet-400" />
                  <h3 className="text-lg font-bold text-violet-400 font-mono">Share to Friend</h3>
                </div>
                {!isSharing && (
                  <button
                    onClick={() => setShowShareDialog(false)}
                    className="p-1 rounded hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                )}
              </div>

              {/* Image Preview */}
              <div className="mb-4 rounded-lg overflow-hidden border-2 border-slate-800">
                <img
                  src={imageToShare.image_url}
                  alt={imageToShare.prompt}
                  className="w-full h-48 object-cover"
                />
              </div>

              <p className="text-xs text-slate-400 font-mono mb-4 line-clamp-2">
                "{imageToShare.prompt}"
              </p>

              {/* Gatekeeping Toggle */}
              {/* Gatekeeping Toggle */}
              <div
                onClick={() => setSharePrompt(!sharePrompt)}
                className="flex items-center justify-between mb-4 p-3 rounded-lg bg-slate-950/50 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "p-2 rounded-lg transition-colors",
                    sharePrompt ? "bg-violet-500/20 text-violet-300" : "bg-slate-800 text-slate-400"
                  )}>
                    {sharePrompt ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className={clsx(
                      "text-sm font-bold font-mono transition-colors",
                      sharePrompt ? "text-slate-200" : "text-slate-400"
                    )}>
                      Share Prompt
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {sharePrompt ? 'Recipient sees the prompt' : 'Prompt is hidden 🔒'}
                    </p>
                  </div>
                </div>

                {/* Animated Toggle */}
                <div className={clsx(
                  "w-12 h-6 rounded-full p-1 relative transition-colors duration-300 ease-in-out",
                  sharePrompt ? "bg-violet-600" : "bg-slate-700"
                )}>
                  <motion.div
                    layout
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="w-4 h-4 bg-white rounded-full shadow-md"
                    animate={{ x: sharePrompt ? 24 : 0 }}
                  />
                </div>
              </div>

              {/* Friend List */}
              <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                {dmChannels.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-500 text-sm font-mono">No friends to share with</p>
                    <p className="text-slate-600 text-xs font-mono mt-1">Start a conversation first</p>
                  </div>
                ) : (
                  dmChannels.map((channel) => {
                    const otherUser = channel.otherUser;
                    if (!otherUser) return null;

                    return (
                      <motion.button
                        key={channel.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleShareImage(otherUser.id)}
                        disabled={isSharing}
                        className="w-full p-3 rounded-lg bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-violet-500/50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={otherUser.avatar}
                            alt={otherUser.username}
                            className="w-10 h-10 rounded-full border-2 border-slate-700"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-mono font-bold text-slate-200">
                              {otherUser.username}
                            </p>
                            <p className="text-xs text-slate-500 font-mono">
                              Click to share
                            </p>
                          </div>
                          <Send className="w-4 h-4 text-violet-400" />
                        </div>
                      </motion.button>
                    );
                  })
                )}
              </div>

              {isSharing && (
                <div className="flex items-center justify-center gap-2 text-violet-400 text-sm font-mono">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Cpu className="w-4 h-4" />
                  </motion.div>
                  Sharing image...
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.type === 'folder' ? 'DELETE FOLDER' : 'DELETE IMAGE'}
        message={
          deleteConfirm.type === 'folder'
            ? `Delete "${deleteConfirm.name || 'this folder'}"? Images will be moved to Uncategorized.`
            : 'Delete this image permanently? This cannot be undone.'
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={deleteConfirm.type === 'folder' ? confirmDeleteFolder : confirmDeleteImage}
        onCancel={() => setDeleteConfirm({ isOpen: false, type: 'image', id: null })}
      />

      {/* Split Image Editor */}
      {splitEditorImage && (
        <SplitEditor
          initialImage={splitEditorImage}
          onClose={() => setSplitEditorImage(null)}
          onSave={(newImage) => {
            // Could update the image in the gallery if needed
            setSplitEditorImage(null);
          }}
        />
      )}
    </div>
  );
};
