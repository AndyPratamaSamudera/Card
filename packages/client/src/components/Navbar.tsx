import React, { useState } from 'react';
import { Volume2, VolumeX, Copy, Check, Radio, HelpCircle, Layers, Box } from 'lucide-react';
import { useCosmicStore } from '../store/useCosmicStore';

interface NavbarProps {
  onOpenHowToPlay: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenHowToPlay }) => {
  const { room, audioMuted, toggleAudio, connectionStatus, viewMode, toggleViewMode, currentView } = useCosmicStore();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (!room) return;
    const url = `${window.location.origin}?room=${room.code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-cosmic-dark/80 backdrop-blur-md border-b border-cyan-900/40">
      {/* Brand Logo */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-pink-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
          <Radio className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div>
          <h1 className="text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-400 to-amber-300">
            COSMIC CHAOS
          </h1>
          <p className="text-[10px] text-cyan-400/80 font-mono tracking-widest uppercase">
            Card Arena
          </p>
        </div>
      </div>

      {/* Room Badge & Invite Link */}
      {room && (
        <div className="flex items-center space-x-2 bg-slate-900/90 border border-cyan-500/40 px-3 py-1.5 rounded-full shadow-inner">
          <span className="text-xs text-slate-400 font-mono">ROOM:</span>
          <span className="text-sm font-black text-cyan-300 tracking-wider font-mono">{room.code}</span>
          <button
            onClick={handleCopyLink}
            title="Copy invitation link"
            className="p-1 hover:bg-cyan-500/20 text-cyan-400 rounded-full transition-colors flex items-center space-x-1"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="text-[10px] hidden sm:inline">{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>
        </div>
      )}

      {/* Controls & Connection Status */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* 2D / 3D View Toggle (Only in Game) */}
        {currentView === 'GAME' && (
          <button
            onClick={toggleViewMode}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-300 hover:border-cyan-400 hover:bg-cyan-950/40 text-xs font-mono font-bold transition shadow-sm"
            title={`Switch to ${viewMode === '2D' ? '3D' : '2D'} View`}
          >
            {viewMode === '2D' ? (
              <>
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>2D POKER</span>
              </>
            ) : (
              <>
                <Box className="w-3.5 h-3.5 text-pink-400" />
                <span>3D ARENA</span>
              </>
            )}
          </button>
        )}

        <button
          onClick={onOpenHowToPlay}
          className="p-2 rounded-full hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition"
          title="How to Play"
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        <button
          onClick={toggleAudio}
          className="p-2 rounded-full hover:bg-slate-800 text-slate-300 hover:text-pink-400 transition"
          title={audioMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {audioMuted ? <VolumeX className="w-5 h-5 text-slate-500" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
        </button>

        {/* Connection status indicator */}
        <div className="flex items-center space-x-1.5 text-xs font-mono">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              connectionStatus === 'CONNECTED'
                ? 'bg-green-400 shadow-[0_0_8px_#22c55e]'
                : connectionStatus === 'CONNECTING'
                ? 'bg-amber-400 animate-ping'
                : 'bg-red-500'
            }`}
          />
          <span className="hidden md:inline text-[11px] text-slate-400">
            {connectionStatus === 'CONNECTED' ? 'ONLINE' : connectionStatus}
          </span>
        </div>
      </div>
    </header>
  );
};
