# Multidrop Frontend

This is the React/Vite frontend for the Multidrop airdrop dApp.

## Source Layout

The frontend is organized by responsibility:

```text
src/components/   Page and UI components
src/context/      App-level React context provider
src/hooks/        Reusable React state hooks
src/layout/       Shared page shell
src/routes/       React Router route tree
src/services/     API client modules
src/utils/        Shared helpers for campaigns, Merkle proofs, recipients, and errors
```

Core airdrop business rules live outside page components:

- `utils/merkle.js` owns Merkle leaf, root, and proof generation.
- `utils/recipients.js` owns CSV parsing, recipient validation, batching, and persistence serialization.
- `utils/campaignDisplay.js` owns campaign names and type badges.
- `hooks/useCampaignPersistence.js` owns MongoDB-backed campaign hydration/sync.
- `hooks/useWalletSession.js` owns wallet connection and balance formatting.

## Campaign Storage

Campaign details are stored permanently in MongoDB through the local API server in `front-end/server/`.

The browser does not use `localStorage` or `sessionStorage` for campaign persistence.

The `/airdrops` page reads campaigns from MongoDB without requiring wallet connection and shows an `Airdrop` or `Multisend` flag for each campaign.
It defaults to all campaigns and lets users filter by status (`Active`, `Expired`, `Completed`) and type (`Airdrop`, `Multisend`).

The `/guide` page provides role-based guidance for creators and recipients, with links into the create, campaigns, and claim workflows.

Pull airdrop claim activity is also synced into campaign metadata. When the stored recipient list has fully claimed, or when the campaign detail page sees the funded token balance at zero, the campaign status is persisted as `Completed`.

## Local Setup

Create `front-end/.env` from `.env.example`:

```text
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=multidrop
MONGODB_CAMPAIGNS_COLLECTION=campaigns
API_PORT=5050
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:5173
VITE_API_PROXY_TARGET=http://localhost:5050
VITE_CAMPAIGNS_API_URL=/api/campaigns
VITE_FACTORY_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
VITE_PUSH_AIRDROP_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
VITE_TEST_TOKEN_ADDRESS=0x8464135c8F25Da09e49BC8782676a84730C318bC
VITE_ANVIL_RPC_URL=http://127.0.0.1:8545
VITE_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
VITE_MAINNET_RPC_URL=
VITE_ENABLE_ANVIL=true
```

Start the API:

```shell
npm run api
```

The API creates `multidrop -> campaigns` on startup if it does not already exist.

Start the frontend in another terminal:

```shell
npm run dev
```

For a fresh local Anvil deployment using the default `contracts/.env`
accounts, use `VITE_TEST_TOKEN_ADDRESS` as the token address when creating an
airdrop. Do not use `VITE_FACTORY_ADDRESS` or `VITE_PUSH_AIRDROP_ADDRESS` in the
token field; those are spender/distribution contracts.

## Production Deployment

Deploy the frontend on Vercel and keep the Express API as a separate hosted Node service.

### Vercel frontend

Use these Vercel project settings:

```text
Framework Preset: Vite
Root Directory: front-end
Install Command: npm ci
Build Command: npm run build
Output Directory: dist
```

The included `vercel.json` handles two production routing concerns:

- `/api/:path*` is proxied to the hosted Express API.
- React Router deep links such as `/airdrops/:id`, `/claim`, and `/guide` are served by `index.html`.

Before the Vercel production deploy, replace this placeholder in `vercel.json` with your hosted API URL:

```text
https://your-multidrop-api.example.com
```

Set this Vercel environment variable:

```text
VITE_CAMPAIGNS_API_URL=/api/campaigns
```

After deploying contracts to Polygon Amoy or mainnet, also set:

```text
VITE_FACTORY_ADDRESS=<deployed AirdropFactory address>
VITE_PUSH_AIRDROP_ADDRESS=<deployed PushAirdrop address>
VITE_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
VITE_MAINNET_RPC_URL=<provider mainnet RPC URL, if needed>
VITE_ENABLE_ANVIL=false
```

### Express API

Deploy the API from this same `front-end` directory on Render or Railway.

```text
Build Command: npm ci
Start Command: npm run api
Health Check Path: /api/health
```

For Render Blueprints, the repository root includes `render.yaml`.

Set these API environment variables:

```text
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=multidrop
MONGODB_CAMPAIGNS_COLLECTION=campaigns
CORS_ORIGIN=https://<your-vercel-domain>
```

Use the MongoDB Atlas connection string for `MONGODB_URI`, and allow the hosted API service to access the Atlas cluster in Atlas Network Access.

## VS Code MongoDB Extension

Use the same `MONGODB_URI` value in the MongoDB extension connection dialog.

After connecting, open:

```text
multidrop -> campaigns
```

Run `npm run api` and refresh this collection. It should exist even when it has no campaign documents yet.

Create a campaign in the app and refresh this collection again to confirm the complete campaign document was saved.

## Dummy Campaign Data

Sample documents are available at:

```text
front-end/server/seed/dummyCampaigns.json
```

Insert these documents into `multidrop.campaigns` with the MongoDB extension. After inserting them, refresh the app and open `/airdrops`; the campaigns should show without connecting a wallet.
