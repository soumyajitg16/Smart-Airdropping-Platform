import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { Search, ArrowUpRight } from 'lucide-react';

export default function AirdropsList() {
  const { airdrops } = useApp();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const filtered = airdrops.filter(drop =>
    drop.name.toLowerCase().includes(search.toLowerCase()) ||
    drop.symbol.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto mt-16 px-4 text-white animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">All Distributions</h1>
          <p className="text-slate-500 text-xs mt-0.5">Click to know more about a campaign</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600" />
          <input
            type="text"
            placeholder="Search indexing..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-900/50 border border-slate-900 focus:border-slate-800 outline-none rounded-xl pl-9 pr-4 py-2 text-xs w-full sm:w-64 transition-all placeholder:text-slate-600 text-slate-300"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-600 text-xs bg-slate-900/20 border border-dashed border-slate-900 rounded-2xl">
            No active campaigns match query terms.
          </div>
        ) : (
          filtered.map(drop => (
            <div 
              key={drop.id}
              onClick={() => navigate(`/airdrops/${drop.id}`)}
              className="p-4.5 bg-slate-900/30 border border-slate-900 hover:border-slate-800/80 rounded-2xl cursor-pointer transition-all duration-300 flex items-center justify-between group hover:-translate-y-0.5 shadow-sm"
            >
              <div className="flex items-center space-x-4">
                <div className="h-11 w-11 rounded-xl bg-slate-950 border border-slate-900 flex items-center justify-center text-xs font-bold text-slate-400 group-hover:text-indigo-400 transition-colors">
                  {drop.symbol.slice(0, 4)}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">{drop.name}</h4>
                  <p className="text-xs font-mono text-slate-600 mt-0.5">{drop.address}</p>
                </div>
              </div>

              <div className="flex items-center space-x-5">
                <div className="text-right">
                  <span className="inline-block px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-md bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 mb-1">
                    {drop.status}
                  </span>
                  <p className="text-xs font-medium text-slate-400">{drop.totalAllocation} {drop.symbol}</p>
                </div>
                <div className="p-1 rounded-lg bg-slate-950 border border-slate-900 opacity-60 group-hover:opacity-100 group-hover:border-slate-700 transition-all">
                  <ArrowUpRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-200" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// import { useWatchContractEvent } from 'wagmi';
// import { parseAbi } from 'viem';

// // Human-readable contract ABI structure definition
// const messageBoardAbi = parseAbi([
//   'event MessagePosted(address indexed user, string message, uint256 timestamp)'
// ]);
// const CONTRACT_ADDRESS = '0xYourContractAddressHere';

// function Event() {
//   const [liveLogs, setLiveLogs] = useState([]);

//   // Listens to incoming Solidity events in real-time
//   useWatchContractEvent({
//     address: CONTRACT_ADDRESS,
//     abi: messageBoardAbi,
//     eventName: 'MessagePosted',
//     onLogs(logs) {
//       const formatted = logs.map(log => ({
//         sender: log.args.user,
//         text: log.args.message,
//         // Convert BigInt blockchain values to standard string outputs
//         time: new Date(Number(log.args.timestamp) * 1000).toLocaleTimeString()
//       }));

//       // Append new block events directly onto the visible component state
//       setLiveLogs(prev => [...formatted, ...prev]);
//     },
//   });

//   return (
//     <div style={{ padding: '24px', fontFamily: 'system-ui' }}>
//       <h1>⚡ Vite Real-time Web3 Events Feed</h1>
//       <p>Listening to contract: <code>{CONTRACT_ADDRESS}</code></p>
      
//       <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
//         {liveLogs.length === 0 ? (
//           <p>Waiting for a new transaction event to be emitted on-chain...</p>
//         ) : (
//           <ul>
//             {liveLogs.map((log, index) => (
//               <li key={index} style={{ marginBottom: '12px' }}>
//                 <strong>User:</strong> {log.sender} <br/>
//                 <strong>Message:</strong> "{log.text}" <br/>
//                 <small style={{ color: '#666' }}>Received at: {log.time}</small>
//               </li>
//             ))}
//           </ul>
//         )}
//       </div>
//     </div>
//   );
// }