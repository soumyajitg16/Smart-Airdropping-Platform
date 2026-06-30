import { useState, useEffect, useRef } from 'react';
import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { formatUnits } from 'viem'; 
import { loadCampaigns, saveCampaigns } from '../services/campaignStore';
import { AppContext } from './AppContextBase';

export const AppProvider = ({ children }) => {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const hasHydratedCampaigns = useRef(false);
  const latestPersistRequestId = useRef(0);
  
  const { data: balanceData } = useBalance({
    address,
    query: {
      enabled: !!address,
    }
  });

  const [airdrops, setAirdrops] = useState([]);
  const [campaignStorageStatus, setCampaignStorageStatus] = useState('loading');
  
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    loadCampaigns()
      .then(({ campaigns, source }) => {
        if (!isMounted) return;
        setAirdrops(campaigns);
        setCampaignStorageStatus(source);
        hasHydratedCampaigns.current = true;
      })
      .catch((err) => {
        console.warn('Unable to hydrate campaigns.', err);
        if (!isMounted) return;
        setCampaignStorageStatus('error');
        hasHydratedCampaigns.current = true;
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasHydratedCampaigns.current) return;

    const requestId = latestPersistRequestId.current + 1;
    latestPersistRequestId.current = requestId;

    saveCampaigns(airdrops)
      .then(() => {
        if (latestPersistRequestId.current === requestId) {
          setCampaignStorageStatus('mongodb');
        }
      })
      .catch((err) => {
        console.warn('Unable to sync campaigns to MongoDB.', err);
        if (latestPersistRequestId.current === requestId) {
          setCampaignStorageStatus('error');
        }
      });
  }, [airdrops]);

  // Global state modifier to update campaign statuses across components
  const updateAirdropStatus = (id, newStatus) => {
    setAirdrops((prev) =>
      prev.map((drop) => (drop.id === id ? { ...drop, status: newStatus } : drop))
    );
  };

  const rawBalanceFloatString = balanceData 
    ? formatUnits(balanceData.value, balanceData.decimals) 
    : "0";

  const wallet = {
    isConnected: !!isConnected,
    address: address || null,
    network: chain?.name || null,
    balance: balanceData 
      ? `${parseFloat(rawBalanceFloatString).toFixed(3)} A-${balanceData.symbol}` 
      : null,
  };

  const connectWallet = () => {
    if (connectors.length > 0) {
      connect({ connector: connectors[0] });
      setIsWalletModalOpen(false);
    }
  };

  const disconnectWallet = () => {
    disconnect();
    setIsWalletModalOpen(false);
  };

  return (
    <AppContext.Provider value={{
      wallet,
      balanceData,
      connectWallet,
      disconnectWallet,
      airdrops,
      setAirdrops,
      updateAirdropStatus, // Exposed globally
      campaignStorageStatus,
      isWalletModalOpen,
      setIsWalletModalOpen
    }}>
      {children}
    </AppContext.Provider>
  );
};
