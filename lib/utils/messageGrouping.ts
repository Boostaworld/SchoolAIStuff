/**
 * Message Grouping Utility
 * Provides Snapchat-style day/time separators for message lists
 */

import { Message } from '@/types';

export interface MessageGroup {
  date: string; // "Today", "Yesterday", "Dec 1, 2025"
  messages: Message[];
}

/**
 * Groups messages by date with human-readable labels
 */
export function groupMessagesByDate(messages: Message[]): MessageGroup[] {
  if (!messages || messages.length === 0) return [];

  const groups: MessageGroup[] = [];
  let currentDate = '';
  let currentGroup: Message[] = [];

  // Sort messages by created_at ascending (oldest first)
  const sortedMessages = [...messages].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  sortedMessages.forEach((msg) => {
    const msgDate = formatDateLabel(msg.created_at);

    if (msgDate !== currentDate) {
      // Save previous group if it exists
      if (currentGroup.length > 0) {
        groups.push({ date: currentDate, messages: currentGroup });
      }

      // Start new group
      currentDate = msgDate;
      currentGroup = [msg];
    } else {
      // Add to current group
      currentGroup.push(msg);
    }
  });

  // Push final group
  if (currentGroup.length > 0) {
    groups.push({ date: currentDate, messages: currentGroup });
  }

  return groups;
}

/**
 * Formats a timestamp into a human-readable date label
 * - "Today" for today
 * - "Yesterday" for yesterday
 * - "Dec 1" for within current year
 * - "Dec 1, 2024" for previous years
 */
export function formatDateLabel(timestamp: string): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(date, today)) {
    return 'Today';
  }

  if (isSameDay(date, yesterday)) {
    return 'Yesterday';
  }

  // Check if same year
  if (date.getFullYear() === today.getFullYear()) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Different year - include year
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Helper function to check if two dates are on the same day
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Groups consecutive messages from the same sender
 * Used for visual message clustering (like iMessage)
 */
export function groupMessagesBySender(messages: Message[]): Message[][] {
  if (!messages || messages.length === 0) return [];

  const groups: Message[][] = [];
  let currentGroup: Message[] = [];
  let currentSenderId: string | null = null;

  messages.forEach((msg, index) => {
    const timeDiff = index > 0
      ? new Date(msg.created_at).getTime() - new Date(messages[index - 1].created_at).getTime()
      : 0;

    // Start new group if sender changes or >5 min gap
    if (msg.sender_id !== currentSenderId || timeDiff > 5 * 60 * 1000) {
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }
      currentGroup = [msg];
      currentSenderId = msg.sender_id;
    } else {
      currentGroup.push(msg);
    }
  });

  // Push final group
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}
