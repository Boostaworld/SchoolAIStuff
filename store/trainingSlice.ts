import { StateCreator } from 'zustand';
import { TrainingMode, RaceBot, AcademyDrill, KeyStat, TypingRace, EnhancedTypingSession, RaceResults } from '../types';
import { supabase } from '../lib/supabase';
import { CoachService } from '../lib/ai/CoachService';

export interface TrainingState {
  // Mode Management
  currentMode: TrainingMode;
  setMode: (mode: TrainingMode) => void;

  // VELOCITY State
  currentRace: TypingRace | null;
  raceBots: RaceBot[];
  raceInProgress: boolean;
  startRace: (challengeId: string) => Promise<void>;
  finishRace: (results: RaceResults) => Promise<void>;
  loadBots: () => Promise<void>;

  // ACADEMY State
  currentDrill: AcademyDrill | null;
  drillHistory: AcademyDrill[];
  weakKeys: KeyStat[];
  generateDrill: () => Promise<AcademyDrill>;
  completeDrill: (accuracy: number) => Promise<void>;
  loadDrillHistory: () => Promise<void>;

  // Shared Analytics
  typingStats: KeyStat[];
  latencyHistory: number[];
  rhythmScore: number;
  fetchTypingStats: () => Promise<void>;
  updateRhythmScore: (latencies: number[]) => void;
}

export const createTrainingSlice: StateCreator<TrainingState> = (set, get) => ({
  // Initial State
  currentMode: 'velocity',
  currentRace: null,
  raceBots: [],
  raceInProgress: false,
  currentDrill: null,
  drillHistory: [],
  weakKeys: [],
  typingStats: [],
  latencyHistory: [],
  rhythmScore: 100,

  // Mode Management
  setMode: (mode: TrainingMode) => {
    set({ currentMode: mode });
  },

  // VELOCITY Actions
  loadBots: async () => {
    try {
      const { data, error } = await supabase
        .from('race_bots')
        .select('*')
        .order('target_wpm', { ascending: true });

      if (error) {
        console.warn('Race bots table not found, using defaults');
        // Provide default bots if table doesn't exist
        const defaultBots: RaceBot[] = [
          { id: '1', name: 'Turbo', targetWpm: 80, errorRate: 0.02, personality: 'aggressive' },
          { id: '2', name: 'Steady', targetWpm: 60, errorRate: 0.01, personality: 'steady' },
          { id: '3', name: 'Cautious', targetWpm: 50, errorRate: 0.005, personality: 'cautious' },
        ];
        set({ raceBots: defaultBots });
        return;
      }

      const mappedBots: RaceBot[] = (data || []).map((bot: any) => ({
        id: bot.id,
        name: bot.name,
        targetWpm: bot.target_wpm,
        errorRate: bot.error_rate,
        personality: bot.personality,
        avatarUrl: bot.avatar_url
      }));

      set({ raceBots: mappedBots });
    } catch (error) {
      console.error('Failed to load bots:', error);
    }
  },

  startRace: async (challengeId: string) => {
    try {
      // Get user's average WPM to match bots
      const userWpm = 60; // TODO: Get from user profile or recent sessions
      const bots = get().raceBots;

      // Auto-select 3 bots within ±10 WPM of user's average
      const matchedBots = bots
        .filter(bot => Math.abs(bot.targetWpm - userWpm) <= 10)
        .slice(0, 3);

      // If not enough matched bots, pick closest ones
      if (matchedBots.length < 3) {
        const sortedByDistance = bots
          .sort((a, b) =>
            Math.abs(a.targetWpm - userWpm) - Math.abs(b.targetWpm - userWpm)
          )
          .slice(0, 3);
        matchedBots.push(...sortedByDistance.filter(b => !matchedBots.includes(b)));
      }

      // Ensure personality mix (1 aggressive, 1 steady, 1 cautious if possible)
      const personalities = matchedBots.map(b => b.personality);
      if (new Set(personalities).size < matchedBots.length) {
        // Try to diversify
        const diverseBots = [
          bots.find(b => b.personality === 'aggressive'),
          bots.find(b => b.personality === 'steady'),
          bots.find(b => b.personality === 'cautious')
        ].filter(Boolean) as RaceBot[];

        if (diverseBots.length >= 3) {
          matchedBots.splice(0, 3, ...diverseBots.slice(0, 3));
        }
      }

      // Create race in database
      const { data: race, error } = await supabase
        .from('typing_races')
        .insert({
          challenge_id: challengeId,
          bot_count: matchedBots.length,
          bot_wpm_ranges: matchedBots.map(b => b.targetWpm),
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.warn('Race table not found, using local state only');
      }

      set({
        currentRace: race || {
          id: `temp-${Date.now()}`,
          challenge_id: challengeId,
          host_user_id: '',
          bot_count: matchedBots.length,
          bot_wpm_ranges: matchedBots.map(b => b.targetWpm),
          status: 'in_progress',
          started_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        },
        raceInProgress: true,
        raceBots: matchedBots
      });
    } catch (error) {
      console.error('Failed to start race:', error);
    }
  },

  finishRace: async (results: RaceResults) => {
    const { currentRace } = get();
    if (!currentRace) return;

    try {
      // Update race status
      if (!currentRace.id.startsWith('temp-')) {
        await supabase
          .from('typing_races')
          .update({ status: 'completed' })
          .eq('id', currentRace.id);
      }

      set({ currentRace: null, raceInProgress: false });

      // Award Orbit Points based on placement
      // TODO: Integrate with user profile points system
    } catch (error) {
      console.error('Failed to finish race:', error);
    }
  },

  // ACADEMY Actions
  generateDrill: async () => {
    try {
      // Fetch weak keys (< 70% accuracy)
      const stats = get().typingStats;
      const weakKeys = stats.filter(s => s.accuracy < 70);

      // Generate drill text using CoachService
      const drillText = await CoachService.generateDrill(weakKeys);

      // Create drill record
      const drill: AcademyDrill = {
        id: `drill-${Date.now()}`,
        userId: '', // TODO: Get from current user
        targetKeys: weakKeys.map(k => k.key || ''),
        drillText,
        difficulty: 1,
        generatedAt: new Date().toISOString(),
        completed: false
      };

      // Try to persist to database
      try {
        const { data, error } = await supabase
          .from('academy_drills')
          .insert({
            user_id: drill.userId,
            target_keys: drill.targetKeys.join(','),
            drill_text: drill.drillText,
            difficulty: drill.difficulty
          })
          .select()
          .single();

        if (!error && data) {
          drill.id = data.id;
        }
      } catch (dbError) {
        console.warn('Academy drills table not found, using local state only');
      }

      set({ currentDrill: drill });
      return drill;
    } catch (error) {
      console.error('Failed to generate drill:', error);
      throw error;
    }
  },

  completeDrill: async (accuracy: number) => {
    const { currentDrill } = get();
    if (!currentDrill) return;

    try {
      const completedDrill = {
        ...currentDrill,
        completed: true,
        finalAccuracy: accuracy
      };

      // Update database if not a temp drill
      if (!currentDrill.id.startsWith('drill-')) {
        await supabase
          .from('academy_drills')
          .update({
            completed: true,
            final_accuracy: accuracy
          })
          .eq('id', currentDrill.id);
      }

      set(state => ({
        drillHistory: [...state.drillHistory, completedDrill],
        currentDrill: null
      }));
    } catch (error) {
      console.error('Failed to complete drill:', error);
    }
  },

  loadDrillHistory: async () => {
    try {
      const { data, error } = await supabase
        .from('academy_drills')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(10);

      if (error) {
        console.warn('Academy drills table not found');
        return;
      }

      const mappedDrills: AcademyDrill[] = (data || []).map((drill: any) => ({
        id: drill.id,
        userId: drill.user_id,
        targetKeys: drill.target_keys?.split(',') || [],
        drillText: drill.drill_text,
        difficulty: drill.difficulty,
        generatedAt: drill.generated_at,
        completed: drill.completed,
        finalAccuracy: drill.final_accuracy
      }));

      set({ drillHistory: mappedDrills });
    } catch (error) {
      console.error('Failed to load drill history:', error);
    }
  },

  // Shared Analytics
  fetchTypingStats: async () => {
    try {
      const { data, error } = await supabase
        .from('typing_stats')
        .select('*');

      if (error) {
        console.warn('Typing stats table not found');
        return;
      }

      const mappedStats: KeyStat[] = (data || []).map((stat: any) => {
        const accuracy = stat.total_presses > 0
          ? ((stat.total_presses - stat.error_count) / stat.total_presses) * 100
          : 100;

        return {
          key: stat.key_char,
          presses: stat.total_presses,
          errors: stat.error_count,
          accuracy
        };
      });

      // Identify weak keys (< 70% accuracy)
      const weakKeys = mappedStats.filter(s => s.accuracy < 70);

      set({ typingStats: mappedStats, weakKeys });
    } catch (error) {
      console.error('Failed to fetch typing stats:', error);
    }
  },

  updateRhythmScore: (latencies: number[]) => {
    if (latencies.length < 2) {
      set({ rhythmScore: 100 });
      return;
    }

    // Calculate rhythm score: 100 - (standardDeviation / mean) * 100
    const mean = latencies.reduce((sum, val) => sum + val, 0) / latencies.length;
    const variance = latencies.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / latencies.length;
    const stdDev = Math.sqrt(variance);

    const rhythmScore = Math.max(0, Math.min(100, 100 - (stdDev / mean) * 100));

    set({ rhythmScore, latencyHistory: latencies });
  }
});
