"use client";

import React, { useState, useEffect } from 'react';
import { useOrbitStore } from '@/store/useOrbitStore';
import { MarkdownRenderer } from '@/components/Announcements/MarkdownRenderer';
import { ThemePicker } from '@/components/Announcements/ThemePicker';
import { ConfirmModal } from '@/components/Shared/ConfirmModal';
import { getTheme } from '@/lib/themes/announcementThemes';
import type { CreateAnnouncementRequest, Announcement } from '@/types';
import { Sparkles, Bug, Settings, Calendar, ArrowUpCircle, Save, Eye, FileText, AlertCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const categoryOptions: { value: Announcement['category']; label: string; icon: any }[] = [
  { value: 'feature', label: 'Feature', icon: Sparkles },
  { value: 'fix', label: 'Fix', icon: Bug },
  { value: 'system', label: 'System', icon: Settings },
  { value: 'event', label: 'Event', icon: Calendar },
  { value: 'update', label: 'Update', icon: ArrowUpCircle }
];

export function AnnouncementsAdminPanel() {
  const createAnnouncement = useOrbitStore((s) => s.createAnnouncement);

  const [formData, setFormData] = useState<CreateAnnouncementRequest>({
    title: '',
    summary: '',
    content: '',
    version: '',
    category: 'update',
    hero_image_url: '',
    is_pinned: false,
    banner_enabled: true,
    theme_id: 'default'
  });

  const [previewMode, setPreviewMode] = useState<'banner' | 'modal'>('modal');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!formData.title.trim()) {
      newErrors.push('Title is required');
    } else if (formData.title.length > 100) {
      newErrors.push('Title must be 100 characters or less');
    }

    if (!formData.content.trim()) {
      newErrors.push('Content is required');
    }

    if (formData.version && !/^\d+\.\d+(\.\d+)?$/.test(formData.version)) {
      newErrors.push('Version must be in semver format (e.g., 1.0.0)');
    }

    if (formData.hero_image_url) {
      try {
        new URL(formData.hero_image_url);
      } catch {
        newErrors.push('Hero image URL must be a valid URL');
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors([]);
    setSuccessMessage(null);

    try {
      await createAnnouncement(formData);
      setSuccessMessage('Announcement published successfully!');

      // Reset form
      setFormData({
        title: '',
        summary: '',
        content: '',
        version: '',
        category: 'update',
        hero_image_url: '',
        is_pinned: false,
        banner_enabled: true
      });

      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to publish announcement';

      if (errorMessage.includes('Maximum 3 pinned')) {
        setErrors(['Maximum 3 pinned announcements allowed. Unpin an existing one first.']);
      } else {
        setErrors([errorMessage]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewAnnouncement: Announcement = {
    id: 'preview',
    title: formData.title || 'Preview Title',
    summary: formData.summary || null,
    content: formData.content || '*No content yet*',
    version: formData.version || null,
    category: formData.category,
    active: true,
    hero_image_url: formData.hero_image_url || null,
    is_pinned: formData.is_pinned,
    banner_enabled: formData.banner_enabled,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Announcement Manager</h2>
        <p className="text-slate-400">Create and publish system announcements</p>
      </div>

      {/* Success Message */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <p className="text-green-400 font-medium">{successMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Messages */}
      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-400 font-medium mb-2">Please fix the following errors:</p>
                <ul className="list-disc list-inside text-red-400 text-sm space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Split Screen */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left Pane - Form */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                maxLength={100}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="Enter announcement title..."
              />
              <p className="mt-1 text-xs text-slate-500">{formData.title.length}/100 characters</p>
            </div>

            {/* Summary */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Summary
              </label>
              <textarea
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                maxLength={200}
                rows={2}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                placeholder="Short summary for banner (optional)"
              />
              <p className="mt-1 text-xs text-slate-500">{formData.summary?.length || 0}/200 characters</p>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Content (Markdown) <span className="text-red-400">*</span>
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={12}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none font-mono text-sm"
                placeholder="Write your announcement content in Markdown..."
              />
            </div>

            {/* Version & Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Version
                </label>
                <input
                  type="text"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="e.g., 2.4.0"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Category <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as Announcement['category'] })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Hero Image URL */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Hero Image URL
              </label>
              <input
                type="text"
                value={formData.hero_image_url}
                onChange={(e) => setFormData({ ...formData, hero_image_url: e.target.value })}
                placeholder="https://example.com/image.jpg"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            {/* Theme Picker - DISABLED FOR NOW TODO: Re-enable later */}
            {/* <ThemePicker
              selectedThemeId={formData.theme_id || 'default'}
              onThemeSelect={(themeId) => setFormData({ ...formData, theme_id: themeId })}
            /> */}

            {/* Checkboxes */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_pinned}
                  onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                  className="w-5 h-5 bg-slate-800 border-slate-700 rounded text-cyan-500 focus:ring-2 focus:ring-cyan-500"
                />
                <span className="text-sm text-slate-300">Pin announcement (max 3)</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.banner_enabled}
                  onChange={(e) => setFormData({ ...formData, banner_enabled: e.target.checked })}
                  className="w-5 h-5 bg-slate-800 border-slate-700 rounded text-cyan-500 focus:ring-2 focus:ring-cyan-500"
                />
                <span className="text-sm text-slate-300">Enable banner</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-6 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>Processing...</>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Publish Announcement
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Pane - Preview */}
        <div className="flex-1 bg-slate-800/50 rounded-lg p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Live Preview</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setPreviewMode('banner')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${previewMode === 'banner'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
              >
                Banner
              </button>
              <button
                onClick={() => setPreviewMode('modal')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${previewMode === 'modal'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
              >
                Modal
              </button>
            </div>
          </div>

          {previewMode === 'banner' ? (
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-t-2 border-cyan-500 shadow-lg rounded-lg p-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  {React.createElement(categoryOptions.find(c => c.value === formData.category)?.icon || FileText, {
                    className: 'w-6 h-6 text-cyan-400'
                  })}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">
                    {formData.title || 'Preview Title'}
                  </h3>
                  {formData.summary && (
                    <p className="text-sm text-slate-300 truncate">
                      {formData.summary}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div>
              {previewAnnouncement.hero_image_url && (
                <img
                  src={previewAnnouncement.hero_image_url}
                  alt={previewAnnouncement.title}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  {previewAnnouncement.version && (
                    <span className="px-2 py-1 text-sm font-mono font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 rounded">
                      v{previewAnnouncement.version}
                    </span>
                  )}
                  <span className="px-2 py-1 text-sm font-medium text-cyan-400 bg-cyan-500/10 rounded capitalize">
                    {previewAnnouncement.category}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  {previewAnnouncement.title}
                </h1>
              </div>
              <div className="prose prose-invert prose-sm max-w-none">
                <MarkdownRenderer content={previewAnnouncement.content} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Existing Announcements Management Section */}
      <ExistingAnnouncementsManager />
    </div>
  );
}

// Separate component for managing existing announcements
function ExistingAnnouncementsManager() {
  const announcements = useOrbitStore((s) => s.announcements.list);
  const fetchAnnouncements = useOrbitStore((s) => s.fetchAnnouncements);
  const deleteAnnouncement = useOrbitStore((s) => s.deleteAnnouncement);
  const updateAnnouncement = useOrbitStore((s) => s.updateAnnouncement);

  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState<{ isOpen: boolean; id: string; title: string }>({
    isOpen: false,
    id: '',
    title: ''
  });

  // Fetch announcements on mount
  useEffect(() => {
    fetchAnnouncements(true);
  }, [fetchAnnouncements]);

  const handleDelete = async () => {
    const { id } = deleteConfirm;
    setDeleteConfirm({ isOpen: false, id: '', title: '' });
    setDeletingId(id);
    try {
      await deleteAnnouncement(id);
    } catch (error) {
      console.error('Failed to delete announcement:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeactivate = async (id: string, currentActive: boolean) => {
    try {
      await updateAnnouncement(id, { banner_enabled: !currentActive } as any);
    } catch (error) {
      console.error('Failed to toggle announcement:', error);
    }
  };

  if (announcements.length === 0) {
    return (
      <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-2">Existing Announcements</h3>
        <p className="text-slate-400 text-sm">No announcements yet. Create one above!</p>
      </div>
    );
  }

  return (
    <>
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Delete Announcement"
        message={`Are you sure you want to permanently delete "${deleteConfirm.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: '', title: '' })}
      />
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-white mb-3">Existing Announcements ({announcements.length})</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${ann.banner_enabled
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-slate-500/20 text-slate-400'
                    }`}>
                    {ann.banner_enabled ? 'ACTIVE' : 'HIDDEN'}
                  </span>
                  <span className="px-2 py-0.5 text-xs font-medium bg-slate-700 text-slate-300 rounded capitalize">
                    {ann.category}
                  </span>
                  {ann.is_pinned && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-400 rounded">
                      PINNED
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-white truncate mt-1">{ann.title}</p>
                <p className="text-xs text-slate-400">
                  {new Date(ann.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-2 ml-3">
                {/* Toggle Active/Hidden */}
                <button
                  onClick={() => handleDeactivate(ann.id, ann.banner_enabled)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${ann.banner_enabled
                    ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                    : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    }`}
                >
                  {ann.banner_enabled ? 'Hide' : 'Show'}
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => setDeleteConfirm({ isOpen: true, id: ann.id, title: ann.title })}
                  disabled={deletingId === ann.id}
                  className="px-3 py-1.5 text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  <Trash2 className="w-3 h-3" />
                  {deletingId === ann.id ? '...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

