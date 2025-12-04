import { Period } from '../../types';

/**
 * Check if current time is within a period's timeframe
 */
export function isWithinPeriod(now: Date, period: Period): boolean {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startHour, startMin] = period.start_time.split(':').map(Number);
  const [endHour, endMin] = period.end_time.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Get the next upcoming period
 */
export function getNextPeriod(now: Date, schedule: Period[]): Period | null {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const period of schedule) {
    const [startHour, startMin] = period.start_time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;

    if (currentMinutes < startMinutes) {
      return period;
    }
  }

  return null; // No more periods today
}

/**
 * Get duration of a period in minutes
 */
export function getDurationMinutes(period: Period): number {
  const [startHour, startMin] = period.start_time.split(':').map(Number);
  const [endHour, endMin] = period.end_time.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  return endMinutes - startMinutes;
}

/**
 * Get elapsed minutes within current period
 */
export function getElapsedMinutes(now: Date, period: Period): number {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startHour, startMin] = period.start_time.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;

  return currentMinutes - startMinutes;
}

/**
 * Format minutes into MM:SS or HH:MM:SS
 */
export function formatMinutes(minutes: number): string {
  const totalSeconds = Math.max(0, Math.floor(minutes * 60));
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get time until next period starts
 */
export function getTimeUntil(now: Date, period: Period): string {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startHour, startMin] = period.start_time.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;

  const minutesUntil = startMinutes - currentMinutes;

  if (minutesUntil < 60) {
    return `${minutesUntil}m`;
  }
  const hours = Math.floor(minutesUntil / 60);
  const mins = minutesUntil % 60;
  return `${hours}h ${mins}m`;
}

/**
 * Check if two time strings overlap (HH:MM format)
 */
export function timesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const [s1h, s1m] = start1.split(':').map(Number);
  const [e1h, e1m] = end1.split(':').map(Number);
  const [s2h, s2m] = start2.split(':').map(Number);
  const [e2h, e2m] = end2.split(':').map(Number);

  const start1Min = s1h * 60 + s1m;
  const end1Min = e1h * 60 + e1m;
  const start2Min = s2h * 60 + s2m;
  const end2Min = e2h * 60 + e2m;

  return start1Min < end2Min && start2Min < end1Min;
}

/**
 * Validate period times (start < end, no weird values)
 */
export function validatePeriodTimes(startTime: string, endTime: string): {
  valid: boolean;
  error?: string;
} {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

  if (!timeRegex.test(startTime)) {
    return { valid: false, error: 'Invalid start time format. Use HH:MM (24-hour)' };
  }
  if (!timeRegex.test(endTime)) {
    return { valid: false, error: 'Invalid end time format. Use HH:MM (24-hour)' };
  }

  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  if (startMinutes >= endMinutes) {
    return { valid: false, error: 'End time must be after start time' };
  }

  return { valid: true };
}

/**
 * Get color for period type
 */
export function getPeriodColor(type: 'Class' | 'Break' | 'Lunch'): {
  bg: string;
  border: string;
  text: string;
  glow: string;
} {
  switch (type) {
    case 'Class':
      return {
        bg: 'bg-cyan-500/10',
        border: 'border-cyan-500/30',
        text: 'text-cyan-400',
        glow: 'shadow-[0_0_15px_rgba(6,182,212,0.3)]'
      };
    case 'Break':
      return {
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/30',
        text: 'text-purple-400',
        glow: 'shadow-[0_0_15px_rgba(168,85,247,0.3)]'
      };
    case 'Lunch':
      return {
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/30',
        text: 'text-orange-400',
        glow: 'shadow-[0_0_15px_rgba(249,115,22,0.3)]'
      };
  }
}
