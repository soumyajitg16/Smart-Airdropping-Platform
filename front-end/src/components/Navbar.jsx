import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { useApp } from '../hooks/useApp';
import { Moon, Sun, Wallet } from 'lucide-react';
import WalletModal from './WalletModal';

export default function Navbar({ theme = 'dark', onToggleTheme }) {
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
    <nav className="bg-slate-950/70 border-b border-slate-900/80 text-white sticky top-0 z-40 px-4 py-2 backdrop-blur-xl sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-3">
        
        {/* Brand Logo */}
        <button
          type="button"
          className="group flex cursor-pointer items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
          onClick={() => navigate('/')}
          aria-label="Go to Multidrop home"
        >
          <img
            src={theme === 'light' ? '/logo-light.svg' : '/logo.svg'}
            alt="Multidrop"
            className="h-8 w-auto transition-opacity duration-300 group-hover:opacity-90"
          />
        </button>

        {/* Right-Aligned Navigation & Action Utilities Pack */}
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          {/* Links Shifted Right */}
          <div className="flex max-w-full space-x-1 overflow-x-auto bg-slate-900/40 p-0.5 rounded-xl border border-slate-900 shadow-inner">
            <NavLink to="/" className={navItemStyles}>Home</NavLink>
            <NavLink to="/airdrops" className={navItemStyles}>Campaigns</NavLink>
            <NavLink to="/claim" className={navItemStyles}>Claim</NavLink>
            <NavLink to="/guide" className={navItemStyles}>Guide</NavLink>
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-800/80 bg-slate-900/90 text-slate-300 shadow-sm transition-all hover:border-slate-700 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 cursor-pointer"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {theme === 'dark' ? (
              <Sun className="h-3.5 w-3.5" />
            ) : (
              <Moon className="h-3.5 w-3.5" />
            )}
          </button>

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
