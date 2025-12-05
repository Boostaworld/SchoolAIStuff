/**
 * Notification utilities for DM system
 * Handles favicon badges, browser notifications, and notification state
 */

/**
 * Updates the favicon with an unread count badge
 * Creates a red circle with white text showing the count
 * @param count Number of unread messages (0 to clear badge)
 */
export function updateFaviconBadge(count: number) {
  if (typeof window === 'undefined') return; // Server-side guard

  const favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
  if (!favicon) return;

  // Store original favicon URL for restoration
  const originalFavicon = favicon.getAttribute('data-original-href') || favicon.href;
  if (!favicon.getAttribute('data-original-href')) {
    favicon.setAttribute('data-original-href', originalFavicon);
  }

  if (count === 0) {
    // Restore original favicon
    favicon.href = originalFavicon;
    return;
  }

  // Create canvas for badge
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Load original favicon as image
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    // Draw original favicon
    ctx.drawImage(img, 0, 0, 32, 32);

    // Draw red badge circle
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(24, 8, 8, 0, 2 * Math.PI);
    ctx.fill();

    // Draw white count text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const displayCount = count > 9 ? '9+' : count.toString();
    ctx.fillText(displayCount, 24, 8);

    // Update favicon
    favicon.href = canvas.toDataURL('image/png');
  };
  img.src = originalFavicon;
}

/**
 * Requests browser notification permission if not already granted
 * @returns Promise resolving to permission state
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Browser notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

/**
 * Shows a browser notification for a new DM
 * @param options Notification options
 */
export interface DMNotificationOptions {
  senderUsername: string;
  senderAvatar?: string;
  messagePreview: string;
  channelId: string;
  onClick?: () => void;
}

export function showDMNotification(options: DMNotificationOptions) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (document.hasFocus()) return; // Don't show if window is focused

  const { senderUsername, senderAvatar, messagePreview, channelId, onClick } = options;

  const notification = new Notification(`New message from ${senderUsername}`, {
    body: messagePreview.substring(0, 100),
    icon: senderAvatar || '/default-avatar.png',
    tag: channelId, // Prevents duplicate notifications for same channel
    requireInteraction: false,
    silent: false,
  });

  notification.onclick = () => {
    window.focus();
    if (onClick) onClick();
    notification.close();
  };

  // Auto-close after 5 seconds
  setTimeout(() => notification.close(), 5000);
}

/**
 * Calculates total unread DMs across all channels
 * @param channels Array of DM channels with unread counts
 * @returns Total unread count
 */
export function getTotalUnreadCount(channels: Array<{ unread_count?: number; unreadCount?: number }>): number {
  return channels.reduce((total, channel) => total + (channel.unread_count || channel.unreadCount || 0), 0);
}
