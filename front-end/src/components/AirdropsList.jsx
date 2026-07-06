import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../hooks/useApp';
import { Search, ArrowUpRight, SlidersHorizontal, Check, RotateCcw } from 'lucide-react';
import { getCampaignKind } from '../utils/campaignDisplay';

const STATUS_FILTERS = ['All', 'Active', 'Expired', 'Completed'];
const TYPE_FILTERS = ['All', 'Airdrop', 'Multisend'];

const toggleFilter = (currentFilters, value) => {
  if (value === 'All') return ['All'];

  const filtersWithoutAll = currentFilters.filter((filter) => filter !== 'All');
  const nextFilters = filtersWithoutAll.includes(value)
    ? filtersWithoutAll.filter((filter) => filter !== value)
    : [...filtersWithoutAll, value];

  return nextFilters.length > 0 ? nextFilters : ['All'];
};

const FilterGroup = ({ label, options, selected, onChange }) => (
  <div className="space-y-2">
    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
      {label}
    </span>
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isChecked = selected.includes(option);

        return (
          <button
            key={option}
            type="button"
            aria-pressed={isChecked}
            onClick={() => onChange(option)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium transition-all cursor-pointer shadow-sm ${
              isChecked
                ? 'border-indigo-500/30 bg-slate-950 text-slate-100 shadow-indigo-950/20'
                : 'border-slate-800/70 bg-slate-900/35 text-slate-500 hover:border-slate-700 hover:bg-slate-900/60 hover:text-slate-300'
            }`}
          >
            {isChecked && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-white">
                <Check className="h-2.5 w-2.5" />
              </span>
            )}
            <span>{option}</span>
          </button>
        );
      })}
    </div>
  </div>
);

export default function AirdropsList() {
  const { airdrops, campaignStorageStatus } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilters, setStatusFilters] = useState(['All']);
  const [typeFilters, setTypeFilters] = useState(['All']);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const navigate = useNavigate();
  const hasSearchQuery = search.trim().length > 0;
  const isLoadingCampaigns = campaignStorageStatus === 'loading';
  const hasStorageError = campaignStorageStatus === 'error';
  const hasSpecificFilters =
    !statusFilters.includes('All') || !typeFilters.includes('All');
  const activeFilterCount =
    (statusFilters.includes('All') ? 0 : statusFilters.length) +
    (typeFilters.includes('All') ? 0 : typeFilters.length);

  const filtered = airdrops.filter((drop) => {
    const campaignKind = getCampaignKind(drop);
    const matchesSearch =
      (drop.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (drop.symbol || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilters.includes('All') || statusFilters.includes(drop.status);
    const matchesType =
      typeFilters.includes('All') || typeFilters.includes(campaignKind.label);

    return matchesSearch && matchesStatus && matchesType;
  });

  const emptyMessage = isLoadingCampaigns
    ? 'Loading campaigns from MongoDB...'
    : hasStorageError
      ? 'Unable to load campaigns from MongoDB.'
      : hasSearchQuery
        ? 'No campaigns match query terms.'
        : hasSpecificFilters
          ? 'No campaigns match selected filters.'
          : 'No campaigns found in MongoDB yet.';

  const resetFilters = () => {
    setStatusFilters(['All']);
    setTypeFilters(['All']);
  };

  return (
    <div className="max-w-3xl mx-auto mt-16 px-4 text-white animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">All Distributions</h1>
          <p className="text-slate-500 text-xs mt-0.5">Click to know more about a Campaign</p>
        </div>
        
        <div className="relative w-full sm:w-auto">
          <div className="flex w-full items-center gap-2 sm:justify-end">
            <div className="relative min-w-0 flex-1 sm:flex-none">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600" />
              <input
                type="text"
                placeholder="Search campaign"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full bg-slate-900/50 border border-slate-900 focus:border-slate-800 outline-none rounded-xl pl-9 pr-3 text-xs transition-all placeholder:text-slate-600 text-slate-300 sm:w-52"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsFilterPanelOpen((isOpen) => !isOpen)}
              className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition-all cursor-pointer ${
                isFilterPanelOpen || hasSpecificFilters
                  ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'
                  : 'border-slate-900 bg-slate-900/30 text-slate-500 hover:border-slate-800 hover:text-slate-300'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-500 px-1 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          <div
            className={`absolute right-0 top-full z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-900 bg-slate-950/95 shadow-2xl shadow-slate-950/50 transition-all duration-200 sm:w-100 ${
              isFilterPanelOpen
                ? 'max-h-80 opacity-100'
                : 'pointer-events-none max-h-0 border-transparent opacity-0'
            }`}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-900 px-3 py-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-400" />
                <span>Filter Campaigns</span>
              </div>
              <button
                type="button"
                onClick={resetFilters}
                disabled={!hasSpecificFilters}
                className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[11px] font-medium text-slate-500 transition-colors hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Filter</span>
              </button>
            </div>

            <div className="grid gap-4 p-3 sm:grid-cols-2">
              <FilterGroup
                label="Status"
                options={STATUS_FILTERS}
                selected={statusFilters}
                onChange={(option) =>
                  setStatusFilters((current) => toggleFilter(current, option))
                }
              />
              <FilterGroup
                label="Distribution Type"
                options={TYPE_FILTERS}
                selected={typeFilters}
                onChange={(option) =>
                  setTypeFilters((current) => toggleFilter(current, option))
                }
              />
            </div>
          </div>
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
