import React, { useState, useEffect } from 'react';
import { AlienAvatarId } from '@cosmic/shared';
import { socketService } from '../socket/socketService';
import { useCosmicStore } from '../store/useCosmicStore';
import { soundEngine } from '../audio/SynthAudioEngine';
import { Users, Bot, ArrowRight } from 'lucide-react';

interface AvatarOption {
  id: AlienAvatarId;
  name: string;
  species: string;
  desc: string;
  suit: string;
}

const AVATARS: AvatarOption[] = [
  {
    id: 'alien_zorblax',
    name: 'Zorblax',
    species: 'Slime Gambler',
    desc: 'Alien bermata satu yang gugup jika angka core melonjak.',
    suit: '♠'
  },
  {
    id: 'alien_vex',
    name: 'Vex',
    species: 'Cyber-Mantis',
    desc: 'Android dingin yang menghitung peluang kartu secara presisi.',
    suit: '♦'
  },
  {
    id: 'alien_blobbo',
    name: 'Blobbo',
    species: 'Puffer Beast',
    desc: 'Alien bulat yang membengkak jika terkena penalti Overload.',
    suit: '♣'
  },
  {
    id: 'alien_nebula',
    name: 'Nebula',
    species: 'Star Sorceress',
    desc: 'Entitas kosmik yang ahli memakai kartu spesial sabotase.',
    suit: '♥'
  }
];

export const MainMenu: React.FC = () => {
  const { username: storeUsername, avatarId: storeAvatarId, setUserProfile } = useCosmicStore();
  const [username, setUsername] = useState(storeUsername);
  const [selectedAvatar, setSelectedAvatar] = useState<AlienAvatarId>(storeAvatarId);
  const [joinCode, setJoinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('room');
    if (codeParam) {
      setJoinCode(codeParam.toUpperCase());
    }
  }, []);

  const handleCreateRoom = async () => {
    if (!username.trim()) return setErrorMsg('Masukkan nama pemainmu terlebih dahulu');
    setErrorMsg(null);
    setIsLoading(true);
    soundEngine.startCosmicAmbience();

    setUserProfile(username.trim(), selectedAvatar);
    const res = await socketService.createRoom(username.trim(), selectedAvatar);
    setIsLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Gagal membuat room');
    }
  };

  const handleJoinRoom = async () => {
    if (!username.trim()) return setErrorMsg('Masukkan nama pemainmu terlebih dahulu');
    if (!joinCode.trim()) return setErrorMsg('Masukkan kode room');
    setErrorMsg(null);
    setIsLoading(true);
    soundEngine.startCosmicAmbience();

    setUserProfile(username.trim(), selectedAvatar);
    const res = await socketService.joinRoom(joinCode.trim().toUpperCase(), username.trim(), selectedAvatar);
    setIsLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Gagal bergabung ke room');
    }
  };

  const handleQuickPlayBots = async () => {
    if (!username.trim()) return setErrorMsg('Masukkan nama pemainmu terlebih dahulu');
    setErrorMsg(null);
    setIsLoading(true);
    soundEngine.startCosmicAmbience();

    setUserProfile(username.trim(), selectedAvatar);
    const res = await socketService.createRoom(username.trim(), selectedAvatar);
    if (res.success && res.room) {
      await socketService.addAI('NORMAL');
      await socketService.addAI('HARD');
      await socketService.startGame();
    } else {
      setErrorMsg(res.error || 'Gagal memulai pertandingan vs bot');
    }
    setIsLoading(false);
  };

  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 pt-16 pb-12 card-suits-pattern">
      {/* Hero Header */}
      <div className="text-center max-w-xl mb-6">
        <div className="inline-flex items-center space-x-2 px-3 py-1 mb-2 rounded bg-[#171c26] border border-slate-700 text-slate-300 text-xs font-mono">
          <span>♠ ♥ CLASSIC POKER TABLETOP ARENA ♦ ♣</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
          COSMIC CARD ARENA
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Atur strategi angka di meja poker klasik, gunakan 14 kartu spesial, dan hindari Overload limit!
        </p>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-lg bg-[#141820] border border-slate-700/80 rounded-2xl p-6 shadow-xl">
        {errorMsg && (
          <div className="mb-4 p-2.5 bg-red-950/80 border border-red-500 rounded-lg text-red-200 text-xs font-mono">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Username Input */}
        <div className="mb-5">
          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
            Nama Pemain / Codename
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={18}
            placeholder="e.g. Claude"
            className="w-full px-3.5 py-2.5 bg-[#0e1117] border border-slate-700 focus:border-amber-400 rounded-lg text-white placeholder-slate-600 focus:outline-none font-mono text-sm transition"
          />
        </div>

        {/* Avatar Selector */}
        <div className="mb-6">
          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
            Pilih Karakter
          </label>
          <div className="grid grid-cols-2 gap-2.5">
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
                  className={`p-2.5 rounded-lg border text-left transition flex items-center space-x-2.5 ${
                    isSelected
                      ? 'border-amber-400 bg-amber-950/20 ring-1 ring-amber-400'
                      : 'border-slate-800 bg-[#0e1117] hover:border-slate-700'
                  }`}
                >
                  <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center font-serif text-sm font-bold text-amber-300">
                    {av.suit}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white">{av.name}</div>
                    <div className="text-[10px] text-slate-400">{av.species}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {/* Quick Play vs Bots */}
          <button
            onClick={handleQuickPlayBots}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm tracking-wide shadow flex items-center justify-center space-x-2 transition disabled:opacity-50"
          >
            <Bot className="w-4 h-4" />
            <span>MAIN INSTAN VS BOTS</span>
          </button>

          {/* Create Multiplayer Room */}
          <button
            onClick={handleCreateRoom}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold text-sm tracking-wide flex items-center justify-center space-x-2 transition disabled:opacity-50"
          >
            <Users className="w-4 h-4 text-slate-300" />
            <span>BUAT ROOM MULTIPLAYER</span>
          </button>

          {/* Join with Code */}
          <div className="pt-2 flex items-center space-x-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="KODE ROOM (e.g. CC-4X9B)"
              className="flex-1 px-3 py-2.5 bg-[#0e1117] border border-slate-700 focus:border-amber-400 rounded-lg text-white placeholder-slate-600 focus:outline-none font-mono text-xs uppercase transition"
            />
            <button
              onClick={handleJoinRoom}
              disabled={isLoading}
              className="py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-slate-600 transition flex items-center space-x-1"
            >
              <span>JOIN</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
