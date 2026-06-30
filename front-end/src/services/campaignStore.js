const CAMPAIGNS_API_URL =
  import.meta.env.VITE_CAMPAIGNS_API_URL || '/api/campaigns';

const normalizeCampaigns = (campaigns) => (Array.isArray(campaigns) ? campaigns : []);

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
  const remoteData = await requestCampaignsApi();
  return {
    campaigns: normalizeCampaigns(remoteData.campaigns),
    source: 'mongodb',
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
  await saveRemoteCampaigns(normalizedCampaigns);
  return normalizedCampaigns;
};
