import { useEffect } from 'react';
import { useStore } from './store/store';
import { ToastHost } from './ui/kit';
import { MenuScreen, OnlineScreen, SetupScreen, TitleScreen } from './screens/MenuScreens';
import { LobbyScreen } from './screens/LobbyScreen';
import { TableScreen } from './screens/table/TableScreen';
import { HowToPlay, SettingsModal } from './screens/Modals';
import { bootOnline } from './game/session';
import { audio } from './audio/audio';

export default function App() {
  const screen = useStore((s) => s.screen);
  const modal = useStore((s) => s.modal);
  const crt = useStore((s) => s.prefs.crt);

  useEffect(() => {
    bootOnline();
    // Browsers only allow audio after a user gesture.
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  return (
    <div className={`arcade-bg relative h-full overflow-hidden ${crt ? 'crt' : ''}`}>
      {screen === 'title' && <TitleScreen />}
      {screen === 'menu' && <MenuScreen />}
      {screen === 'setup' && <SetupScreen />}
      {screen === 'online' && <OnlineScreen />}
      {screen === 'lobby' && <LobbyScreen />}
      {screen === 'table' && <TableScreen />}
      {modal === 'howto' && <HowToPlay />}
      {modal === 'settings' && <SettingsModal />}
      <ToastHost />
    </div>
  );
}
