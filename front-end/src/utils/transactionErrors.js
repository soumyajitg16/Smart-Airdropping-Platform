export const formatTransactionError = ({ err, fallback, wallet, to }) => {
  const message = err?.shortMessage || err?.message || '';
  const isUserRejected = /user rejected|user denied|denied transaction signature/i.test(
    message,
  );

  if (!isUserRejected) return message || fallback;

  const chain = wallet.chainId
    ? `${wallet.network || 'Unknown'} (id: ${wallet.chainId})`
    : wallet.network || 'Unknown';

  return `User rejected the request. Request Arguments: chain: ${chain} from: ${wallet.address} to: ${to}`;
};
