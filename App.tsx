
import React, { useEffect, useState } from 'react';
import { Dashboard } from './components/Dashboard/Dashboard';
import { LoginScreen } from './components/Auth/LoginScreen';
import { RaceSpectatorView } from './components/Training/RaceSpectatorView';
import { useOrbitStore } from './store/useOrbitStore';
import { ToastProvider } from './components/Shared/ToastManager';

function App() {
  const { isAuthenticated, initialize, isAuthLoading } = useOrbitStore();
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
      {isAuthenticated ? <Dashboard /> : <LoginScreen />}
    </ToastProvider>
  );
}

export default App;
