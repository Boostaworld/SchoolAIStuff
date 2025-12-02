// Simple toast notification utility
// Replaces sonner dependency

type ToastType = 'success' | 'error' | 'info' | 'warning';

function showToast(message: string, options?: { description?: string; type?: ToastType }) {
    const type = options?.type || 'info';
    const fullMessage = options?.description
        ? `${message}\n${options.description}`
        : message;

    // Using browser alert for now - can be replaced with custom toast component later
    alert(`${type.toUpperCase()}: ${fullMessage}`);
}

// Export with sonner-compatible API
export const toast = {
    success: (message: string, options?: { description?: string }) =>
        showToast(message, { ...options, type: 'success' }),
    error: (message: string, options?: { description?: string }) =>
        showToast(message, { ...options, type: 'error' }),
    info: (message: string, options?: { description?: string }) =>
        showToast(message, { ...options, type: 'info' }),
    warning: (message: string, options?: { description?: string }) =>
        showToast(message, { ...options, type: 'warning' }),
};
