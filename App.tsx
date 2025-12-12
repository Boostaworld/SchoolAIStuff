
import React, { useEffect, useState } from 'react';
import { Dashboard } from './components/Dashboard/Dashboard';
import { LoginScreen } from './components/Auth/LoginScreen';
import { useOrbitStore } from './store/useOrbitStore';
import { ToastProvider } from './components/Shared/ToastManager';
import { MessageToast } from './components/Social/MessageToast';
import { PersistentMessageBanner } from './components/Social/PersistentMessageBanner';
import { ErrorBoundary } from './components/Shared/ErrorBoundary';
import { ThemedAnnouncementBanner } from './components/Announcements/ThemedAnnouncementBanner';
import { ThemedChangelogModal } from './components/Announcements/ThemedChangelogModal';

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

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isAuthLoading) {
    return (
      <div className="w-full h-screen bg-slate-950 flex items-center justify-center text-slate-600 font-mono text-xs">
        INITIALIZING ORBIT PROTOCOLS...
      </div>
    )
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

      {/* Announcement System */}
      {isAuthenticated && (
        <>
          <ThemedAnnouncementBanner />
          <ThemedChangelogModal />
        </>
      )}

      <ErrorBoundary>
        {isAuthenticated ? <Dashboard /> : <LoginScreen />}
      </ErrorBoundary>
    </ToastProvider>
  );
}

export default App;
