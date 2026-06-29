const SESSION_AIRDROPS_STORAGE_KEY = 'airdrops_session_data';
const LEGACY_AIRDROPS_STORAGE_KEY = 'airdrops_data';
const CAMPAIGNS_API_URL =
  import.meta.env.VITE_CAMPAIGNS_API_URL || '/api/campaigns';

const hasSessionStorage = () =>
  typeof window !== 'undefined' && window.sessionStorage;

const normalizeCampaigns = (campaigns) => (Array.isArray(campaigns) ? campaigns : []);

export const clearLegacyPersistentCampaigns = () => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.removeItem(LEGACY_AIRDROPS_STORAGE_KEY);
};

export const readSessionCampaigns = () => {
  if (!hasSessionStorage()) return null;

  const saved = window.sessionStorage.getItem(SESSION_AIRDROPS_STORAGE_KEY);
  if (!saved) return null;

  try {
    return normalizeCampaigns(JSON.parse(saved));
  } catch (err) {
    console.warn('Unable to parse session campaign cache.', err);
    return null;
  }
};

export const writeSessionCampaigns = (campaigns) => {
  if (!hasSessionStorage()) return;
  window.sessionStorage.setItem(
    SESSION_AIRDROPS_STORAGE_KEY,
    JSON.stringify(normalizeCampaigns(campaigns)),
  );
};

const requestCampaignsApi = async (options = {}) => {
  const response = await fetch(CAMPAIGNS_API_URL, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || 'Campaign API request failed.');
  }

  return response.json();
};

export const loadCampaigns = async () => {
  clearLegacyPersistentCampaigns();

  try {
    const remoteData = await requestCampaignsApi();
    const remoteCampaigns = normalizeCampaigns(remoteData.campaigns);
    writeSessionCampaigns(remoteCampaigns);
    return { campaigns: remoteCampaigns, source: 'mongodb' };
  } catch (err) {
    console.warn('MongoDB campaign sync is unavailable. Using session cache only.', err);
  }

  const campaigns = readSessionCampaigns() || [];
  return {
    campaigns,
    source: 'session',
  };
};

export const saveRemoteCampaigns = async (campaigns) => {
  const data = await requestCampaignsApi({
    method: 'PUT',
    body: JSON.stringify({ campaigns: normalizeCampaigns(campaigns) }),
  });

  return normalizeCampaigns(data.campaigns);
};

export const saveCampaigns = async (campaigns) => {
  const normalizedCampaigns = normalizeCampaigns(campaigns);
  writeSessionCampaigns(normalizedCampaigns);
  await saveRemoteCampaigns(normalizedCampaigns);
  return normalizedCampaigns;
};
