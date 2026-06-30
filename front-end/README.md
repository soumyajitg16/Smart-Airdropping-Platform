# Multidrop Frontend

This is the React/Vite frontend for the Multidrop airdrop dApp.

## Campaign Storage

Campaign details are stored permanently in MongoDB through the local API server in `front-end/server/`.

The browser does not use permanent `localStorage` for campaigns. It only keeps a temporary `sessionStorage` cache for the current browser session.

The `/airdrops` page reads campaigns from MongoDB without requiring wallet connection and shows an `Airdrop` or `Multisend` flag for each campaign.

## Setup

Create `front-end/.env` from `.env.example`:

```text
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=multidrop
MONGODB_CAMPAIGNS_COLLECTION=campaigns
API_PORT=5050
CORS_ORIGIN=http://localhost:5173
VITE_API_PROXY_TARGET=http://localhost:5050
VITE_CAMPAIGNS_API_URL=/api/campaigns
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
