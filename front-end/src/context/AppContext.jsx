import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { formatUnits } from 'viem'; // Added to handle modern BigInt formatting safely
import { injected } from 'wagmi/connectors';

const AppContext = createContext();

const initialAirdrops = [
  { id: '1', name: 'Alpha Token', symbol: 'ALP', address: '0x71C9991A23a92', totalAllocation: '500,000', status: 'Active', reward: '100 ALPHA', description: 'Governance token distribution for early ecosystem liquidity providers.' },
  { id: '2', name: 'Nebula Layer', symbol: 'NBL', address: '0x3A21115bF144', totalAllocation: '1,200,000', status: 'Active', reward: '250 NBL', description: 'Community allocation pool for Layer-2 testnet validators.' },
  { id: '3', name: 'Zenith Finance', symbol: 'ZEN', address: '0xF8d22244e299', totalAllocation: '250,000', status: 'Completed', reward: '50 ZEN', description: 'Retrospective rewards for alpha platform traders.' },
];

export const AppProvider = ({ children }) => {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  
  // Guarded useBalance hook to prevent errors when disconnected
  const { data: balanceData } = useBalance({
    address,
    query: {
      enabled: !!address,
    }
  });

  const [airdrops, setAirdrops] = useState(() => {
    const saved = localStorage.getItem('airdrops_data');
    return saved ? JSON.parse(saved) : initialAirdrops;
  });
  
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('airdrops_data', JSON.stringify(airdrops));
  }, [airdrops]);

  // Modern balance parsing using formatUnits
  const rawBalanceFloatString = balanceData 
    ? formatUnits(balanceData.value, balanceData.decimals) 
    : "0";

  // Derived reactive wallet state
  const wallet = {
    isConnected: !!isConnected,
    address: address || null,
    network: chain?.name || null,
    balance: balanceData 
      ? `${parseFloat(rawBalanceFloatString).toFixed(3)} A-${balanceData.symbol}` 
      : null,
  };

  // Logs updated cleanly without string interpolation execution errors
  console.log("Wallet State:", wallet);
  console.log("Balance using, Wallet State:", wallet.balance);
  console.log("Balance Data:", balanceData);

  const connectWallet = () => {
    if (connectors.length > 0) {
      connect({ connector: connectors[0] });
      setIsWalletModalOpen(false); // Clean UX: Close modal when initialization begins
    }
  };

  const disconnectWallet = () => {
    disconnect();
    setIsWalletModalOpen(false);
  };

  return (
    <AppContext.Provider value={{
      wallet,
      balanceData, // Exposed raw balanceData directly from context to prevent staleness
      connectWallet,
      disconnectWallet,
      airdrops,
      setAirdrops,
      isWalletModalOpen,
      setIsWalletModalOpen
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);