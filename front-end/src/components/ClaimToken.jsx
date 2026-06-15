import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Search, UserCheck, Sparkles, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { isAddress, formatUnits, keccak256, encodePacked } from 'viem';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { MerkleTree } from 'merkletreejs';
import { MERKLE_AIRDROP_ABI } from '../constants/contracts';

export default function ClaimToken() {
  const { wallet, connectWallet, airdrops } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCampaign, setActiveCampaign] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [claimStatus, setClaimStatus] = useState('idle');
  const [claimError, setClaimError] = useState('');

  const [claimantAmountWei, setClaimantAmountWei] = useState(0n);
  const [claimantFormattedAmount, setClaimantFormattedAmount] = useState('0');

  // Transaction tracking
  const [claimTxHash, setClaimTxHash] = useState(null);

  const isValidCloneAddress = isAddress(searchQuery);

  // --- WAGMI READ CONTRACTS ---
  // Check if claimant has already claimed
  const { data: hasClaimed, refetch: refetchHasClaimed, isLoading: isLoadingHasClaimed } = useReadContract({
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

  // --- WAGMI WRITE CONTRACTS ---
  const { writeContractAsync: executeClaim, isPending: isClaimPending } = useWriteContract();

  const { isLoading: isWaitingClaim, isSuccess: isClaimSuccess, error: txError } = useWaitForTransactionReceipt({
    hash: claimTxHash,
  });

  const handleSearch = (e) => {
    e.preventDefault();
    setClaimError('');
    setIsVerified(false);

    if (!isValidCloneAddress) {
      setClaimError('Please enter a valid airdrop clone contract address.');
      setClaimStatus('error');
      return;
    }

    setClaimStatus('searching');

    // Look up clone address in our stored campaigns
    const campaign = airdrops.find(item => item.address.toLowerCase() === searchQuery.toLowerCase());
    
    setTimeout(() => {
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

      // Check deadline
      const deadlineSecs = contractDeadline ? Number(contractDeadline) : 0;
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
    }, 800);
  };

  // Run validation checks when claims finish
  useEffect(() => {
    if (isClaimSuccess) {
      refetchHasClaimed();
      setClaimStatus('success');
      setClaimTxHash(null);
    }
  }, [isClaimSuccess]);

  const handleClaim = async () => {
    setClaimError('');
    if (!wallet.isConnected) {
      connectWallet();
      return;
    }

    if (!activeCampaign || !wallet.address) return;

    try {
      // Reconstruct Merkle Tree
      const leaves = activeCampaign.recipients.map(r => 
        keccak256(encodePacked(['address', 'uint256'], [r.address, BigInt(r.amount)]))
      );
      const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
      const leaf = keccak256(encodePacked(['address', 'uint256'], [wallet.address, claimantAmountWei]));
      const proof = tree.getHexProof(leaf);

      const hash = await executeClaim({
        address: activeCampaign.address,
        abi: MERKLE_AIRDROP_ABI,
        functionName: 'claim',
        args: [claimantAmountWei, proof],
        account: wallet.address,
      });
      
      setClaimTxHash(hash);
    } catch (err) {
      setClaimError(err.message || 'Claim transaction rejected.');
    }
  };

  const isClaimButtonDisabled = !isVerified || isClaimPending || isWaitingClaim || hasClaimed;

  return (
    <div className="max-w-lg mx-auto mt-16 px-4 text-white animate-fade-in">
      <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold tracking-tight">Claim Allocation Yield</h2>
          <p className="text-slate-500 text-xs mt-1">Verify cryptographically signed account parameters.</p>
        </div>

        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600" />
              <input
                type="text"
                placeholder="Enter drop clone contract address (0x...)"
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

        {claimStatus === 'eligible' && activeCampaign && (
          <div className="space-y-5 animate-fade-in">
            {hasClaimed ? (
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-500 text-xs uppercase tracking-wider">Already Claimed</h4>
                  <p className="text-slate-500 text-xs mt-1">This wallet address has already completed its claiming allocation for this campaign.</p>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 flex items-start gap-3">
                <Sparkles className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-emerald-400 text-xs uppercase tracking-wider">Account Confirmed</h4>
                  <p className="text-slate-500 text-xs mt-1">
                    Eligible for a reward yield of <strong className="text-emerald-400">{claimantFormattedAmount} {activeCampaign.symbol}</strong>.
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
                  Accept distribution constraint guidelines.
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
                <span>Execute Asset Release</span>
              )}
            </button>
          </div>
        )}

        {claimStatus === 'success' && (
          <div className="text-center py-6 space-y-3.5 animate-fade-in">
            <div className="h-10 w-10 bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h3 className="text-md font-medium text-slate-200">Asset Transferred Successfully</h3>
            <p className="text-slate-500 text-xs max-w-xs mx-auto leading-relaxed">
              Cryptographic transaction verified and mined. Your allocation balance has been updated.
            </p>
            <button 
              onClick={() => { setClaimStatus('idle'); setSearchQuery(''); setIsVerified(false); setActiveCampaign(null); }} 
              className="pt-2 text-xs text-slate-400 hover:text-slate-200 underline underline-offset-4 decoration-slate-700 cursor-pointer"
            >
              Run another profile query
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