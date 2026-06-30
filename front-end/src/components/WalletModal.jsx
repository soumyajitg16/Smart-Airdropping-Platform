import React from 'react';
import { LogOut, Activity, Coins } from 'lucide-react';
import { useApp } from '../hooks/useApp';

export default function WalletModal({ isOpen, onClose }) {
  const { disconnectWallet, wallet, balanceData } = useApp();

  if (!isOpen) return null;

  const handleDisconnect = () => {
    if (disconnectWallet) disconnectWallet();
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-950/20 z-40 transition-all cursor-default animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Dropdown (Anchored to the right side under the Navbar button) */}
      <div className="absolute right-0 top-[calc(100%+12px)] w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in text-left">
        <div className="p-4 space-y-4">
          {/* Network Field */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Activity className="h-4 w-4 text-indigo-400" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">
                Network
              </div>
              <div className="text-sm font-semibold text-slate-200">
                {wallet.network || "Unknown Network"}
              </div>
            </div>
          </div>

          {/* Balance Field */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Coins className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">
                Balance
              </div>
              <div className="text-sm font-mono font-semibold text-slate-200">
                {!wallet?.isConnected
                  ? "0.000 ETH"
                  : `${wallet.balance} `}
              </div>
            </div>
          </div>
        </div>

        {/* Disconnect Action */}
        <div className="border-t border-slate-800 p-2 bg-slate-950/50">
          <button
            onClick={handleDisconnect}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Disconnect
          </button>
        </div>
      </div>
    </>
  );
}
