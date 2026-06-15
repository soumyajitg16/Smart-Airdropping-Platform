import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { ArrowLeft, ExternalLink, ShieldCheck, AlertTriangle, Calendar, Loader2, RefreshCw } from 'lucide-react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { MERKLE_AIRDROP_ABI } from '../constants/contracts';

export default function AirdropDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { airdrops, wallet } = useApp();

  const [refundTxHash, setRefundTxHash] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const drop = airdrops.find(item => item.id === id);

  if (!drop) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center text-slate-400 text-xs">
        Target identifier registry configuration missing.
        <button onClick={() => navigate('/airdrops')} className="block mx-auto mt-2 text-indigo-400 hover:underline">Return</button>
      </div>
    );
  }

  const isPull = drop.reward === 'Merkle Claim';

  // --- WAGMI READ CONTRACTS ---
  // Read campaign creator address
  const { data: contractCreator } = useReadContract({
    address: isPull ? drop.address : undefined,
    abi: MERKLE_AIRDROP_ABI,
    functionName: 'creator',
    query: { enabled: isPull },
  });

  // Read campaign deadline timestamp
  const { data: contractDeadline } = useReadContract({
    address: isPull ? drop.address : undefined,
    abi: MERKLE_AIRDROP_ABI,
    functionName: 'deadline',
    query: { enabled: isPull },
  });

  // --- WAGMI WRITE CONTRACTS ---
  const { writeContractAsync: executeRefund, isPending: isRefundPending } = useWriteContract();

  const { isLoading: isWaitingRefund, isSuccess: isRefundSuccess } = useWaitForTransactionReceipt({
    hash: refundTxHash,
  });

  const nowSecs = Math.floor(Date.now() / 1000);
  const deadlineSecs = contractDeadline ? Number(contractDeadline) : 0;
  const isExpired = deadlineSecs > 0 ? nowSecs > deadlineSecs : false;

  const isCreator = 
    contractCreator && 
    wallet.address && 
    contractCreator.toLowerCase() === wallet.address.toLowerCase();

  const handleRefund = async () => {
    setErrorMsg('');
    try {
      const hash = await executeRefund({
        address: drop.address,
        abi: MERKLE_AIRDROP_ABI,
        functionName: 'refund',
        account: wallet.address,
      });
      setRefundTxHash(hash);
    } catch (err) {
      setErrorMsg(err.message || 'Refund transaction rejected.');
    }
  };

  useEffect(() => {
    if (isRefundSuccess) {
      setRefundTxHash(null);
      // We can redirect or update campaign status if needed
    }
  }, [isRefundSuccess]);

  const formattedDeadlineDate = deadlineSecs 
    ? new Date(deadlineSecs * 1000).toLocaleString() 
    : 'Unknown';

  return (
    <div className="max-w-xl mx-auto mt-16 px-4 text-slate-200 animate-fade-in font-sans">
      <button 
        onClick={() => navigate('/airdrops')}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 mb-6 transition-colors font-medium uppercase tracking-wider cursor-pointer"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Directory Index
      </button>

      <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-8 shadow-2xl relative">
        <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-slate-800 to-transparent" />
        
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase block mb-1">Campaign Node Entry</span>
            <h1 className="text-2xl font-semibold tracking-tight text-white">{drop.name}</h1>
          </div>
          <span className={`border px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
            isExpired 
              ? 'bg-red-500/5 text-red-400 border-red-500/10' 
              : drop.status === 'Completed'
                ? 'bg-slate-800/85 text-slate-400 border-slate-700/50'
                : 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10'
          }`}>
            {isExpired ? 'Expired' : drop.status}
          </span>
        </div>

        <p className="text-slate-400 text-xs leading-relaxed mb-6 border-b border-slate-900 pb-5">{drop.description}</p>

        <div className="space-y-3.5 text-xs font-medium mb-8">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Contract Verification</span>
            <span className="font-mono text-slate-400 flex items-center gap-1 hover:text-slate-200 cursor-pointer select-all">
              {drop.address} <ExternalLink className="h-3 w-3 text-slate-600" />
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Asset Identity Core</span>
            <span className="text-slate-300 font-mono">{drop.symbol}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Global Supply Limit</span>
            <span className="text-slate-300">{drop.totalAllocation} {drop.symbol}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Individual Standard Drop</span>
            <span className="text-indigo-400 font-semibold">{drop.reward}</span>
          </div>
          {isPull && deadlineSecs > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">Expiration Target</span>
              <span className="text-slate-300 font-mono flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-600" /> {formattedDeadlineDate}
              </span>
            </div>
          )}
        </div>

        {/* Claim Navigation CTA */}
        {isPull && !isExpired && (
          <button 
            onClick={() => navigate('/claim')}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10 active:scale-99 cursor-pointer mb-4"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-white" /> Redirect to Claim Verification Module
          </button>
        )}

        {/* Creator Sweep/Refund Widget */}
        {isPull && isCreator && (
          <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-5 mt-4 space-y-4">
            <div className="flex gap-3 text-xs">
              <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-indigo-400 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-200">Creator Admin Panel</h4>
                <p className="text-slate-500 mt-1 leading-relaxed">
                  As the creator, you can sweep and refund all remaining unclaimed tokens from the clone contract after the expiration deadline.
                </p>
              </div>
            </div>

            {isRefundSuccess ? (
              <div className="bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 rounded-xl p-3 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Tokens swept and refunded successfully to your creator wallet!</span>
              </div>
            ) : isExpired ? (
              <div className="space-y-3.5 pt-2">
                {errorMsg && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-2.5 rounded-lg text-xs font-mono">
                    {errorMsg}
                  </div>
                )}
                <button
                  onClick={handleRefund}
                  disabled={isRefundPending || isWaitingRefund}
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-950 disabled:text-slate-700 border border-slate-800 hover:border-slate-700 text-slate-300 py-3 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow-sm flex justify-center items-center gap-2 cursor-pointer"
                >
                  {isRefundPending || isWaitingRefund ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                      <span>Reclaiming Unclaimed Yield...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 text-indigo-400 animate-spin-slow" />
                      <span>Refund Unclaimed Tokens</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="text-[11px] text-slate-600 bg-slate-900/40 p-3 rounded-xl font-mono text-center">
                Refund locks lift after the deadline passes.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}