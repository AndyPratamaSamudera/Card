import React, { useState } from 'react';
import { useCosmicStore } from '../store/useCosmicStore';
import { socketService } from '../socket/socketService';
import { soundEngine } from '../audio/SynthAudioEngine';
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
      setErrorMsg(res.error || 'Failed to add AI');
    }
  };

  const handleKick = async (pid: string) => {
    await socketService.kickPlayer(pid);
  };

  const handleStartGame = async () => {
    setErrorMsg(null);
    const res = await socketService.startGame();
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to start game');
    }
  };

  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 pt-20 pb-12">
      <div className="w-full max-w-3xl bg-slate-900/90 backdrop-blur-xl border border-cyan-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-950/60">
        {/* Lobby Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-800 pb-5 mb-6 gap-4">
          <div>
            <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest">STATION LOBBY</div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">ARENA DISPATCH ROOM</h2>
          </div>

          {/* Room Code Card */}
          <div className="flex items-center space-x-2 bg-slate-950 border border-cyan-500/50 px-4 py-2 rounded-xl">
            <span className="text-xs text-slate-400 font-mono">CODE:</span>
            <span className="text-xl font-black text-cyan-300 font-mono tracking-wider">{room.code}</span>
            <button
              onClick={handleCopyLink}
              className="ml-2 p-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-400 rounded-lg transition flex items-center space-x-1"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              <span className="text-xs">{copied ? 'Copied' : 'Invite'}</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-950/80 border border-red-500/60 rounded-xl text-red-200 text-xs font-mono">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Players Grid (Up to 8 slots) */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3 text-xs font-mono text-slate-400">
            <span>SEATED GAMBLERS ({room.players.length}/{room.settings.maxPlayers})</span>
            <span>MINIMUM 2 PLAYERS</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {room.players.map((p, idx) => {
              const isMe = p.id === myPlayerId;
              return (
                <div
                  key={p.id}
                  className={`relative p-3 rounded-2xl border transition flex flex-col justify-between ${
                    p.isReady || p.isHost
                      ? 'border-cyan-500/50 bg-cyan-950/20'
                      : 'border-slate-800 bg-slate-950/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-slate-500">SEAT #{idx + 1}</span>
                    <div className="flex items-center space-x-1">
                      {p.isHost && (
                        <span className="flex items-center space-x-0.5 text-[10px] bg-amber-500/20 border border-amber-500/40 text-amber-300 px-1.5 py-0.5 rounded-full font-bold">
                          <Crown className="w-3 h-3 text-amber-400" />
                          <span>HOST</span>
                        </span>
                      )}
                      {p.isAI && (
                        <span className="flex items-center space-x-0.5 text-[10px] bg-purple-500/20 border border-purple-500/40 text-purple-300 px-1.5 py-0.5 rounded-full font-bold">
                          <Bot className="w-3 h-3 text-purple-400" />
                          <span>BOT</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="my-2">
                    <div className="font-bold text-sm text-white flex items-center space-x-1">
                      <span className="truncate">{p.username}</span>
                      {isMe && <span className="text-xs text-cyan-400 font-mono">(You)</span>}
                    </div>
                    <div className="text-[11px] text-slate-400 capitalize">
                      {p.avatarId.replace('alien_', '')}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <div className="flex items-center space-x-1">
                      {p.isHost || p.isReady ? (
                        <span className="flex items-center space-x-1 text-xs text-green-400 font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>READY</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 text-xs text-slate-500 font-mono">
                          <Circle className="w-3.5 h-3.5" />
                          <span>WAITING</span>
                        </span>
                      )}
                    </div>

                    {isHost && !p.isHost && (
                      <button
                        onClick={() => handleKick(p.id)}
                        title="Kick player"
                        className="text-slate-500 hover:text-red-400 p-1 transition"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Empty Seat placeholders */}
            {Array.from({ length: Math.max(0, 4 - room.players.length) }).map((_, i) => (
              <div
                key={`empty_${i}`}
                className="p-4 rounded-2xl border border-dashed border-slate-800 bg-slate-950/20 flex flex-col items-center justify-center text-slate-600 text-xs font-mono"
              >
                <Users className="w-6 h-6 mb-1 opacity-40" />
                <span>OPEN SEAT</span>
              </div>
            ))}
          </div>
        </div>

        {/* Host Controls: Add AI Bot */}
        {isHost && room.players.length < room.settings.maxPlayers && (
          <div className="mb-6 p-4 bg-slate-950/60 border border-purple-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <Bot className="w-5 h-5 text-purple-400" />
              <div>
                <div className="text-sm font-bold text-white">Add Computer AI Alien</div>
                <div className="text-xs text-slate-400">Play instantly with strategic bots</div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={selectedBotDiff}
                onChange={(e) => setSelectedBotDiff(e.target.value as AIDifficulty)}
                className="bg-slate-900 border border-slate-700 text-xs font-mono text-purple-300 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400"
              >
                <option value="EASY">Difficulty: Easy</option>
                <option value="NORMAL">Difficulty: Normal</option>
                <option value="HARD">Difficulty: Hard</option>
              </select>

              <button
                onClick={handleAddAI}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-mono rounded-lg transition"
              >
                + ADD BOT
              </button>
            </div>
          </div>
        )}

        {/* Action Controls Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-800 gap-4">
          <button
            onClick={resetGameSession}
            className="text-xs font-mono text-slate-500 hover:text-slate-300 transition"
          >
            ← LEAVE LOBBY
          </button>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            {!isHost && (
              <button
                onClick={handleToggleReady}
                className={`flex-1 sm:flex-none py-3 px-6 rounded-xl font-bold text-sm tracking-wide transition font-mono ${
                  myPlayer?.isReady
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-green-600 hover:bg-green-500 text-white'
                }`}
              >
                {myPlayer?.isReady ? 'CANCEL READY' : 'READY TO PLAY'}
              </button>
            )}

            {isHost && (
              <button
                onClick={handleStartGame}
                disabled={!canStart}
                className="flex-1 sm:flex-none py-3.5 px-8 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-white font-black text-sm tracking-wider shadow-lg shadow-cyan-500/30 flex items-center justify-center space-x-2 transition"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>START PROTOCOL</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
