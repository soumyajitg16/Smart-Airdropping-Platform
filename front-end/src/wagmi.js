import { http, createConfig } from 'wagmi';
import { mainnet, polygonAmoy, anvil } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

const transport = (url) => (url ? http(url) : http());
const includeAnvil =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_ANVIL === 'true';

const chains = includeAnvil ? [anvil, polygonAmoy, mainnet] : [polygonAmoy, mainnet];

export const config = createConfig({
  chains,
  connectors: [
    injected() 
  ],
  transports: {
    [anvil.id]: transport(import.meta.env.VITE_ANVIL_RPC_URL || 'http://127.0.0.1:8545'),
    [polygonAmoy.id]: transport(import.meta.env.VITE_AMOY_RPC_URL),
    [mainnet.id]: transport(import.meta.env.VITE_MAINNET_RPC_URL),
  },
});
