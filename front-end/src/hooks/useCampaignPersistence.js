import { useCallback, useEffect, useRef, useState } from 'react';
import { loadCampaigns, saveCampaigns } from '../services/campaignStore';

export const useCampaignPersistence = () => {
  const hasHydratedCampaigns = useRef(false);
  const latestPersistRequestId = useRef(0);
  const [airdrops, setAirdrops] = useState([]);
  const [campaignStorageStatus, setCampaignStorageStatus] = useState('loading');

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

  const updateAirdropStatus = useCallback((id, newStatus) => {
    setAirdrops((prev) =>
      prev.map((drop) =>
        drop.id === id && drop.status !== newStatus
          ? { ...drop, status: newStatus }
          : drop,
      ),
    );
  }, []);

  const markAirdropClaimed = useCallback((id, claimantAddress) => {
    if (!id || !claimantAddress) return;

    const normalizedClaimant = claimantAddress.toLowerCase();

    setAirdrops((prev) =>
      prev.map((drop) => {
        if (drop.id !== id) return drop;

        const recipientAddresses = new Set(
          (drop.recipients || [])
            .map((recipient) => recipient.address?.toLowerCase())
            .filter(Boolean),
        );

        const claimedRecipients = new Set(
          (drop.claimedRecipients || [])
            .map((address) => String(address).toLowerCase())
            .filter(Boolean),
        );

        if (recipientAddresses.has(normalizedClaimant)) {
          claimedRecipients.add(normalizedClaimant);
        }

        const isFullyClaimed =
          recipientAddresses.size > 0 &&
          Array.from(recipientAddresses).every((address) =>
            claimedRecipients.has(address),
          );

        return {
          ...drop,
          claimedRecipients: Array.from(claimedRecipients),
          status: isFullyClaimed ? 'Completed' : drop.status,
        };
      }),
    );
  }, []);

  return {
    airdrops,
    setAirdrops,
    updateAirdropStatus,
    markAirdropClaimed,
    campaignStorageStatus,
  };
};
