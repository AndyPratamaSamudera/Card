import React, { useState, useEffect } from 'react';
import { AlienAvatarId } from '@cosmic/shared';
import { socketService } from '../socket/socketService';
import { useCosmicStore } from '../store/useCosmicStore';
import { soundEngine } from '../audio/SynthAudioEngine';
import { Sparkles, Users, Bot, ArrowRight } from 'lucide-react';

interface AvatarOption {
  id: AlienAvatarId;
  name: string;
  species: string;
  desc: string;
  color: string;
  bgGrad: string;
}

const AVATARS: AvatarOption[] = [
  {
    id: 'alien_zorblax',
    name: 'Zorblax',
    species: 'Slime Cyclops',
    desc: 'Gelatinous blob with a single massive eye. Jiggles violently when panicked.',
    color: '#22c55e',
    bgGrad: 'from-green-500/20 to-emerald-950/40'
  },
  {
    id: 'alien_vex',
    name: 'Vex',
    species: 'Cyber-Mantis',
    desc: 'Cold cybernetic android alien. Twitching neon antennas calculate exact odds.',
    color: '#a855f7',
    bgGrad: 'from-purple-500/20 to-indigo-950/40'
  },
  {
    id: 'alien_blobbo',
    name: 'Blobbo',
    species: 'Puffer Beast',
    desc: 'Spherical orange alien. Swells like a balloon upon neural overload.',
    color: '#f97316',
    bgGrad: 'from-orange-500/20 to-amber-950/40'
  },
  {
    id: 'alien_nebula',
    name: 'Nebula',
    species: 'Star Entity',
    desc: 'Floating cosmic sorceress radiating celestial plasma and nebulae.',
    color: '#38bdf8',
    bgGrad: 'from-cyan-500/20 to-blue-950/40'
  }
];

export const MainMenu: React.FC = () => {
  const { username: storeUsername, avatarId: storeAvatarId, setUserProfile } = useCosmicStore();
  const [username, setUsername] = useState(storeUsername);
  const [selectedAvatar, setSelectedAvatar] = useState<AlienAvatarId>(storeAvatarId);
  const [joinCode, setJoinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check URL query param ?room=CODE
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('room');
    if (codeParam) {
      setJoinCode(codeParam.toUpperCase());
    }
  }, []);

  const handleCreateRoom = async () => {
    if (!username.trim()) return setErrorMsg('Please enter your alien name');
    setErrorMsg(null);
    setIsLoading(true);
    soundEngine.startCosmicAmbience();

    setUserProfile(username.trim(), selectedAvatar);
    const res = await socketService.createRoom(username.trim(), selectedAvatar);
    setIsLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to create room');
    }
  };

  const handleJoinRoom = async () => {
    if (!username.trim()) return setErrorMsg('Please enter your alien name');
    if (!joinCode.trim()) return setErrorMsg('Please enter a room code');
    setErrorMsg(null);
    setIsLoading(true);
    soundEngine.startCosmicAmbience();

    setUserProfile(username.trim(), selectedAvatar);
    const res = await socketService.joinRoom(joinCode.trim().toUpperCase(), username.trim(), selectedAvatar);
    setIsLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to join room');
    }
  };

  const handleQuickPlayBots = async () => {
    if (!username.trim()) return setErrorMsg('Please enter your alien name');
    setErrorMsg(null);
    setIsLoading(true);
    soundEngine.startCosmicAmbience();

    setUserProfile(username.trim(), selectedAvatar);
    const res = await socketService.createRoom(username.trim(), selectedAvatar);
    if (res.success && res.room) {
      // Add 2 AI bots and start immediately!
      await socketService.addAI('NORMAL');
      await socketService.addAI('HARD');
      await socketService.startGame();
    } else {
      setErrorMsg(res.error || 'Failed to start quick match');
    }
    setIsLoading(false);
  };

  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 pt-16 pb-12">
      {/* Hero Header */}
      <div className="text-center max-w-xl mb-6">
        <div className="inline-flex items-center space-x-2 px-3 py-1 mb-3 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
          <span>ORIGINAL 3D SCI-FI CARD PARTY GAME</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white drop-shadow-[0_0_25px_rgba(6,182,212,0.6)]">
          COSMIC <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-500 to-amber-300">CHAOS</span>
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-300">
          Push the Central Core to its limit. Sabotage your rivals with 14 tactical cards.
          Trigger <span className="text-pink-400 font-bold">Neural Overload</span> before your head explodes!
        </p>
      </div>

      {/* Main Form Container */}
      <div className="w-full max-w-xl bg-slate-900/80 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-6 shadow-2xl shadow-cyan-950/50">
        {/* Error notification */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-950/80 border border-red-500/60 rounded-xl text-red-200 text-xs font-mono">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Username Input */}
        <div className="mb-6">
          <label className="block text-xs font-mono uppercase tracking-wider text-cyan-300 mb-2">
            Alien Gambler Codename
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={18}
            placeholder="e.g. Blorp-99"
            className="w-full px-4 py-3 bg-slate-950/80 border border-slate-700 focus:border-cyan-400 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 font-mono transition"
          />
        </div>

        {/* Alien Avatar Selector */}
        <div className="mb-6">
          <label className="block text-xs font-mono uppercase tracking-wider text-cyan-300 mb-2">
            Select Alien Species
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {AVATARS.map((av) => {
              const isSelected = selectedAvatar === av.id;
              return (
                <button
                  key={av.id}
                  onClick={() => {
                    setSelectedAvatar(av.id);
                    soundEngine.playCardHover();
                  }}
                  type="button"
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-950/50 ring-2 ring-cyan-400/50 shadow-lg shadow-cyan-500/20'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/50'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full mb-2 flex items-center justify-center font-bold text-xs"
                    style={{ backgroundColor: `${av.color}33`, color: av.color, border: `1px solid ${av.color}` }}
                  >
                    ●
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">{av.name}</div>
                    <div className="text-[10px] text-slate-400">{av.species}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Create Room */}
          <button
            onClick={handleCreateRoom}
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-cyan-500/30 flex items-center justify-center space-x-2 transition disabled:opacity-50"
          >
            <Users className="w-4 h-4" />
            <span>CREATE MULTIPLAYER ARENA</span>
          </button>

          {/* Quick Match with Bots */}
          <button
            onClick={handleQuickPlayBots}
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-pink-500/30 flex items-center justify-center space-x-2 transition disabled:opacity-50"
          >
            <Bot className="w-4 h-4" />
            <span>QUICK SOLO PLAY VS BOTS</span>
          </button>

          {/* Join with Code */}
          <div className="pt-2 flex items-center space-x-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ENTER ROOM CODE (e.g. CC-4X9B)"
              className="flex-1 px-4 py-3 bg-slate-950/80 border border-slate-700 focus:border-pink-500 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-pink-500/40 font-mono text-sm uppercase transition"
            />
            <button
              onClick={handleJoinRoom}
              disabled={isLoading}
              className="py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-sm border border-cyan-500/40 hover:border-cyan-400 transition flex items-center space-x-1"
            >
              <span>JOIN</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
