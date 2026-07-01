import { MerkleTree } from 'merkletreejs';
import { encodePacked, keccak256 } from 'viem';

export const createAirdropLeaf = ({ address, amountWei }) =>
  keccak256(encodePacked(['address', 'uint256'], [address, amountWei]));

export const createMerkleTree = (entries) => {
  const leaves = entries.map(createAirdropLeaf);
  return new MerkleTree(leaves, keccak256, { sortPairs: true });
};

export const getMerkleRoot = (entries) => createMerkleTree(entries).getHexRoot();

export const getMerkleProof = ({ recipients, address, amountWei }) => {
  const tree = createMerkleTree(
    recipients.map((recipient) => ({
      address: recipient.address,
      amountWei: BigInt(recipient.amount),
    })),
  );
  const leaf = createAirdropLeaf({ address, amountWei });
  return tree.getHexProof(leaf);
};
