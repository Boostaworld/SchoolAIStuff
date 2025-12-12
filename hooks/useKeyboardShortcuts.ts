import { useEffect } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  cmd?: boolean;
  shift?: boolean;
  alt?: boolean;
  callback: () => void;
  description: string;
  category?: string;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[], enabled: boolean = true) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? event.metaKey : event.ctrlKey;
      const ctrlKey = event.ctrlKey;

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? ctrlKey : true;
        const cmdMatch = shortcut.cmd ? cmdKey : true;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        // Special handling for cmd/ctrl - if specified, require it
        const modifierMatch = shortcut.cmd || shortcut.ctrl
          ? (shortcut.cmd && cmdKey) || (shortcut.ctrl && ctrlKey)
          : true;

        if (keyMatch && modifierMatch && shiftMatch && altMatch) {
          // Don't prevent default for inputs unless it's a specific shortcut
          const target = event.target as HTMLElement;
          const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

          // Allow shortcuts in inputs for specific cases (like Cmd+K)
          if (isInput && !shortcut.cmd && !shortcut.ctrl) {
            continue;
          }

          event.preventDefault();
          event.stopPropagation();
          shortcut.callback();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
};

export const GLOBAL_SHORTCUTS: KeyboardShortcut[] = [
  // Navigation
  {
    key: '1',
    cmd: true,
    callback: () => {},
    description: 'Go to Dashboard',
    category: 'Navigation'
  },
  {
    key: '2',
    cmd: true,
    callback: () => {},
    description: 'Go to Marketplace',
    category: 'Navigation'
  },
  {
    key: '3',
    cmd: true,
    callback: () => {},
    description: 'Go to Schedule',
    category: 'Navigation'
  },
  {
    key: '4',
    cmd: true,
    callback: () => {},
    description: 'Go to User Directory',
    category: 'Navigation'
  },
  {
    key: '5',
    cmd: true,
    callback: () => {},
    description: 'Go to Online Users',
    category: 'Navigation'
  },
  {
    key: '6',
    cmd: true,
    callback: () => {},
    description: 'Go to Messages',
    category: 'Navigation'
  },
  {
    key: '7',
    cmd: true,
    callback: () => {},
    description: 'Go to AI Assistant',
    category: 'Navigation'
  },
  {
    key: '8',
    cmd: true,
    callback: () => {},
    description: 'Go to Games',
    category: 'Navigation'
  },
  {
    key: '9',
    cmd: true,
    callback: () => {},
    description: 'Go to AI Images',
    category: 'Navigation'
  },
  // Actions
  {
    key: 'n',
    cmd: true,
    callback: () => {},
    description: 'Create New Task',
    category: 'Actions'
  },
  {
    key: 'm',
    cmd: true,
    callback: () => {},
    description: 'Toggle Messages',
    category: 'Actions'
  },
  {
    key: 'k',
    cmd: true,
    callback: () => {},
    description: 'Quick Search (Coming Soon)',
    category: 'Actions'
  },
  // Help
  {
    key: '/',
    cmd: true,
    callback: () => {},
    description: 'Show Keyboard Shortcuts',
    category: 'Help'
  },
  {
    key: '?',
    shift: true,
    callback: () => {},
    description: 'Show Keyboard Shortcuts',
    category: 'Help'
  },
];
