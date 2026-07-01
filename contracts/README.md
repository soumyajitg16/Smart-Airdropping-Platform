## Multidrop Contracts

This Foundry workspace contains the contracts for the Multidrop dApp:

- `MerkleAirdrop.sol` - pull-based claim contract.
- `AirdropFactory.sol` - deploys and funds Merkle airdrop clones.
- `PushAirdrop.sol` - push-based ERC-20 multisend helper.
- `TestToken.sol` - local/testing ERC-20 token.

## Usage

### Build

```shell
forge build
```

### Test

```shell
forge test
```

### Format

```shell
forge fmt
```

### Local Anvil

```shell
anvil
```

### Deploy Locally

Create `contracts/.env` from `.env.example` and set:

```text
deployerPrivateKey=0x...
creatorPrivateKey=0x...
```

Then run:

```shell
forge script script/Deploy.s.sol:Deploy --rpc-url http://127.0.0.1:8545 --broadcast
```

### Deploy to Polygon Amoy

Set `AMOY_RPC_URL` in `contracts/.env`, then deploy:

```shell
forge script script/Deploy.s.sol:Deploy --rpc-url $AMOY_RPC_URL --broadcast
```

After deployment, copy the logged `Factory Contract Address` and `PushAirdrop Contract Address` into the Vercel environment variables:

```text
VITE_FACTORY_ADDRESS=<deployed factory>
VITE_PUSH_AIRDROP_ADDRESS=<deployed push helper>
```

Set `VITE_AMOY_RPC_URL` in Vercel to the same provider network, without exposing private keys to the frontend.

For local Anvil testing, copy the logged `TestToken Contract Address` into
`VITE_TEST_TOKEN_ADDRESS` and use that token address in the frontend token
field. The factory and push helper addresses are spender/distribution contracts,
not ERC-20 tokens.

### Optional Verification

If you set `POLYGONSCAN_API_KEY`, you can add Polygon Amoy verification settings to the deployment command.
