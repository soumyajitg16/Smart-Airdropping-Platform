import { Gift, Send } from 'lucide-react';

export const getCampaignModeLabel = (mode) =>
  mode === 'pull' ? 'Airdrop' : 'Multisend';

export const formatCampaignName = ({
  customName,
  symbol = 'TOKEN',
  mode,
  airdrops,
}) => {
  const trimmedCustomName = (customName || '').trim();
  if (trimmedCustomName) return trimmedCustomName;

  const modeLabel = getCampaignModeLabel(mode);
  const existingCampaignCount = airdrops.filter((drop) => {
    const sameSymbol = drop.symbol?.toLowerCase() === symbol.toLowerCase();
    const sameMode =
      drop.distributionMode === mode ||
      drop.name?.toLowerCase().includes(modeLabel.toLowerCase());

    return sameSymbol && sameMode;
  }).length;

  return `${symbol} • ${modeLabel} ${existingCampaignCount + 1}`;
};

export const getCampaignKind = (drop) => {
  const mode = drop.distributionMode?.toLowerCase();
  const reward = drop.reward?.toLowerCase() || '';
  const isMultisend = mode === 'push' || reward.includes('multisend');

  return isMultisend
    ? {
        label: 'Multisend',
        Icon: Send,
        className: 'bg-cyan-500/5 text-cyan-300 border-cyan-500/15',
      }
    : {
        label: 'Airdrop',
        Icon: Gift,
        className: 'bg-indigo-500/5 text-indigo-300 border-indigo-500/15',
      };
};
