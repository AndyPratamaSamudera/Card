import React, { useState } from 'react';
import { useCosmicStore } from '../store/useCosmicStore';
import { socketService } from '../socket/socketService';
import { AIDifficulty } from '@cosmic/shared';
import { Crown, CheckCircle2, Circle, Bot, UserX, Play, Copy, Check, Users } from 'lucide-react';

export const LobbyView: React.FC = () => {
  const { room, myPlayerId, resetGameSession } = useCosmicStore();
  const [copied, setCopied] = useState(false);
  const [selectedBotDiff, setSelectedBotDiff] = useState<AIDifficulty>('NORMAL');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!room) return null;

  const myPlayer = room.players.find(p => p.id === myPlayerId);
  const isHost = myPlayer?.isHost || false;
  const canStart = room.players.length >= 2 && room.players.every(p => p.isHost || p.isReady);

  const handleCopyLink = () => {
    const url = `${window.location.origin}?room=${room.code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleReady = async () => {
    await socketService.toggleReady();
  };

  const handleAddAI = async () => {
    setErrorMsg(null);
    const res = await socketService.addAI(selectedBotDiff);
    if (!res.success) {
      setErrorMsg(res.error || 'Gagal menambahkan Bot');
    }
  };

  const handleKick = async (pid: string) => {
    await socketService.kickPlayer(pid);
  };

  const handleStartGame = async () => {
    setErrorMsg(null);
    const res = await socketService.startGame();
    if (!res.success) {
      setErrorMsg(res.error || 'Gagal memulai game');
    }
  };

  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 pt-20 pb-12 card-suits-pattern">
      <div className="w-full max-w-2xl bg-[#141820] border border-slate-700/80 rounded-2xl p-6 sm:p-7 shadow-xl">
        {/* Lobby Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-800 pb-4 mb-5 gap-3">
          <div>
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">RUANG TUNGGU POKER</div>
            <h2 className="text-xl sm:text-2xl font-black text-white">ARENA CARD TABLE</h2>
          </div>

          {/* Room Code Card */}
          <div className="flex items-center space-x-2 bg-[#0e1117] border border-slate-700 px-3 py-1.5 rounded-lg">
            <span className="text-xs text-slate-400 font-mono">KODE:</span>
            <span className="text-base font-bold text-amber-300 font-mono tracking-wider">{room.code}</span>
            <button
              onClick={handleCopyLink}
              className="ml-1 p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition flex items-center space-x-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="text-[10px]">{copied ? 'Tersalin' : 'Undang'}</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-2.5 bg-red-950/80 border border-red-500 rounded-lg text-red-200 text-xs font-mono">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Players Grid (Up to 8 slots) */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2.5 text-xs font-mono text-slate-400">
            <span>PEMAIN DI MEJA ({room.players.length}/{room.settings.maxPlayers})</span>
            <span>MINIMAL 2 PEMAIN</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {room.players.map((p, idx) => {
              const isMe = p.id === myPlayerId;
              return (
                <div
                  key={p.id}
                  className={`p-3 rounded-lg border flex items-center justify-between ${
                    p.isReady || p.isHost
                      ? 'border-emerald-600/40 bg-emerald-950/10'
                      : 'border-slate-800 bg-[#0e1117]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded bg-slate-800 border border-slate-700 flex items-center justify-center font-mono text-xs font-bold text-slate-300">
                      #{idx + 1}
                    </div>

                    <div>
                      <div className="font-bold text-xs text-white flex items-center space-x-1">
                        <span>{p.username}</span>
                        {isMe && <span className="text-[10px] text-emerald-400 font-mono">(Kamu)</span>}
                      </div>

                      <div className="flex items-center space-x-1.5 mt-0.5">
                        {p.isHost && (
                          <span className="flex items-center space-x-0.5 text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-bold">
                            <Crown className="w-2.5 h-2.5 mr-0.5" /> HOST
                          </span>
                        )}
                        {p.isAI && (
                          <span className="flex items-center space-x-0.5 text-[9px] bg-purple-500/20 text-purple-300 px-1 py-0.2 rounded font-bold">
                            <Bot className="w-2.5 h-2.5 mr-0.5" /> BOT
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {p.isHost || p.isReady ? (
                      <span className="flex items-center space-x-1 text-xs text-emerald-400 font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>SIAP</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-xs text-slate-500 font-mono">
                        <Circle className="w-3.5 h-3.5" />
                        <span>MENUNGGU</span>
                      </span>
                    )}

                    {isHost && !p.isHost && (
                      <button
                        onClick={() => handleKick(p.id)}
                        title="Keluarkan pemain"
                        className="text-slate-500 hover:text-red-400 p-1 transition"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Host Controls: Add AI Bot */}
        {isHost && room.players.length < room.settings.maxPlayers && (
          <div className="mb-5 p-3 bg-[#0e1117] border border-slate-700 rounded-lg flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Bot className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-slate-300">Tambah AI Bot Lawan</span>
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={selectedBotDiff}
                onChange={(e) => setSelectedBotDiff(e.target.value as AIDifficulty)}
                className="bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 rounded px-2.5 py-1 focus:outline-none"
              >
                <option value="EASY">Mudah</option>
                <option value="NORMAL">Normal</option>
                <option value="HARD">Sulit</option>
              </select>

              <button
                onClick={handleAddAI}
                className="px-3 py-1 bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold rounded transition"
              >
                + TAMBAH BOT
              </button>
            </div>
          </div>
        )}

        {/* Action Controls Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            onClick={resetGameSession}
            className="text-xs font-mono text-slate-400 hover:text-white transition"
          >
            ← KELUAR LOBBY
          </button>

          <div className="flex items-center space-x-2">
            {!isHost && (
              <button
                onClick={handleToggleReady}
                className={`py-2 px-4 rounded-lg font-bold text-xs transition font-mono ${
                  myPlayer?.isReady
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {myPlayer?.isReady ? 'BATAL SIAP' : 'SAYA SIAP'}
              </button>
            )}

            {isHost && (
              <button
                onClick={handleStartGame}
                disabled={!canStart}
                className="py-2.5 px-6 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold text-xs tracking-wider flex items-center space-x-1.5 transition"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>MULAI PERMAINAN</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
