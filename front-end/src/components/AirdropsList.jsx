import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../hooks/useApp';
import { Search, ArrowUpRight } from 'lucide-react';
import { getCampaignKind } from '../utils/campaignDisplay';

export default function AirdropsList() {
  const { airdrops, campaignStorageStatus } = useApp();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const hasSearchQuery = search.trim().length > 0;
  const isLoadingCampaigns = campaignStorageStatus === 'loading';
  const hasStorageError = campaignStorageStatus === 'error';

  const filtered = airdrops.filter(drop =>
    (drop.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (drop.symbol || '').toLowerCase().includes(search.toLowerCase())
  );

  const emptyMessage = isLoadingCampaigns
    ? 'Loading campaigns from MongoDB...'
    : hasStorageError
      ? 'Unable to load campaigns from MongoDB.'
      : hasSearchQuery
        ? 'No campaigns match query terms.'
        : 'No campaigns found in MongoDB yet.';

  return (
    <div className="max-w-3xl mx-auto mt-16 px-4 text-white animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">All Distributions</h1>
          <p className="text-slate-500 text-xs mt-0.5">Click to know more about a Campaign</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600" />
          <input
            type="text"
            placeholder="Search with campaign name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-900/50 border border-slate-900 focus:border-slate-800 outline-none rounded-xl pl-9 pr-4 py-2 text-xs w-full sm:w-64 transition-all placeholder:text-slate-600 text-slate-300"
          />
        </div>
      </div>

      <div className="space-y-3">
        {isLoadingCampaigns || filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-600 text-xs bg-slate-900/20 border border-dashed border-slate-900 rounded-2xl">
            {emptyMessage}
          </div>
        ) : (
          filtered.map(drop => {
            const campaignKind = getCampaignKind(drop);
            const CampaignKindIcon = campaignKind.Icon;

            return (
              <div 
                key={drop.id}
                onClick={() => navigate(`/airdrops/${drop.id}`)}
                className="p-4.5 bg-slate-900/30 border border-slate-900 hover:border-slate-800/80 rounded-2xl cursor-pointer transition-all duration-300 flex items-center justify-between gap-4 group hover:-translate-y-0.5 shadow-sm"
              >
                <div className="flex items-center space-x-4 min-w-0">
                  <div className="h-11 w-11 rounded-xl bg-slate-950 border border-slate-900 flex items-center justify-center text-xs font-bold text-slate-400 group-hover:text-indigo-400 transition-colors shrink-0">
                    {(drop.symbol || 'DROP').slice(0, 4)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors truncate">{drop.name}</h4>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-semibold tracking-wide uppercase ${campaignKind.className}`}>
                        <CampaignKindIcon className="h-3 w-3" />
                        {campaignKind.label}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-slate-600 mt-0.5 truncate">{drop.address || 'No contract address'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-5 shrink-0">
                  <div className="text-right">
                    {/* Dynamic Status Badges matching global state updates */}
                    <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-md mb-1 border ${
                      drop.status === 'Expired'
                        ? 'bg-red-500/5 text-red-400 border-red-500/10'
                        : drop.status === 'Completed'
                          ? 'bg-slate-800/85 text-slate-400 border-slate-700/50'
                          : 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10'
                    }`}>
                      {drop.status || 'Draft'}
                    </span>
                    <p className="text-xs font-medium text-slate-400">{drop.totalAllocation || '0'} {drop.symbol || 'TOKEN'}</p>
                  </div>
                  <div className="p-1 rounded-lg bg-slate-950 border border-slate-900 opacity-60 group-hover:opacity-100 group-hover:border-slate-700 transition-all">
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-200" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
