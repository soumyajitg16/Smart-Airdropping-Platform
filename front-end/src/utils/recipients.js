import { formatUnits, isAddress, parseUnits } from 'viem';

export const parseCSVToRecipientRows = (text) => {
  const lines = text.split(/\r?\n/);
  const result = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split(/[;,\t]/).map((part) => part.trim());
    let address = '';
    let amount = '';

    for (const part of parts) {
      if (part.startsWith('0x') && part.length === 42) {
        address = part;
      } else if (!Number.isNaN(Number(part)) && part !== '' && Number(part) >= 0) {
        amount = part;
      }
    }

    if (!address || !amount) {
      const spaceParts = trimmed.split(/\s+/).map((part) => part.trim());
      for (const part of spaceParts) {
        if (part.startsWith('0x') && part.length === 42) {
          address = part;
        } else if (!Number.isNaN(Number(part)) && part !== '' && Number(part) >= 0) {
          amount = part;
        }
      }
    }

    if (address && amount) {
      result.push(`${address}, ${amount}`);
    }
  }

  return result.join('\n');
};

export const validateRecipientRows = ({ recipients, decimals }) => {
  if (!recipients.trim()) {
    return {
      errors: [],
      entries: [],
      totalRequiredWei: 0n,
      formattedTotal: '0',
    };
  }

  const errors = [];
  const entries = [];
  let totalRequiredWei = 0n;

  recipients.split('\n').forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const parts = trimmed.split(',').map((part) => part.trim());
    if (parts.length !== 2) {
      errors.push(`Line ${index + 1}: Invalid format. Expected 'address, amount'`);
      return;
    }

    const [address, amount] = parts;

    if (!isAddress(address)) {
      errors.push(`Line ${index + 1}: Invalid Ethereum address '${address}'`);
    }

    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      errors.push(`Line ${index + 1}: Amount '${amount}' must be greater than 0`);
      return;
    }

    try {
      const amountWei = parseUnits(amount, decimals);
      totalRequiredWei += amountWei;
      entries.push({
        address,
        amount,
        amountWei,
        line: index + 1,
      });
    } catch {
      errors.push(
        `Line ${index + 1}: Amount '${amount}' has too many decimal places`,
      );
    }
  });

  if (errors.length > 0) {
    return {
      errors,
      entries: [],
      totalRequiredWei: 0n,
      formattedTotal: '0',
    };
  }

  return {
    errors,
    entries,
    totalRequiredWei,
    formattedTotal: formatUnits(totalRequiredWei, decimals),
  };
};

export const createPushBatches = ({ entries, decimals, batchSize = 10 }) => {
  const batches = [];

  for (let i = 0; i < entries.length; i += batchSize) {
    const chunk = entries.slice(i, i + batchSize);
    const totalRequired = chunk.reduce(
      (sum, item) => sum + item.amountWei,
      0n,
    );

    batches.push({
      recipients: chunk.map((entry) => entry.address),
      amounts: chunk.map((entry) => entry.amountWei),
      totalRequired,
      displayAmount: formatUnits(totalRequired, decimals),
    });
  }

  return batches;
};

export const serializeRecipients = (entries) =>
  entries.map((entry) => ({
    address: entry.address,
    amount: entry.amountWei.toString(),
  }));
