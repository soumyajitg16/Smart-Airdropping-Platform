import { http, createConfig } from 'wagmi';
import { mainnet, sepolia, anvil } from 'wagmi/chains'; // 1. FIX: Imported 'anvil' in lowercase
import { injected } from 'wagmi/connectors';

export const config = createConfig({
  // 2. FIX: Changed 'anvil' to 'anvil' here
  chains: [anvil, mainnet, sepolia], 
  connectors: [
    injected() 
  ],
  transports: {
    // 3. FIX: Linked the transport object properties correctly
    [anvil.id]: http('http://127.0.0.1:8545'),
    [mainnet.id]: http('https://alchemy.com'), 
    [sepolia.id]: http('https://sepolia.org'),
  },
});
