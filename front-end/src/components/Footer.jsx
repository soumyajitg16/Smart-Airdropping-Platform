import { ChevronDown, ExternalLink, FileText, Link2, Mail } from 'lucide-react';
import { useState } from 'react';

const projects = [
  {
    name: 'TokenForge ERC20 Launchpad',
    docsUrl: 'https://docs.google.com/document/d/1cCSKMPbehUG2iVP8hdIpNjOjKUSjMcgkmVgGlE4q6KM/edit?usp=sharing',
    liveUrl: 'https://tokenforgex.vercel.app/',
  },
  {
    name: 'Multidrop Platform',
    docsUrl: 'https://docs.google.com/document/d/1jhULJ8I5ey0-XADmybSQNRu7NloZIAosqvDBLW4NfM4/edit?usp=sharing',
    liveUrl: 'https://multidropx.vercel.app/',
  },
  {
    name: 'Fractionalized NFT Marketplace',
  },
  {
    name: 'Next Generation EV Charging using Blockchain',
    docsUrl: 'https://docs.google.com/document/d/12l901M1WAVoVqAlO8C2zc6vIIOHcvWNh70fRLHQLE0c/edit?usp=sharing',
  },
];

const projectLinkClasses =
  'inline-flex items-center gap-1.5 rounded-lg border border-slate-900/70 bg-slate-950/20 px-2 py-1 text-[10px] font-semibold text-slate-600 transition-all hover:border-indigo-500/40 hover:text-indigo-300';

const ProjectLink = ({ children, href, Icon }) => {
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={projectLinkClasses}>
        <Icon className="h-3 w-3" />
        <span>{children}</span>
      </a>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-900/70 bg-slate-950/20 px-2 py-1 text-[10px] font-semibold text-slate-600">
      <Icon className="h-3 w-3" />
      <span>{children}</span>
    </span>
  );
};

const contactLinkClasses =
  'inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-900/70 bg-slate-950/20 px-2 py-1 text-[10px] font-semibold text-slate-600 transition-all hover:border-indigo-500/40 hover:text-indigo-300';

export default function Footer() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <footer className="border-t border-slate-900/80 px-4 py-4 text-slate-400 backdrop-blur-xl sm:px-6">
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() => setIsOpen((currentValue) => !currentValue)}
          aria-expanded={isOpen}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-800/80 bg-slate-900/60 px-3.5 py-2 text-xs font-semibold text-slate-200 shadow-sm transition-all hover:border-indigo-500/40 hover:bg-slate-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 cursor-pointer"
        >
          <Link2 className="h-3.5 w-3.5 text-indigo-300" />
          <span>Important Links</span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      <div
        className={`mx-auto grid max-w-7xl items-start gap-5 overflow-hidden transition-all duration-300 md:grid-cols-[1fr_20rem] ${
          isOpen
            ? 'mt-5 max-h-160 opacity-100'
            : 'max-h-0 pointer-events-none opacity-0'
        }`}
      >
        <section className="rounded-2xl border border-slate-900 bg-slate-900/20 p-4 shadow-sm">
          <div className="mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">
              Other Projects
            </span>
            <h2 className="mt-1 text-sm font-semibold text-slate-100">
              Explore more blockchain builds
            </h2>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {projects.map((project) => (
              <article
                key={project.name}
                className="flex flex-col gap-2 rounded-xl border border-slate-900 bg-slate-900/30 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <h3 className="min-w-0 text-xs font-semibold text-slate-100">{project.name}</h3>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  <ProjectLink href={project.docsUrl} Icon={FileText}>
                    Docs
                  </ProjectLink>
                  <ProjectLink href={project.liveUrl} Icon={ExternalLink}>
                    Live
                  </ProjectLink>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-900 bg-slate-900/20 p-4 shadow-sm">
          <div className="mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">
              Contact
            </span>
            <h2 className="mt-1 text-sm font-semibold text-slate-100">
              Reach out
            </h2>
          </div>
          <div className="grid gap-2">
            <article className="flex items-center justify-between gap-3 rounded-xl border border-slate-900 bg-slate-900/30 p-3 shadow-sm">
              <h3 className="min-w-0 text-xs font-semibold text-slate-100">Email</h3>
              <a
                href="mailto:soumyajitg16@gmail.com"
                aria-label="Email Soumyajit"
                className={contactLinkClasses}
              >
                <Mail className="h-3 w-3" />
                <span>Open</span>
              </a>
            </article>
            <article className="flex items-center justify-between gap-3 rounded-xl border border-slate-900 bg-slate-900/30 p-3 shadow-sm">
              <h3 className="min-w-0 text-xs font-semibold text-slate-100">LinkedIn</h3>
              <a
                href="https://www.linkedin.com/in/soumyajitg16"
                target="_blank"
                rel="noreferrer"
                className={contactLinkClasses}
              >
                <span className="flex h-3 w-3 items-center justify-center rounded-[3px] border border-current text-[8px] font-bold leading-none">
                  in
                </span>
                <span>Open</span>
              </a>
            </article>
          </div>
        </section>
      </div>
    </footer>
  );
}
