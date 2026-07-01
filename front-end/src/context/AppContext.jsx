import { AppContext } from './AppContextBase';
import { useCampaignPersistence } from '../hooks/useCampaignPersistence';
import { useWalletSession } from '../hooks/useWalletSession';

export const AppProvider = ({ children }) => {
  const walletSession = useWalletSession();
  const campaignPersistence = useCampaignPersistence();

  return (
    <AppContext.Provider value={{
      ...walletSession,
      ...campaignPersistence,
    }}>
      {children}
    </AppContext.Provider>
  );
};
