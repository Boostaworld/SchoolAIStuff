"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { ANNOUNCEMENT_THEMES, type AnnouncementTheme } from '@/lib/themes/announcementThemes';

interface ThemePickerProps {
  selectedThemeId: string;
  onThemeSelect: (themeId: string) => void;
}

export function ThemePicker({ selectedThemeId, onThemeSelect }: ThemePickerProps) {
  const themes = Object.values(ANNOUNCEMENT_THEMES);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-white mb-3 uppercase tracking-wide">
          Theme & Visual Effects
        </label>
        <p className="text-sm text-slate-400 mb-4">
          Choose a preset theme with custom colors, particles, and animations
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {themes.map((theme) => {
          const isSelected = selectedThemeId === theme.id;

          return (
            <motion.button
              key={theme.id}
              onClick={() => onThemeSelect(theme.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative group overflow-hidden rounded-xl border-2 transition-all"
              style={{
                background: theme.colors.background,
                borderColor: isSelected ? theme.colors.accent : theme.colors.border
              }}
            >
              {/* Background gradient */}
              {theme.colors.backgroundGradient && (
                <div
                  className="absolute inset-0"
                  style={{ background: theme.colors.backgroundGradient }}
                />
              )}

              {/* Selected indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 z-10 flex items-center justify-center w-6 h-6 rounded-full"
                  style={{ background: theme.colors.accent }}
                >
                  <Check className="w-4 h-4" style={{ color: theme.colors.background }} />
                </motion.div>
              )}

              {/* Theme preview content */}
              <div className="relative p-4 space-y-3">
                {/* Icon & particles indicator */}
                <div className="flex items-center justify-between">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: `${theme.colors.primary}40` }}
                  >
                    <Sparkles className="w-5 h-5" style={{ color: theme.colors.accent }} />
                  </div>
                  {theme.particles.enabled && (
                    <span
                      className="px-2 py-0.5 rounded text-xs font-bold"
                      style={{
                        background: `${theme.colors.accent}30`,
                        color: theme.colors.accent
                      }}
                    >
                      {theme.particles.type}
                    </span>
                  )}
                </div>

                {/* Theme info */}
                <div className="text-left">
                  <h3
                    className="text-sm font-bold mb-1"
                    style={{
                      color: theme.colors.text,
                      fontFamily: theme.typography.fontFamily
                    }}
                  >
                    {theme.name}
                  </h3>
                  <p
                    className="text-xs"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    {theme.description}
                  </p>
                </div>

                {/* Color palette preview */}
                <div className="flex gap-1.5">
                  <div
                    className="w-6 h-6 rounded border"
                    style={{
                      background: theme.colors.primary,
                      borderColor: theme.colors.border
                    }}
                    title="Primary"
                  />
                  <div
                    className="w-6 h-6 rounded border"
                    style={{
                      background: theme.colors.secondary,
                      borderColor: theme.colors.border
                    }}
                    title="Secondary"
                  />
                  <div
                    className="w-6 h-6 rounded border"
                    style={{
                      background: theme.colors.accent,
                      borderColor: theme.colors.border
                    }}
                    title="Accent"
                  />
                </div>

                {/* Effects indicators */}
                <div className="flex flex-wrap gap-1">
                  {theme.effects.glow && (
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ background: `${theme.colors.accent}20`, color: theme.colors.accent }}>
                      Glow
                    </span>
                  )}
                  {theme.effects.blur && (
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ background: `${theme.colors.accent}20`, color: theme.colors.accent }}>
                      Blur
                    </span>
                  )}
                  {theme.effects.pattern && theme.effects.pattern !== 'none' && (
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium capitalize" style={{ background: `${theme.colors.accent}20`, color: theme.colors.accent }}>
                      {theme.effects.pattern}
                    </span>
                  )}
                </div>
              </div>

              {/* Hover border glow */}
              {theme.effects.glow && (
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{
                    boxShadow: `inset 0 0 20px ${theme.colors.accent}60`
                  }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
