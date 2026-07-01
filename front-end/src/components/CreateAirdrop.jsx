import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../hooks/useApp";
import { HelpCircle, ChevronRight, CheckCircle2, ArrowRight, Upload, AlertTriangle, Loader2, Info, } from "lucide-react";
import { isAddress, formatUnits, decodeEventLog } from "viem";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, } from "wagmi";
import { ERC20_ABI, FACTORY_ADDRESS, FACTORY_ABI, PUSH_AIRDROP_ADDRESS, PUSH_AIRDROP_ABI, TEST_TOKEN_ADDRESS, } from "../constants/contracts";
import { useNavigate } from "react-router-dom";
import { formatCampaignName } from "../utils/campaignDisplay";
import { getMerkleRoot } from "../utils/merkle";
import {
  createPushBatches,
  parseCSVToRecipientRows,
  serializeRecipients,
  validateRecipientRows,
} from "../utils/recipients";
import { formatTransactionError } from "../utils/transactionErrors";

export default function CreateAirdrop() {
  const { wallet, connectWallet, setAirdrops, airdrops } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [distributionMode, setDistributionMode] = useState("pull");
  const [campaignName, setCampaignName] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [recipients, setRecipients] = useState("");
  const [durationDays, setDurationDays] = useState("7");

  // UI Errors and Loading states
  const [validationErrors, setValidationErrors] = useState([]);
  const [parsedEntries, setParsedEntries] = useState([]);
  const [totalRequiredWei, setTotalRequiredWei] = useState(0n);
  const [formattedTotal, setFormattedTotal] = useState("0");
  const [errorMsg, setErrorMsg] = useState("");

  // Transaction state tracking
  const [approveTxHash, setApproveTxHash] = useState(null);
  const [deployTxHash, setDeployTxHash] = useState(null);
  const [deployedCloneAddress, setDeployedCloneAddress] = useState("");
  const [deployedMerkleRoot, setDeployedMerkleRoot] = useState("");

  // Push Model batching states
  const [pushBatches, setPushBatches] = useState([]);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [batchTxHash, setBatchTxHash] = useState(null);
  const [isPushCompleted, setIsPushCompleted] = useState(false);

  const fileInputRef = useRef(null);
  const campaignNameRef = useRef(campaignName);
  const airdropsRef = useRef(airdrops);

  const normalizedTokenAddress = tokenAddress.toLowerCase();
  const isValidTokenAddress = isAddress(tokenAddress);
  const isInfrastructureContractAddress =
    isValidTokenAddress &&
    [FACTORY_ADDRESS, PUSH_AIRDROP_ADDRESS].some(
      (address) => address.toLowerCase() === normalizedTokenAddress,
    );
  const canReadTokenContract = isValidTokenAddress && !isInfrastructureContractAddress;
  const canUseLocalTestToken =
    import.meta.env.DEV && TEST_TOKEN_ADDRESS && TEST_TOKEN_ADDRESS !== "0x...";

  // --- WAGMI READ CONTRACTS ---
  const { data: tokenDecimals } = useReadContract({
    address: canReadTokenContract ? tokenAddress : undefined,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: canReadTokenContract, retry: false },
  });

  const { data: tokenSymbol } = useReadContract({
    address: canReadTokenContract ? tokenAddress : undefined,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: { enabled: canReadTokenContract, retry: false },
  });

  const { data: tokenName } = useReadContract({
    address: canReadTokenContract ? tokenAddress : undefined,
    abi: ERC20_ABI,
    functionName: "name",
    query: { enabled: canReadTokenContract, retry: false },
  });

  const { data: userTokenBalance, refetch: refetchBalance } = useReadContract({
    address: canReadTokenContract && wallet.address ? tokenAddress : undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: wallet.address ? [wallet.address] : undefined,
    query: { enabled: canReadTokenContract && wallet.isConnected, retry: false },
  });

  const spenderAddress =
    distributionMode === "pull" ? FACTORY_ADDRESS : PUSH_AIRDROP_ADDRESS;

  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract(
    {
      address: canReadTokenContract && wallet.address ? tokenAddress : undefined,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: wallet.address ? [wallet.address, spenderAddress] : undefined,
      query: { enabled: canReadTokenContract && wallet.isConnected, retry: false },
    },
  );

  // --- WAGMI WRITE CONTRACTS ---
  const { writeContractAsync: writeContract, isPending: isTxPending } =
    useWriteContract();

  const { isLoading: isWaitingApprove, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({
      hash: approveTxHash,
    });

  const {
    data: deployReceipt,
    isLoading: isWaitingDeploy,
    isSuccess: isDeploySuccess,
  } = useWaitForTransactionReceipt({
    hash: deployTxHash,
  });

  const { isLoading: isWaitingBatch, isSuccess: isBatchSuccess } =
    useWaitForTransactionReceipt({
      hash: batchTxHash,
    });

  const decimals = tokenDecimals || 18;

  const defaultCampaignName = formatCampaignName({
    customName: "",
    symbol: tokenSymbol || "TOKEN",
    mode: distributionMode,
    airdrops,
  });

  useEffect(() => {
    campaignNameRef.current = campaignName;
    airdropsRef.current = airdrops;
  }, [campaignName, airdrops]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const formatted = parseCSVToRecipientRows(event.target.result);
      setRecipients(formatted);
    };
    reader.readAsText(file);
  };

  // --- LIVE VALIDATION ENGINE ---
  useEffect(() => {
    setErrorMsg("");
    const validation = validateRecipientRows({ recipients, decimals });
    setValidationErrors(validation.errors);
    setParsedEntries(validation.entries);
    setTotalRequiredWei(validation.totalRequiredWei);
    setFormattedTotal(validation.formattedTotal);
  }, [recipients, tokenAddress, decimals]);

  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
      refetchBalance();
      setApproveTxHash(null);
    }
  }, [isApproveSuccess]);

  // Handle successful deployment (Pull Model)
  useEffect(() => {
    if (isDeploySuccess && deployReceipt) {
      let clone = "";
      for (const log of deployReceipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: FACTORY_ABI,
            eventName: "AirdropCreated",
            data: log.data,
            topics: log.topics,
          });
          if (decoded) {
            clone = decoded.args.cloneAddress;
            break;
          }
        } catch {
          // Ignore logs emitted by other contracts in the receipt.
        }
      }

      const targetClone = clone || "0x...";
      setDeployedCloneAddress(targetClone);

      const root = getMerkleRoot(parsedEntries);
      setDeployedMerkleRoot(root);

      const newDrop = {
        id: Date.now().toString(),
        name: formatCampaignName({
          customName: campaignNameRef.current,
          symbol: tokenSymbol || "TOKEN",
          mode: "pull",
          airdrops: airdropsRef.current,
        }),
        tokenName,
        symbol: tokenSymbol || "TOKEN",
        address: targetClone,
        totalAllocation: formattedTotal,
        status: "Active",
        reward: "Airdrop", // Will delete later on
        description: `Cryptographic Merkle pull-based claim for ${parsedEntries.length} verified addresses.`,
        distributionMode: "pull",
        tokenAddress: tokenAddress,
        merkleRoot: root,
        recipients: serializeRecipients(parsedEntries),
        decimals: decimals,
      };

      setAirdrops((prev) => [newDrop, ...prev]);
      refetchBalance();
      setStep(3);
      setDeployTxHash(null);
    }
  }, [isDeploySuccess, deployReceipt]);

  // Handle successful batch execution (Push Model)
  useEffect(() => {
    if (isBatchSuccess) {
      refetchBalance();
      setBatchTxHash(null);
      const nextIndex = currentBatchIndex + 1;
      if (nextIndex < pushBatches.length) {
        setCurrentBatchIndex(nextIndex);
      } else {
        // All batches completed atomically
        const newDrop = {
          id: Date.now().toString(),
          name: formatCampaignName({
            customName: campaignNameRef.current,
            symbol: tokenSymbol || "TOKEN",
            mode: "push",
            airdrops: airdropsRef.current,
          }),
          tokenName,
          symbol: tokenSymbol || "TOKEN",
          address: PUSH_AIRDROP_ADDRESS,
          totalAllocation: formattedTotal,
          status: "Completed",
          reward: "Multisend", // Will delete later on
          description: `Direct batch multisend distribution complete for ${parsedEntries.length} addresses.`,
          distributionMode: "push",
          tokenAddress: tokenAddress,
          recipients: serializeRecipients(parsedEntries),
          decimals: decimals,
        };
        setAirdrops((prev) => [newDrop, ...prev]);
        setIsPushCompleted(true);
      }
    }
  }, [isBatchSuccess]);

  const loadExampleData = (e) => {
    e.preventDefault();
    const example = `0x71C9991A23a92ae93f9c8e1e82ef3d211244e299, 150\n0x70997970C51812dc3A010C7d01b50e0d17dc79C8, 250`;
    setRecipients(example);
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!isValidTokenAddress) {
        setErrorMsg("Please enter a valid ERC-20 token address.");
        return;
      }
      if (isInfrastructureContractAddress) {
        setErrorMsg(
          "That is a Multidrop contract address. Enter the ERC-20 token address instead.",
        );
        return;
      }
      if (validationErrors.length > 0 || parsedEntries.length === 0) {
        setErrorMsg(
          "Please resolve all validation errors in the recipients list.",
        );
        return;
      }

      if (distributionMode === "push") {
        setPushBatches(createPushBatches({ entries: parsedEntries, decimals }));
        setCurrentBatchIndex(0);
      }

      setStep(2);
    }
  };

  const handleApprove = async () => {
    setErrorMsg("");
    try {
      const hash = await writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [spenderAddress, totalRequiredWei],
        account: wallet.address,
      });
      setApproveTxHash(hash);
    } catch (err) {
      setErrorMsg(
        formatTransactionError({
          err,
          fallback: "Approval transaction rejected.",
          wallet,
          to: tokenAddress,
        }),
      );
    }
  };

  const handleDeployAirdrop = async () => {
    setErrorMsg("");
    try {
      if (distributionMode === "pull") {
        const root = getMerkleRoot(parsedEntries);

        const durationInSeconds = BigInt(
          Math.floor(parseFloat(durationDays) * 24 * 60 * 60),
        );

        const hash = await writeContract({
          address: FACTORY_ADDRESS,
          abi: FACTORY_ABI,
          functionName: "createAndFundAirdrop",
          args: [tokenAddress, root, totalRequiredWei, durationInSeconds],
          account: wallet.address,
        });
        setDeployTxHash(hash);
      } else {
        const currentBatch = pushBatches[currentBatchIndex];
        const hash = await writeContract({
          address: PUSH_AIRDROP_ADDRESS,
          abi: PUSH_AIRDROP_ABI,
          functionName: "pushTokens",
          args: [
            tokenAddress,
            currentBatch.recipients,
            currentBatch.amounts,
            currentBatch.totalRequired,
          ],
          account: wallet.address,
        });
        setBatchTxHash(hash);
      }
    } catch (err) {
      setErrorMsg(
        formatTransactionError({
          err,
          fallback: "Deployment transaction rejected.",
          wallet,
          to: distributionMode === "pull" ? FACTORY_ADDRESS : PUSH_AIRDROP_ADDRESS,
        }),
      );
    }
  };

  const finalizeAirdrop = () => {
    setStep(1);
    setCampaignName("");
    setTokenAddress("");
    setRecipients("");
    setDeployedCloneAddress("");
    setDeployedMerkleRoot("");
    setPushBatches([]);
    setCurrentBatchIndex(0);
    setIsPushCompleted(false);
  };

  const isFormInvalid =
    !isValidTokenAddress ||
    isInfrastructureContractAddress ||
    parsedEntries.length === 0 ||
    validationErrors.length > 0;
  const hasApprovedAllowance =
    currentAllowance !== undefined && currentAllowance >= totalRequiredWei;
  const isBalanceSufficient =
    userTokenBalance !== undefined && userTokenBalance >= totalRequiredWei;

  return (
    <div className="max-w-2xl mx-auto mt-6 px-4 relative animate-fade-in">
      <div className="flex items-center justify-between w-full mb-3 bg-slate-950/20 p-1.5 rounded-xl border border-slate-900/60 transition-all duration-300">
        {["Preparation", "Approval", "Distribution"].map((name, i) => (
          <React.Fragment key={name}>
            <div className="flex items-center space-x-2.5 px-2">
              <div
                className={`h-6 w-6 rounded-lg flex items-center justify-center text-xs font-bold border transition-all duration-300 ${
                  step > i + 1
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : step === i + 1
                      ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20"
                      : "bg-transparent border-slate-800 text-slate-600"
                }`}
              >
                {step > i + 1 ? "✓" : i + 1}
              </div>
              <span
                className={`text-[11px] tracking-wider font-semibold uppercase ${step === i + 1 ? "text-slate-200" : "text-slate-600"}`}
              >
                {name}
              </span>
            </div>
            {i < 2 && (
              <ArrowRight className="h-3 w-3 text-slate-800 mx-2 flex-1 max-w-10" />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 shadow-2xl backdrop-blur-sm relative">
        <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-slate-800 to-transparent" />

        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 -mx-6 -mt-6 mb-6 bg-slate-950/40 border-b border-slate-900/80 rounded-t-2xl">
            <div className="space-y-1">
              <h2 className="text-md font-bold text-slate-100 tracking-tight">
                Token Distribution Setup
              </h2>
              <p className="text-slate-400 text-xs max-w-95 leading-relaxed">
                Select a distribution method and define allocation limits.
              </p>
            </div>

            {step === 1 && (
              <div className="bg-slate-950 p-0.5 rounded-xl border border-slate-800/50 flex space-x-0.5 min-w-40 h-9 shadow-inner self-center sm:self-auto relative z-20">
                <button
                  type="button"
                  onClick={() => setDistributionMode("pull")}
                  className={`flex-1 flex items-center justify-center gap-1 px-3 rounded-lg text-xs font-bold transition-all relative group/pull cursor-pointer ${
                    distributionMode === "pull"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <span>Airdrop</span>
                  <HelpCircle className="h-3 w-3 opacity-50 group-hover/pull:opacity-100 transition-opacity" />
                  <div className="absolute bottom-full mb-2.5 right-0 hidden group-hover/pull:block w-52 bg-slate-950 border border-slate-800 text-slate-400 text-[10px] p-2.5 rounded-xl text-center font-normal normal-case pointer-events-none shadow-2xl z-50 leading-normal animate-fade-in">
                    Recipients pay gas to claim their predefined share using
                    cryptographic Proofs.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDistributionMode("push")}
                  className={`flex-1 flex items-center justify-center gap-1 px-3 rounded-lg text-xs font-bold transition-all relative group/push cursor-pointer ${
                    distributionMode === "push"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <span>Multisend</span>
                  <HelpCircle className="h-3 w-3 opacity-50 group-hover/push:opacity-100 transition-opacity" />
                  <div className="absolute bottom-full mb-2.5 right-0 hidden group-hover/push:block w-52 bg-slate-950 border border-slate-800 text-slate-400 text-[10px] p-2.5 rounded-xl text-center font-normal normal-case pointer-events-none shadow-2xl z-50 leading-normal animate-fade-in">
                    Creator pays gas to push allocations directly to recipient
                    addresses.
                  </div>
                </button>
              </div>
            )}
          </div>

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-slate-300 tracking-wide">
                    Token Address
                  </label>
                  {canUseLocalTestToken && !tokenAddress && (
                    <button
                      type="button"
                      onClick={() => setTokenAddress(TEST_TOKEN_ADDRESS)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/15 px-2 py-0.5 rounded border border-indigo-500/20 transition-colors"
                    >
                      Use Local TestToken
                    </button>
                  )}
                  {canReadTokenContract && tokenSymbol && (
                    <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 font-mono">
                      {tokenSymbol} ({decimals} Decimals)
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="0x..."
                  value={tokenAddress}
                  onChange={(e) => setTokenAddress(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 outline-none rounded-xl px-4 py-2.5 text-slate-200 font-mono text-sm transition-all placeholder:text-slate-800"
                />
                {isInfrastructureContractAddress && (
                  <div className="mt-2 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl p-3 text-xs flex gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                    <span>
                      This is a Multidrop contract address. Use the ERC-20 token
                      contract address instead
                      {canUseLocalTestToken ? `, such as ${TEST_TOKEN_ADDRESS}` : ""}.
                    </span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-slate-300 tracking-wide">
                    Campaign Name
                  </label>
                  <span className="text-[10px] text-slate-500 truncate max-w-56">
                    Default: {defaultCampaignName}
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={80}
                  placeholder={defaultCampaignName}
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 outline-none rounded-xl px-4 py-2.5 text-slate-200 text-sm transition-all placeholder:text-slate-700"
                />
              </div>

              {distributionMode === "pull" && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 tracking-wide mb-2 block">
                    Airdrop Expiration Duration (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="30"
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-900 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 outline-none rounded-xl px-4 py-2.5 text-slate-200 text-sm transition-all"
                  />
                </div>
              )}

              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="text-xs font-semibold text-slate-300 tracking-wide">
                    Recipients Allocation List
                  </label>
                  <div className="flex items-center space-x-2 text-xs">
                    <button
                      onClick={loadExampleData}
                      className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium cursor-pointer"
                    >
                      Show Example
                    </button>
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-900 rounded-xl overflow-hidden focus-within:border-indigo-500/50 transition-all flex flex-col min-h-42.5">
                  <div className="flex flex-1 relative">
                    <div className="w-9 bg-slate-950 text-slate-700 text-right pr-2.5 pt-2.5 font-mono text-xs select-none border-r border-slate-900/40">
                      {recipients.split("\n").map((_, index) => (
                        <div key={index} className="h-5 leading-5">
                          {index + 1}
                        </div>
                      ))}
                    </div>
                    <textarea
                      placeholder="Enter distribution list as: address, amount (one per line)"
                      value={recipients}
                      onChange={(e) => setRecipients(e.target.value)}
                      className="w-full bg-transparent text-slate-200 p-2.5 font-mono text-xs outline-none resize-none leading-5 min-h-30 placeholder:text-slate-800"
                    />
                  </div>

                  <div className="border-t border-slate-900/50 px-3 py-2 flex justify-between items-center bg-slate-950/40">
                    <div className="text-[11px] font-mono text-slate-500">
                      {parsedEntries.length > 0
                        ? `${parsedEntries.length} recipients parsed successfully`
                        : "Awaiting input data format..."}
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".csv,.txt"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center space-x-1.5 bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm cursor-pointer"
                      >
                        <Upload className="h-3 w-3 text-slate-400" />
                        <span>Upload CSV / TEXT</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {validationErrors.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4.5 text-xs max-h-48 overflow-y-auto space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-red-300 mb-1">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                    Validation Errors Detected:
                  </div>
                  {validationErrors.map((err, i) => (
                    <div key={i} className="font-mono text-[11px]">
                      {err}
                    </div>
                  ))}
                </div>
              )}

              {parsedEntries.length > 10 && distributionMode === "push" && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl p-4.5 text-xs flex gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <h4 className="font-bold mb-1">
                      Recommendation: Choose Airdrop Model
                    </h4>
                    <p className="leading-relaxed text-slate-400">
                      You have entered {parsedEntries.length} recipients. The
                      Multisend contract is limited to a maximum of 10
                      recipients per transaction. Proceeding will split your
                      list into{" "}
                      <strong>
                        {Math.ceil(parsedEntries.length / 10)} transactions
                      </strong>{" "}
                      which you must sign sequentially, incurring significantly
                      higher gas costs. We strongly suggest switching to the
                      **Airdrop Model** to save gas and execute this in a single
                      deployment.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 py-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-100 tracking-tight">
                  Authorize Allocation
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  Approve spender contract limits and verify wallet token
                  balances.
                </p>
              </div>

              <div className="bg-slate-950/50 border border-slate-900 rounded-xl p-5 font-mono text-xs max-w-md mx-auto text-slate-300 space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Token Address:</span>{" "}
                  <div className="relative group inline-block">
                    {/* The truncated address displayed on the screen */}
                    <span className="text-slate-300 truncate max-w-50 block cursor-pointer">
                      {tokenAddress}
                    </span>

                    {/* The Tooltip (shows up a little above on hover) */}
                    <div
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 
                  hidden group-hover:block bg-slate-800 text-white text-xs 
                  round-md py-1 px-2 whitespace-nowrap rounded shadow-lg z-10"
                    >
                      {tokenAddress}
                      {/* Tooltip Arrow (Optional) */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Distribution Mode:</span>{" "}
                  <span className="text-indigo-400 font-semibold uppercase">
                    {distributionMode == "pull" ? "AIRDROP" : "MULTISEND"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Spender Address:</span>{" "}
                  <div className="relative group inline-block">
                    {/* The truncated address displayed on the screen */}
                    <span className="text-slate-300 truncate block max-w-50">
                      {spenderAddress}
                    </span>

                    {/* The Tooltip (shows up a little above on hover) */}
                    <div
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 
                  hidden group-hover:block bg-slate-800 text-white text-xs 
                  round-md py-1 px-2 whitespace-nowrap rounded shadow-lg z-10"
                    >
                      {tokenAddress}
                      {/* Tooltip Arrow (Optional) */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Recipients:</span>{" "}
                  <span className="text-slate-300">{parsedEntries.length}</span>
                </div>
                <div className="flex justify-between border-t border-slate-900 pt-2 font-bold">
                  <span className="text-slate-500">Total Required:</span>
                  <span className="text-emerald-400">
                    {formattedTotal} {tokenSymbol || "TOKEN"}
                  </span>
                </div>
                {userTokenBalance !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Your Wallet Balance:</span>
                    <span
                      className={
                        isBalanceSufficient
                          ? "text-slate-300"
                          : "text-red-400 font-bold"
                      }
                    >
                      {formatUnits(userTokenBalance, decimals)}{" "}
                      {tokenSymbol || "TOKEN"}
                    </span>
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 text-xs max-w-md mx-auto flex gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="max-w-md mx-auto space-y-3">
                {!isBalanceSufficient ? (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 text-xs flex gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <strong>Insufficient Funds:</strong> You need at least{" "}
                      {formattedTotal} {tokenSymbol || "TOKEN"} to fund this
                      distribution.
                    </div>
                  </div>
                ) : hasApprovedAllowance ? (
                  <div className="bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 rounded-xl p-4 text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>
                      Allowance limit authorized successfully. Ready to deploy.
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={handleApprove}
                    disabled={isTxPending || isWaitingApprove}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-950 disabled:text-slate-700 disabled:border-slate-900 disabled:cursor-not-allowed border border-transparent text-white py-3 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow-md flex justify-center items-center gap-2 cursor-pointer"
                  >
                    {isTxPending || isWaitingApprove ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                        <span>Authorizing Token Allowance...</span>
                      </>
                    ) : (
                      <span>Approve {tokenSymbol || "TOKEN"} Allowance</span>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-6 space-y-6">
              {distributionMode === "pull" ? (
                !deployedCloneAddress ? (
                  <div className="space-y-4 max-w-md mx-auto">
                    <Info className="h-10 w-10 text-indigo-400 mx-auto" />
                    <div>
                      <h3 className="text-lg font-semibold text-slate-200">
                        Deploy Pull Campaign
                      </h3>
                      <p className="px-2 text-slate-400 text-xs mt-1">
                        Deploys your custom airdrop contract and securely
                        deposits the tokens to start the campaign.
                      </p>
                    </div>
                    {errorMsg && (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-left text-xs font-mono">
                        {errorMsg}
                      </div>
                    )}
                    <button
                      onClick={handleDeployAirdrop}
                      disabled={isTxPending || isWaitingDeploy}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-900 disabled:text-slate-600 border border-transparent text-white py-3 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow-md flex justify-center items-center gap-2 cursor-pointer"
                    >
                      {isTxPending || isWaitingDeploy ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Deploying Campaign Vault...</span>
                        </>
                      ) : (
                        <span>Deploy and Fund Airdrop</span>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-max mx-auto animate-fade-in">
                    <div className=" h-12 w-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-100">
                        Campaign Successfully Created
                      </h3>
                      <p className="text-slate-400 text-xs mt-1">
                        Lightweight custom Airdrop contract deployed and funded.
                      </p>
                    </div>

                    {/* Details Box */}
                    <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-4.5 font-mono text-[11px] text-left space-y-1.5 text-slate-300">
                      {/* Row 1 */}
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-slate-500 shrink-0">
                          Airdrop Campaign Contract:
                        </span>
                        <span className="text-emerald-400 font-bold select-all truncate text-right">
                          {deployedCloneAddress}
                        </span>
                      </div>

                      {/* Row 2 */}
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-slate-500 shrink-0">
                          Token Address:
                        </span>
                        <span className="text-slate-400 truncate text-right">
                          {tokenAddress}
                        </span>
                      </div>

                      {/* Row 3 */}
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-slate-500 shrink-0">
                          Merkle Root:
                        </span>
                        <span className="text-slate-400 truncate text-right">
                          {deployedMerkleRoot}
                        </span>
                      </div>

                      {/* Row 4 */}
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-slate-500 shrink-0">
                          Total Funded:
                        </span>
                        <span className="text-emerald-400 text-right shrink-0">
                          {formattedTotal} {tokenSymbol}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/airdrops/${airdrops[0].id}`)}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-semibold text-xs tracking-wide transition-all cursor-pointer mb-2"
                    >
                      View Campaign Details
                    </button>

                    <button
                      onClick={finalizeAirdrop}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 py-3 rounded-xl font-semibold text-xs tracking-wide transition-all cursor-pointer"
                    >
                      Configure New Campaign
                    </button>
                  </div>
                )
              ) : !isPushCompleted ? (
                <div className="space-y-5 max-w-md mx-auto">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-100">
                      Direct Batch Multisend
                    </h3>
                    <p className="text-slate-400 text-xs mt-1">
                      Sequential batch queue: {pushBatches.length} transactions
                      required.
                    </p>
                  </div>

                  <div className="bg-slate-950/50 border border-slate-900 rounded-xl p-4 text-left space-y-3">
                    {pushBatches.map((batch, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-xs font-mono"
                      >
                        <span
                          className={
                            index === currentBatchIndex
                              ? "text-indigo-400 font-bold"
                              : index < currentBatchIndex
                                ? "text-emerald-400 line-through"
                                : "text-slate-600"
                          }
                        >
                          Batch #{index + 1}: {batch.recipients.length}{" "}
                          Recipient(s)
                        </span>
                        <span
                          className={
                            index === currentBatchIndex
                              ? "text-indigo-300 font-bold"
                              : index < currentBatchIndex
                                ? "text-emerald-500"
                                : "text-slate-600"
                          }
                        >
                          {index === currentBatchIndex
                            ? "PROCESSING"
                            : index < currentBatchIndex
                              ? "✓ COMPLETE"
                              : "QUEUED"}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-950 border border-slate-900 rounded-xl p-4.5 text-left text-xs space-y-2">
                    <h4 className="font-bold text-slate-400">
                      Current Queue Parameter details:
                    </h4>
                    <div className="font-mono text-[11px] text-slate-300 space-y-1">
                      <div>
                        Recipients:{" "}
                        {pushBatches[currentBatchIndex]?.recipients.length}{" "}
                        Addresses
                      </div>
                      <div>
                        Batch Cost:{" "}
                        {pushBatches[currentBatchIndex]?.displayAmount}{" "}
                        {tokenSymbol}
                      </div>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-left text-xs font-mono">
                      {errorMsg}
                    </div>
                  )}

                  <button
                    onClick={handleDeployAirdrop}
                    disabled={isTxPending || isWaitingBatch}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-900 disabled:text-slate-600 border border-transparent text-white py-3 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow-md flex justify-center items-center gap-2 cursor-pointer"
                  >
                    {isTxPending || isWaitingBatch ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>
                          Executing Batch Multisend #{currentBatchIndex + 1}...
                        </span>
                      </>
                    ) : (
                      <span>
                        Execute Batch #{currentBatchIndex + 1} Transaction
                      </span>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4 max-w-md mx-auto animate-fade-in">
                  <div className="h-12 w-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">
                      Push Distribution Completed
                    </h3>
                    <p className="text-slate-400 text-xs mt-1">
                      All token batches have been successfully transmitted
                      on-chain.
                    </p>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-4.5 font-mono text-[11px] text-left space-y-1.5 text-slate-300">
                    <div>
                      <span className="text-slate-500">
                        Distribution Contract:
                      </span>{" "}
                      <span className="text-emerald-400 font-bold select-all">
                        {PUSH_AIRDROP_ADDRESS}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Token Address:</span>{" "}
                      <span className="text-slate-400 truncate">
                        {tokenAddress}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Total Transferred:</span>{" "}
                      <span className="text-emerald-400">
                        {formattedTotal} {tokenSymbol}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Total Batches:</span>{" "}
                      <span className="text-slate-400">
                        {pushBatches.length}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/airdrops/${airdrops[0].id}`)}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-semibold text-xs tracking-wide transition-all cursor-pointer mb-2"
                  >
                    View Campaign Details
                  </button>

                  <button
                    onClick={finalizeAirdrop}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 py-3 rounded-xl font-semibold text-xs tracking-wide transition-all cursor-pointer"
                  >
                    Configure New Campaign
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {step < 3 && (
          <div className="mt-6 pt-5 border-t border-slate-900/50 relative z-20">
            <button
              onClick={
                !wallet.isConnected
                  ? connectWallet
                  : step === 2
                    ? () => setStep(3)
                    : handleNextStep
              }
              disabled={
                !wallet.isConnected
                  ? false
                  : step === 1
                    ? isFormInvalid
                    : !hasApprovedAllowance
              }
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-[0.99] ${
                !wallet.isConnected
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/10 cursor-pointer"
                  : (step === 1 ? isFormInvalid : !hasApprovedAllowance)
                    ? "bg-slate-950/40 border border-slate-900/50 text-slate-600 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 cursor-pointer"
              }`}
            >
              {!wallet.isConnected
                ? "Connect Wallet"
                : step === 2
                  ? "Continue to Distribution"
                  : "Continue"}
              <ChevronRight className="h-4 w-4 text-white/80" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
