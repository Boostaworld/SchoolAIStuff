/**
 * Format a timestamp into human-readable relative time
 * Examples: "just now", "5m ago", "2h ago", "3d ago", "Dec 1"
 */
export function formatLastSeen(timestamp: string | undefined | null): string {
  if (!timestamp) return 'never';

  const now = new Date();
  const then = new Date(timestamp);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  // Handle future timestamps (shouldn't happen but just in case)
  if (seconds < 0) return 'just now';

  // Less than a minute
  if (seconds < 60) return 'just now';

  // Less than an hour (show minutes)
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  }

  // Less than 24 hours (show hours)
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours}h ago`;
  }

  // Less than 7 days (show days)
  if (seconds < 604800) {
    const days = Math.floor(seconds / 86400);
    return `${days}d ago`;
  }

  // More than a week - show date
  return then.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a timestamp for chat message grouping
 * Returns: "Today", "Yesterday", or "Dec 1, 2025"
 */
export function formatDateLabel(timestamp: string): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, yesterday)) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Check if two dates are on the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Format minutes into MM:SS format
 */
export function formatMinutes(minutes: number): string {
  const mins = Math.floor(minutes);
  const secs = Math.floor((minutes - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
