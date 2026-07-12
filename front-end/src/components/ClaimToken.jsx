import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../hooks/useApp';
import { Search, UserCheck, Sparkles, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { isAddress, formatUnits } from 'viem';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { MERKLE_AIRDROP_ABI } from '../constants/contracts';
import { useSearchParams } from 'react-router-dom';
import { getMerkleProof } from '../utils/merkle';

const VERIFICATION_DELAY_MS = 250;

export default function ClaimToken() {
  const { wallet, connectWallet, airdrops, markAirdropClaimed } = useApp();
  const [searchParams] = useSearchParams();
  
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('address') || '');
  const [activeCampaign, setActiveCampaign] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [claimStatus, setClaimStatus] = useState('idle');
  const [claimError, setClaimError] = useState('');

  const [claimantAmountWei, setClaimantAmountWei] = useState(0n);
  const [claimantFormattedAmount, setClaimantFormattedAmount] = useState('0');

  // Transaction tracking
  const [claimTxHash, setClaimTxHash] = useState(null);
  const verificationTimerRef = useRef(null);
  const autoVerifiedKeyRef = useRef('');
  const processedClaimTxHashRef = useRef(null);

  const isValidCloneAddress = isAddress(searchQuery);

  // --- WAGMI READ CONTRACTS ---
  // Check if claimant has already claimed
  const { data: hasClaimed, refetch: refetchHasClaimed } = useReadContract({
    address: isValidCloneAddress ? searchQuery : undefined,
    abi: MERKLE_AIRDROP_ABI,
    functionName: 'hasClaimed',
    args: wallet.address ? [wallet.address] : undefined,
    query: { enabled: isValidCloneAddress && wallet.isConnected },
  });

  // Check the deadline of the contract
  const { data: contractDeadline } = useReadContract({
    address: isValidCloneAddress ? searchQuery : undefined,
    abi: MERKLE_AIRDROP_ABI,
    functionName: 'deadline',
    query: { enabled: isValidCloneAddress },
  });

  const deadlineRef = useRef(contractDeadline);
  useEffect(() => {
    deadlineRef.current = contractDeadline;
  }, [contractDeadline]);

  // --- WAGMI WRITE CONTRACTS ---
  const { writeContractAsync: executeClaim, isPending: isClaimPending } = useWriteContract();

  const { isLoading: isWaitingClaim, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({
    hash: claimTxHash,
  });
  const hasClaimSucceeded = Boolean(claimTxHash && isClaimSuccess);

  const performVerification = useCallback((targetAddress) => {
    if (verificationTimerRef.current) {
      clearTimeout(verificationTimerRef.current);
    }

    setClaimError('');
    setIsVerified(false);

    if (!isAddress(targetAddress)) {
      setClaimError('Please enter a valid airdrop clone contract address.');
      setClaimStatus('error');
      return;
    }

    setClaimStatus('searching');

    verificationTimerRef.current = setTimeout(() => {
      // Look up clone address in our stored campaigns
      const campaign = airdrops.find(item => item.address.toLowerCase() === targetAddress.toLowerCase());
      
      if (!campaign) {
        setClaimError('Campaign configuration not found in local index registry. Verify the contract address.');
        setClaimStatus('error');
        return;
      }

      if (!wallet.isConnected) {
        setClaimError('Please connect your wallet first to verify eligibility.');
        setClaimStatus('error');
        return;
      }

      // Check if user is in the recipient list
      const userEntry = campaign.recipients?.find(
        r => r.address.toLowerCase() === wallet.address.toLowerCase()
      );

      if (!userEntry) {
        setClaimError('Address is not eligible. This address was not included in the original setup list.');
        setClaimStatus('error');
        return;
      }

      // Check deadline from mutable ref setup safely
      const deadlineSecs = deadlineRef.current ? Number(deadlineRef.current) : 0;
      const nowSecs = Math.floor(Date.now() / 1000);
      if (deadlineSecs > 0 && nowSecs > deadlineSecs) {
        setClaimError('This airdrop campaign has expired. Claiming is locked.');
        setClaimStatus('error');
        return;
      }

      const amountWei = BigInt(userEntry.amount);
      setClaimantAmountWei(amountWei);
      setClaimantFormattedAmount(formatUnits(amountWei, campaign.decimals || 18));
      setActiveCampaign(campaign);
      setClaimStatus('eligible');
    }, VERIFICATION_DELAY_MS);
  }, [airdrops, wallet.address, wallet.isConnected]);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    performVerification(searchQuery);
  };

  useEffect(() => {
    const addressParam = searchParams.get('address');
    const walletAddress = wallet.address?.toLowerCase() || '';
    const autoVerifyKey = `${addressParam?.toLowerCase() || ''}:${walletAddress}`;

    if (
      !hasClaimSucceeded &&
      addressParam &&
      isAddress(addressParam) &&
      wallet.isConnected &&
      walletAddress &&
      airdrops.length > 0 &&
      autoVerifiedKeyRef.current !== autoVerifyKey
    ) {
      autoVerifiedKeyRef.current = autoVerifyKey;
      performVerification(addressParam);
    }
  }, [searchParams, wallet.address, wallet.isConnected, airdrops.length, hasClaimSucceeded, performVerification]);

  // Run validation checks when claims finish
  useEffect(() => {
    if (hasClaimSucceeded && processedClaimTxHashRef.current !== claimTxHash) {
      processedClaimTxHashRef.current = claimTxHash;

      if (verificationTimerRef.current) {
        clearTimeout(verificationTimerRef.current);
      }

      refetchHasClaimed();
      markAirdropClaimed(activeCampaign?.id, wallet.address);
    }
  }, [hasClaimSucceeded, claimTxHash, activeCampaign?.id, markAirdropClaimed, refetchHasClaimed, wallet.address]);

  useEffect(() => () => {
    if (verificationTimerRef.current) {
      clearTimeout(verificationTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (activeCampaign && hasClaimed && wallet.address) {
      markAirdropClaimed(activeCampaign.id, wallet.address);
    }
  }, [activeCampaign, hasClaimed, markAirdropClaimed, wallet.address]);

  const handleClaim = async () => {
    setClaimError('');
    if (!wallet.isConnected) {
      connectWallet();
      return;
    }

    if (!activeCampaign || !wallet.address) return;

    try {
      const proof = getMerkleProof({
        recipients: activeCampaign.recipients,
        address: wallet.address,
        amountWei: claimantAmountWei,
      });

      const hash = await executeClaim({
        address: activeCampaign.address,
        abi: MERKLE_AIRDROP_ABI,
        functionName: 'claim',
        args: [claimantAmountWei, proof],
        account: wallet.address,
      });
      
      processedClaimTxHashRef.current = null;
      setClaimTxHash(hash);
    } catch (err) {
      setClaimError(err.message || 'Claim transaction rejected.');
    }
  };

  const isClaimButtonDisabled = !isVerified || isClaimPending || isWaitingClaim || hasClaimed;

  return (
    <div className="max-w-lg mx-auto mt-16 px-4 text-slate-100 animate-fade-in">
      <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold tracking-tight">Verify Airdrop Eligibility</h2>
          <p className="text-slate-500 text-xs mt-1">Verify your wallet address to see your eligible airdrop amount.</p>
        </div>

        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600" />
              <input
                type="text"
                placeholder="Enter campaign contract address (0x...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-900 focus:border-slate-800 outline-none rounded-xl pl-9 pr-4 py-2.5 transition-all text-xs text-slate-300 placeholder:text-slate-700 font-mono"
              />
            </div>
            <button type="submit" className="bg-slate-950 border border-slate-800 hover:border-slate-700 px-4 rounded-xl text-xs font-medium transition-all shadow-sm cursor-pointer">
              Verify
            </button>
          </div>
        </form>

        {claimStatus === 'searching' && (
          <div className="text-center py-6 text-slate-500 text-xs flex justify-center items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
            <span>Querying internal validation indices...</span>
          </div>
        )}

        {claimStatus === 'error' && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4.5 text-xs flex gap-2.5 mb-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
            <div>
              <h4 className="font-bold">Verification Failed</h4>
              <p className="mt-1 text-slate-400 leading-relaxed">{claimError}</p>
            </div>
          </div>
        )}

        {claimStatus === 'eligible' && activeCampaign && !hasClaimSucceeded && (
          <div className="space-y-5 animate-fade-in">
            {hasClaimed ? (
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-500 text-xs uppercase tracking-wider">Already Claimed</h4>
                  <p className="text-slate-500 text-xs mt-1">This wallet address has already claimed its tokens for this campaign. Try with another address!</p>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 flex items-start gap-3">
                <Sparkles className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-emerald-400 text-xs uppercase tracking-wider">Account Confirmed</h4>
                  <p className="text-slate-500 text-xs mt-1">
                    Eligible to claim <strong className="text-emerald-400">{claimantFormattedAmount} {activeCampaign.symbol}</strong>.
                  </p>
                </div>
              </div>
            )}

            <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="verify"
                  checked={isVerified}
                  disabled={hasClaimed}
                  onChange={(e) => setIsVerified(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-800 text-indigo-600 focus:ring-0 bg-slate-900 cursor-pointer disabled:cursor-not-allowed"
                />
                <label htmlFor="verify" className="text-xs text-slate-400 select-none cursor-pointer disabled:opacity-50">
                  I agree to the terms and conditions.
                </label>
              </div>
              <UserCheck className={`h-4 w-4 ${isVerified && !hasClaimed ? 'text-indigo-400' : 'text-slate-700'}`} />
            </div>

            {claimError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs font-mono">
                {claimError}
              </div>
            )}

            <button
              onClick={handleClaim}
              disabled={isClaimButtonDisabled}
              className={`w-full py-3 rounded-xl font-medium text-xs tracking-wide transition-all flex justify-center items-center gap-2 cursor-pointer ${
                isClaimButtonDisabled 
                  ? 'bg-slate-950 border border-slate-900 text-slate-600 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/10'
              }`}
            >
              {isClaimPending || isWaitingClaim ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Transferring Yield Tokens...</span>
                </>
              ) : hasClaimed ? (
                <span>Yield Fully Redeemed</span>
              ) : (
                <span>Claim Tokens</span>
              )}
            </button>
          </div>
        )}

        {hasClaimSucceeded && (
          <div className="text-center py-6 space-y-3.5 animate-fade-in">
            <div className="h-10 w-10 bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h3 className="text-md font-medium text-slate-200">Tokens Claimed Successfully</h3>
            <p className="text-slate-500 text-xs max-w-xs mx-auto leading-relaxed">
              The transaction was successful. Your claimed tokens have been transferred to your connected wallet.
            </p>
            <button 
              onClick={() => { processedClaimTxHashRef.current = null; setClaimTxHash(null); setClaimStatus('idle'); setSearchQuery(''); setIsVerified(false); setActiveCampaign(null); }} 
              className="pt-2 text-xs text-slate-400 hover:text-slate-200 underline underline-offset-4 decoration-slate-700 cursor-pointer"
            >
              Go back to dashboard
            </button>
          </div>
        )}

        {claimStatus === 'idle' && (
          <div className="text-center py-10 text-slate-600 text-xs border border-dashed border-slate-900 rounded-2xl">
            Awaiting target system entry variable mapping fields.
          </div>
        )}
      </div>
    </div>
  );
}
