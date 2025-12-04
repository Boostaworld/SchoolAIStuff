
import React, { useEffect, useState } from 'react';
import { Dashboard } from './components/Dashboard/Dashboard';
import { LoginScreen } from './components/Auth/LoginScreen';
import { RaceSpectatorView } from './components/Training/RaceSpectatorView';
import { useOrbitStore } from './store/useOrbitStore';
import { ToastProvider } from './components/Shared/ToastManager';
import { MessageToast } from './components/Social/MessageToast';
import { PersistentMessageBanner } from './components/Social/PersistentMessageBanner';

function App() {
  const {
    isAuthenticated,
    initialize,
    isAuthLoading,
    messageToast,
    persistentBanners,
    dismissMessageToast,
    dismissPersistentBanner,
    setActiveChannel,
    toggleCommsPanel
  } = useOrbitStore();
  const [spectatorRaceId, setSpectatorRaceId] = useState<string | null>(null);

  useEffect(() => {
    initialize();

    // Check for spectator mode in URL
    const params = new URLSearchParams(window.location.search);
    const raceId = params.get('spectate');
    if (raceId) {
      setSpectatorRaceId(raceId);
    }
  }, [initialize]);

  if (isAuthLoading) {
    return (
      <div className="w-full h-screen bg-slate-950 flex items-center justify-center text-slate-600 font-mono text-xs">
        INITIALIZING ORBIT PROTOCOLS...
      </div>
    )
  }

  // Spectator mode (no auth required)
  if (spectatorRaceId) {
    return (
      <ToastProvider>
        <RaceSpectatorView
          raceId={spectatorRaceId}
          onExit={() => {
            setSpectatorRaceId(null);
            window.history.replaceState({}, '', window.location.pathname);
          }}
        />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      {/* Message Toast Notification */}
      {messageToast && (
        <MessageToast
          isVisible={messageToast.isVisible}
          senderUsername={messageToast.senderUsername}
          senderAvatar={messageToast.senderAvatar}
          messagePreview={messageToast.messagePreview}
          onDismiss={messageToast.onDismiss}
          onClick={messageToast.onClick}
        />
      )}

      {/* Persistent Message Banners */}
      <PersistentMessageBanner
        banners={persistentBanners}
        onDismiss={dismissPersistentBanner}
        onBannerClick={(channelId) => {
          if (!isAuthenticated) return;

          // Set the active channel
          setActiveChannel(channelId);

          // Navigate to comms page using hash navigation
          window.location.hash = `comms/${channelId}`;

          // Dismiss the banner after clicking
          const banner = persistentBanners.find(b => b.channelId === channelId);
          if (banner) {
            dismissPersistentBanner(banner.id);
          }
        }}
      />

      {isAuthenticated ? <Dashboard /> : <LoginScreen />}
    </ToastProvider>
  );
}

export default App;
