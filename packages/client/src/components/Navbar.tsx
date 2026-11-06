import React, { useState } from 'react';
import { Volume2, VolumeX, Copy, Check, HelpCircle, Layers, Box } from 'lucide-react';
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
    <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-2.5 bg-[#10131a] border-b border-slate-800 shadow-sm">
      {/* Brand Logo - Classic Casino Style */}
      <div className="flex items-center space-x-2.5">
        <div className="w-7 h-7 rounded bg-emerald-800 border border-emerald-600 flex items-center justify-center text-white font-serif font-black text-xs shadow-inner">
          ♠
        </div>
        <div>
          <h1 className="text-sm sm:text-base font-bold tracking-tight text-white leading-none">
            COSMIC CARD ARENA
          </h1>
          <p className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">
            Texas Overload Protocol
          </p>
        </div>
      </div>

      {/* Room Badge & Invite Link */}
      {room && (
        <div className="flex items-center space-x-2 bg-[#171c26] border border-slate-700 px-3 py-1 rounded-md shadow-sm">
          <span className="text-xs text-slate-400 font-mono">ROOM:</span>
          <span className="text-sm font-bold text-amber-300 font-mono">{room.code}</span>
          <button
            onClick={handleCopyLink}
            title="Salin tautan room"
            className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition flex items-center space-x-1"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="text-[10px] hidden sm:inline">{copied ? 'Tersalin' : 'Salin'}</span>
          </button>
        </div>
      )}

      {/* Controls & Connection Status */}
      <div className="flex items-center space-x-2">
        {/* 2D / 3D View Switcher */}
        {currentView === 'GAME' && (
          <button
            onClick={toggleViewMode}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#171c26] border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 text-xs font-mono font-medium transition"
            title={`Ganti ke mode ${viewMode === '2D' ? '3D Arena' : '2D Poker'}`}
          >
            {viewMode === '2D' ? (
              <>
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>2D POKER</span>
              </>
            ) : (
              <>
                <Box className="w-3.5 h-3.5 text-amber-400" />
                <span>3D ARENA</span>
              </>
            )}
          </button>
        )}

        <button
          onClick={onOpenHowToPlay}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
          title="Aturan Permainan"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <button
          onClick={toggleAudio}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
          title={audioMuted ? 'Aktifkan Suara' : 'Bisukan Suara'}
        >
          {audioMuted ? <VolumeX className="w-4 h-4 text-slate-600" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
        </button>

        {/* Connection status beacon */}
        <div className="flex items-center space-x-1 text-xs font-mono pl-1">
          <span
            className={`w-2 h-2 rounded-full ${
              connectionStatus === 'CONNECTED'
                ? 'bg-emerald-500'
                : connectionStatus === 'CONNECTING'
                ? 'bg-amber-400 animate-ping'
                : 'bg-red-500'
            }`}
          />
        </div>
      </div>
    </header>
  );
};
