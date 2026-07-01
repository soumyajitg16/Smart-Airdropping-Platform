import { useState } from 'react';
import { formatUnits } from 'viem';
import { useAccount, useBalance, useConnect, useDisconnect } from 'wagmi';

export const useWalletSession = () => {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  const { data: balanceData } = useBalance({
    address,
    query: {
      enabled: !!address,
    },
  });

  const rawBalanceFloatString = balanceData
    ? formatUnits(balanceData.value, balanceData.decimals)
    : '0';

  const wallet = {
    isConnected: !!isConnected,
    address: address || null,
    network: chain?.name || null,
    chainId: chain?.id || null,
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

  return {
    wallet,
    balanceData,
    connectWallet,
    disconnectWallet,
    isWalletModalOpen,
    setIsWalletModalOpen,
  };
};
