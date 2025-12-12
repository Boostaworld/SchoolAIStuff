/**
 * Report Context Capture Utilities
 * Captures browser, system, and app context for bug reports
 */

import { ReportContext } from '../../types';
import { getActionTrail } from './actionTrail';

/**
 * Get the app version from environment variable
 */
function getAppVersion(): string {
    try {
        // Vite injects env vars prefixed with VITE_
        return (import.meta as any).env?.VITE_APP_VERSION || 'unknown';
    } catch {
        return 'unknown';
    }
}

/**
 * Parse user agent to get browser info
 */
function getBrowserInfo(): string {
    const ua = navigator.userAgent;

    // Check for common browsers
    if (ua.includes('Firefox/')) {
        const match = ua.match(/Firefox\/(\d+)/);
        return `Firefox ${match?.[1] || ''}`;
    }
    if (ua.includes('Edg/')) {
        const match = ua.match(/Edg\/(\d+)/);
        return `Edge ${match?.[1] || ''}`;
    }
    if (ua.includes('Chrome/')) {
        const match = ua.match(/Chrome\/(\d+)/);
        return `Chrome ${match?.[1] || ''}`;
    }
    if (ua.includes('Safari/') && !ua.includes('Chrome')) {
        const match = ua.match(/Version\/(\d+)/);
        return `Safari ${match?.[1] || ''}`;
    }

    return 'Unknown Browser';
}

/**
 * Get OS info from user agent
 */
function getOSInfo(): string {
    const ua = navigator.userAgent;

    if (ua.includes('Windows NT 10')) return 'Windows 10/11';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac OS X')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';

    return 'Unknown OS';
}

/**
 * Get current route from hash
 */
function getCurrentRoute(): string {
    const hash = window.location.hash;
    if (!hash || hash === '#') return 'home';

    // Extract route name (first segment after #)
    const route = hash.slice(1).split('/')[0];
    return route || 'home';
}

/**
 * Get user's timezone
 */
function getTimezone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
        return 'Unknown';
    }
}

/**
 * Get viewport dimensions
 */
function getViewport(): string {
    return `${window.innerWidth}x${window.innerHeight}`;
}

/**
 * Capture full report context
 */
export function captureReportContext(userId: string, username: string): ReportContext {
    return {
        route: getCurrentRoute(),
        full_url: window.location.href,
        user_id: userId,
        username: username,
        timestamp: new Date().toISOString(),
        timezone: getTimezone(),
        app_version: getAppVersion(),
        browser: getBrowserInfo(),
        os: getOSInfo(),
        viewport: getViewport(),
        referrer: document.referrer || null,
        action_trail: getActionTrail()
    };
}

/**
 * Rate limiting for reports
 */
const RATE_LIMIT_KEY = 'orbit_report_ratelimit';
const MAX_REPORTS_PER_MINUTE = 2;

export function canSubmitReport(): boolean {
    try {
        const timestamps: number[] = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || '[]');
        const now = Date.now();
        const recent = timestamps.filter(t => now - t < 60000); // Last minute
        return recent.length < MAX_REPORTS_PER_MINUTE;
    } catch {
        return true; // Allow if check fails
    }
}

export function recordReportSubmission() {
    try {
        const timestamps: number[] = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || '[]');
        timestamps.push(Date.now());
        // Keep only last 10 timestamps
        localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(timestamps.slice(-10)));
    } catch {
        // Silently fail
    }
}

/**
 * Duplicate detection
 */
const DUPLICATE_KEY = 'orbit_report_recent';
const DUPLICATE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export function isDuplicateReport(route: string, text: string): boolean {
    try {
        const recent = JSON.parse(localStorage.getItem(DUPLICATE_KEY) || '[]') as Array<{
            route: string;
            textHash: string;
            ts: number;
        }>;

        const now = Date.now();
        const textHash = text.slice(0, 100); // Just compare first 100 chars

        return recent.some(r =>
            r.route === route &&
            r.textHash === textHash &&
            now - r.ts < DUPLICATE_WINDOW_MS
        );
    } catch {
        return false;
    }
}

export function recordReportForDuplicateCheck(route: string, text: string) {
    try {
        const recent = JSON.parse(localStorage.getItem(DUPLICATE_KEY) || '[]') as Array<{
            route: string;
            textHash: string;
            ts: number;
        }>;

        recent.push({
            route,
            textHash: text.slice(0, 100),
            ts: Date.now()
        });

        // Keep only last 10 entries
        localStorage.setItem(DUPLICATE_KEY, JSON.stringify(recent.slice(-10)));
    } catch {
        // Silently fail
    }
}
