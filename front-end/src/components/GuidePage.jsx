import { useState } from 'react';
import { Link } from 'react-router';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Coins,
  FileSearch,
  History,
  Layers,
  ListChecks,
  RotateCcw,
  Search,
  ShieldCheck,
  UserCheck,
  Wallet,
} from 'lucide-react';

const roles = [
  {
    id: 'creator',
    label: 'Creator',
    Icon: Layers,
    summary: 'Prepare a token distribution, fund it, and manage campaign outcomes.',
  },
  {
    id: 'recipient',
    label: 'Recipient',
    Icon: UserCheck,
    summary: 'Verify eligibility, understand campaign states, and claim assigned tokens.',
  },
];

const creatorSteps = [
  {
    title: 'Connect the funding wallet',
    body: 'Use the wallet that owns the ERC-20 tokens you want to distribute. The app reads token balance and allowance from this connected address.',
    Icon: Wallet,
  },
  {
    title: 'Choose Airdrop or Multisend',
    body: 'Airdrop creates a pull-claim campaign where recipients claim later. Multisend pushes tokens directly in batches of up to 10 recipients.',
    Icon: Layers,
  },
  {
    title: 'Enter token and recipients',
    body: 'Use the ERC-20 token address, then add rows in the format address, amount. The app validates addresses, parses amounts, and totals the allocation.',
    Icon: ClipboardList,
  },
  {
    title: 'Approve token allowance',
    body: 'Approve the correct spender before distribution. Airdrop uses the factory; Multisend uses the push distribution contract.',
    Icon: ShieldCheck,
  },
  {
    title: 'Deploy or execute batches',
    body: 'For Airdrop, deploy and fund the campaign contract. For Multisend, execute each queued batch transaction until the transfer queue completes.',
    Icon: Coins,
  },
  {
    title: 'Review and finish',
    body: 'Open Campaigns to inspect saved campaign details. For expired pull campaigns, the creator can refund unclaimed tokens from the campaign detail page.',
    Icon: History,
  },
];

const recipientSteps = [
  {
    title: 'Connect the claiming wallet',
    body: 'Connect the wallet address that was included in the creator recipient list. Eligibility is checked against that connected address.',
    Icon: Wallet,
  },
  {
    title: 'Find the campaign contract',
    body: 'Open a shared campaign link, copy the campaign contract from Campaigns, or enter the campaign contract address directly on the Claim page.',
    Icon: Search,
  },
  {
    title: 'Verify eligibility',
    body: 'The app checks the stored campaign list, your recipient allocation, whether the campaign expired, and whether this wallet has already claimed.',
    Icon: FileSearch,
  },
  {
    title: 'Confirm and claim',
    body: 'Once eligible, review the token amount, accept the claim confirmation, and submit the transaction from your wallet.',
    Icon: CheckCircle2,
  },
];

const statusNotes = [
  {
    title: 'Already claimed',
    body: 'The connected wallet has already completed its claim for this pull campaign.',
    Icon: CheckCircle2,
    className: 'border-amber-500/15 bg-amber-500/5 text-amber-300',
  },
  {
    title: 'Not eligible',
    body: 'The connected wallet was not part of the original recipient allocation list.',
    Icon: AlertTriangle,
    className: 'border-red-500/15 bg-red-500/5 text-red-300',
  },
  {
    title: 'Expired',
    body: 'The claim deadline passed. Recipients can no longer claim, and creators may be able to refund remaining tokens.',
    Icon: RotateCcw,
    className: 'border-slate-700/60 bg-slate-900/50 text-slate-300',
  },
];

const quickLinks = [
  {
    label: 'Create Distribution',
    description: 'Start a new Airdrop or Multisend flow.',
    to: '/',
  },
  {
    label: 'View Campaigns',
    description: 'Search saved campaigns and open campaign details.',
    to: '/airdrops',
  },
  {
    label: 'Claim Tokens',
    description: 'Verify a pull campaign and claim an allocation.',
    to: '/claim',
  },
];

const StepCard = ({ step, index }) => {
  const StepIcon = step.Icon;

  return (
    <article className="rounded-2xl border border-slate-900 bg-slate-900/30 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-indigo-300">
          <StepIcon className="h-4 w-4" />
        </div>
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
          Step {index + 1}
        </span>
      </div>
      <h3 className="text-sm font-semibold text-slate-100">{step.title}</h3>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">{step.body}</p>
    </article>
  );
};

export default function GuidePage() {
  const [activeRole, setActiveRole] = useState('creator');
  const activeRoleDetails = roles.find((role) => role.id === activeRole);
  const ActiveRoleIcon = activeRoleDetails.Icon;
  const visibleSteps = activeRole === 'creator' ? creatorSteps : recipientSteps;

  return (
    <div className="mx-auto max-w-5xl px-4 pt-12 text-slate-100 animate-fade-in">
      <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">
            Multidrop Guide
          </span>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">
            Work with campaigns confidently
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Follow the role that matches your task, then jump into the matching workflow when you are ready.
          </p>
        </div>

        <div className="flex w-full rounded-2xl border border-slate-900 bg-slate-950/60 p-1 shadow-inner md:w-auto">
          {roles.map((role) => {
            const RoleIcon = role.Icon;
            const isActive = role.id === activeRole;

            return (
              <button
                key={role.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveRole(role.id)}
                className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold transition-all cursor-pointer md:min-w-32 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-500 hover:bg-slate-900/70 hover:text-slate-300'
                }`}
              >
                <RoleIcon className="h-3.5 w-3.5" />
                <span>{role.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <section className="mb-6 rounded-2xl border border-slate-900 bg-slate-900/35 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-300">
              <ActiveRoleIcon className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                {activeRoleDetails.label} workflow
              </h2>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">
                {activeRoleDetails.summary}
              </p>
            </div>
          </div>
          <Link
            to={activeRole === 'creator' ? '/' : '/claim'}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white shadow-md shadow-indigo-600/10 transition-colors hover:bg-indigo-500"
          >
            <span>{activeRole === 'creator' ? 'Start Setup' : 'Start Claim'}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {visibleSteps.map((step, index) => (
          <StepCard key={step.title} step={step} index={index} />
        ))}
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <div className="rounded-2xl border border-slate-900 bg-slate-900/30 p-5">
          <div className="mb-4 flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-indigo-300" />
            <h2 className="text-sm font-semibold text-slate-100">Claim result states</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {statusNotes.map((note) => {
              const NoteIcon = note.Icon;

              return (
                <div
                  key={note.title}
                  className={`rounded-xl border p-3 ${note.className}`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <NoteIcon className="h-3.5 w-3.5" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider">
                      {note.title}
                    </h3>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    {note.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-900 bg-slate-900/30 p-5">
          <div className="mb-4 flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-indigo-300" />
            <h2 className="text-sm font-semibold text-slate-100">Go to workflow</h2>
          </div>
          <div className="space-y-3">
            {quickLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-900 bg-slate-950/45 p-3 transition-all hover:border-slate-800 hover:bg-slate-950"
              >
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold text-slate-200">{link.label}</h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                    {link.description}
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-600" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
