// Lightweight toast notification utility
// Creates DOM-based toasts without requiring React context

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
    description?: string;
    duration?: number;
}

// Get or create the toast container
function getToastContainer(): HTMLDivElement {
    let container = document.getElementById('toast-container') as HTMLDivElement;
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            gap: 8px;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }
    return container;
}

// Color schemes for different toast types
const TOAST_STYLES: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
    success: {
        bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.2))',
        border: 'rgba(16, 185, 129, 0.5)',
        text: '#34d399',
        icon: '✓'
    },
    error: {
        bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(185, 28, 28, 0.2))',
        border: 'rgba(239, 68, 68, 0.5)',
        text: '#f87171',
        icon: '✕'
    },
    warning: {
        bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.2))',
        border: 'rgba(245, 158, 11, 0.5)',
        text: '#fbbf24',
        icon: '⚠'
    },
    info: {
        bg: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(8, 145, 178, 0.2))',
        border: 'rgba(6, 182, 212, 0.5)',
        text: '#22d3ee',
        icon: 'ℹ'
    }
};

function showToast(message: string, options?: ToastOptions & { type?: ToastType }) {
    if (typeof document === 'undefined') return; // SSR guard

    const type = options?.type || 'info';
    const duration = options?.duration || 4000;
    const styles = TOAST_STYLES[type];

    const container = getToastContainer();

    // Create toast element
    const toast = document.createElement('div');
    toast.style.cssText = `
        background: ${styles.bg};
        backdrop-filter: blur(12px);
        border: 1px solid ${styles.border};
        border-radius: 12px;
        padding: 12px 16px;
        min-width: 280px;
        max-width: 400px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        pointer-events: auto;
        cursor: pointer;
        transform: translateX(120%);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
        font-family: 'Inter', system-ui, sans-serif;
    `;

    toast.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 12px;">
            <div style="
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: ${styles.border};
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                flex-shrink: 0;
                color: white;
            ">${styles.icon}</div>
            <div style="flex: 1;">
                <div style="
                    font-size: 13px;
                    font-weight: 600;
                    color: ${styles.text};
                    margin-bottom: ${options?.description ? '4px' : '0'};
                ">${escapeHtml(message)}</div>
                ${options?.description ? `
                    <div style="
                        font-size: 12px;
                        color: rgba(148, 163, 184, 0.9);
                    ">${escapeHtml(options.description)}</div>
                ` : ''}
            </div>
        </div>
    `;

    // Click to dismiss
    toast.addEventListener('click', () => dismissToast(toast));

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0)';
    });

    // Auto dismiss
    setTimeout(() => dismissToast(toast), duration);
}

function dismissToast(toast: HTMLDivElement) {
    toast.style.transform = 'translateX(120%)';
    toast.style.opacity = '0';
    setTimeout(() => {
        toast.remove();
    }, 300);
}

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export with sonner-compatible API
export const toast = {
    success: (message: string, options?: ToastOptions) =>
        showToast(message, { ...options, type: 'success' }),
    error: (message: string, options?: ToastOptions) =>
        showToast(message, { ...options, type: 'error' }),
    info: (message: string, options?: ToastOptions) =>
        showToast(message, { ...options, type: 'info' }),
    warning: (message: string, options?: ToastOptions) =>
        showToast(message, { ...options, type: 'warning' }),
};
