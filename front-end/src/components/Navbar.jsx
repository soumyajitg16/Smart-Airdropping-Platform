import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { useApp } from '../hooks/useApp';
import { Wallet } from 'lucide-react';
import WalletModal from './WalletModal';

export default function Navbar() {
  const { wallet, connectWallet } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const navItemStyles = ({ isActive }) =>
    `px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 tracking-wide ${
      isActive 
        ? 'bg-slate-800/80 text-white shadow-sm ring-1 ring-slate-700/50' 
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
    }`;

  return (
    <nav className="bg-slate-950/70 border-b border-slate-900/80 text-white sticky top-0 z-40 px-6 py-2 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        
        {/* Streamlined Text Logo */}
        <div className="cursor-pointer group" onClick={() => navigate('/')}>
          <span className="font-bold text-sm tracking-wider bg-linear-to-r from-slate-100 to-indigo-300 bg-clip-text text-transparent uppercase">
            MULTIDROP
          </span>
        </div>

        {/* Right-Aligned Navigation & Action Utilities Pack */}
        <div className="flex items-center space-x-4">
          {/* Links Shifted Right */}
          <div className="flex space-x-1 bg-slate-900/40 p-0.5 rounded-xl border border-slate-900 shadow-inner">
            <NavLink to="/" className={navItemStyles}>Home</NavLink>
            <NavLink to="/airdrops" className={navItemStyles}>Campaigns</NavLink>
            <NavLink to="/claim" className={navItemStyles}>Claim</NavLink>
          </div>

          {/* Wallet Execution Trigger */}
          <div className="relative">
            {wallet.isConnected ? (
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center space-x-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-800/80 px-3 py-1.5 rounded-lg text-[11px] font-mono tracking-tight transition-all cursor-pointer"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)] animate-pulse" />
                <span className="text-slate-300">{`${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`}</span>
              </button>
            ) : (
              <button
                onClick={connectWallet}
                className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shadow-md shadow-indigo-600/10 active:scale-98 cursor-pointer"
              >
                <Wallet className="h-3.5 w-3.5 opacity-90" />
                <span>Connect</span>
              </button>
            )}

            {/* Pass state handlers to display the network/balance dropdown correctly */}
            <WalletModal 
              isOpen={isModalOpen} 
              onClose={() => setIsModalOpen(false)} 
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
