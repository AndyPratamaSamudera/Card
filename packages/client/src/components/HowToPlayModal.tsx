import React from 'react';
import { X, HelpCircle } from 'lucide-react';
import { SPECIAL_CARDS_BLUEPRINTS, SpecialCardId } from '@cosmic/shared';

interface HowToPlayModalProps {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto bg-[#141820] border border-slate-700 rounded-xl p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
          <div className="flex items-center space-x-2">
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <h3 className="text-base font-bold text-white">ATURAN PERMAINAN</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Core Rules */}
        <div className="space-y-3 text-xs text-slate-300 mb-5">
          <div className="p-3 bg-[#0e1117] border border-slate-800 rounded-lg">
            <h4 className="font-bold text-emerald-400 text-xs mb-1">1. Aturan Meja & Akumulasi Angka</h4>
            <p>
              Pemain bergantian memainkan kartu angka (+1 hingga +10) ke tengah meja. Setiap putaran memiliki batas angka maksimal (**Overload Limit**, misal: 35).
            </p>
          </div>

          <div className="p-3 bg-[#0e1117] border border-slate-800 rounded-lg">
            <h4 className="font-bold text-amber-400 text-xs mb-1">2. Penalti Overload & Eliminasi</h4>
            <p>
              Pemain yang menyebabkan total angka di tengah meja **melewati batas limit** akan menerima 1 penalti (**Overload Strike**).
            </p>
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-400 font-mono text-[11px]">
              <li>Maksimal 3 penalti sebelum tereliminasi dari meja.</li>
              <li>Pemain terakhir yang bertahan dinyatakan sebagai pemenang!</li>
            </ul>
          </div>
        </div>

        {/* 14 Special Cards */}
        <h4 className="font-mono text-xs uppercase tracking-wider text-slate-400 mb-2">
          14 Jenis Kartu Spesial
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
          {(Object.keys(SPECIAL_CARDS_BLUEPRINTS) as SpecialCardId[]).map((spcId) => {
            const card = SPECIAL_CARDS_BLUEPRINTS[spcId];
            return (
              <div
                key={spcId}
                className="p-2 rounded border border-slate-800 bg-[#0e1117] flex items-start space-x-2 text-left"
              >
                <div className="w-5 h-5 rounded bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[10px] text-amber-400 shrink-0">
                  ★
                </div>
                <div>
                  <div className="font-bold text-white text-[11px]">
                    {card.name}
                  </div>
                  <div className="text-[10px] text-slate-400 leading-tight">
                    {card.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg transition"
          >
            TUTUP & MAIN
          </button>
        </div>
      </div>
    </div>
  );
};
