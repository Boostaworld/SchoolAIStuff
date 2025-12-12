/**
 * Action Trail - Captures last 10 user actions in localStorage
 * Used for bug report context to help debug issues
 */

const TRAIL_KEY = 'orbit_action_trail';
const MAX_TRAIL = 10;

export interface TrailEntry {
    action: 'navigate' | 'click' | 'input' | 'error';
    target?: string;  // button id, element identifier
    to?: string;      // for navigation: destination route
    ts: string;       // ISO timestamp
}

/**
 * Log a user action to the trail
 */
export function logAction(entry: Omit<TrailEntry, 'ts'>) {
    try {
        const trail: TrailEntry[] = JSON.parse(localStorage.getItem(TRAIL_KEY) || '[]');
        trail.push({ ...entry, ts: new Date().toISOString() });

        // Keep only the last MAX_TRAIL entries
        if (trail.length > MAX_TRAIL) {
            trail.shift();
        }

        localStorage.setItem(TRAIL_KEY, JSON.stringify(trail));
    } catch (e) {
        // Silently fail if localStorage is not available
        console.warn('Failed to log action trail:', e);
    }
}

/**
 * Get the current action trail
 */
export function getActionTrail(): TrailEntry[] {
    try {
        return JSON.parse(localStorage.getItem(TRAIL_KEY) || '[]');
    } catch {
        return [];
    }
}

/**
 * Clear the action trail (e.g., on logout)
 */
export function clearActionTrail() {
    try {
        localStorage.removeItem(TRAIL_KEY);
    } catch {
        // Silently fail
    }
}

/**
 * Convenience: Log a navigation action
 */
export function logNavigate(to: string) {
    logAction({ action: 'navigate', to });
}

/**
 * Convenience: Log a click action
 */
export function logClick(target: string) {
    logAction({ action: 'click', target });
}

/**
 * Convenience: Log an error
 */
export function logError(target: string) {
    logAction({ action: 'error', target });
}
