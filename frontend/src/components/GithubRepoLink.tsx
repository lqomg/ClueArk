import { Github } from 'lucide-react';
import { GITHUB_REPO_LABEL, GITHUB_REPO_URL } from '@/constants/site';

export function GithubRepoLink({
  showUrl = true,
  iconSize = 18,
  className = '',
}: {
  showUrl?: boolean;
  iconSize?: number;
  className?: string;
}) {
  return (
    <a
      href={GITHUB_REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex max-w-full items-center gap-2 rounded-lg text-slate-500 transition-colors hover:text-ark-accent ${className}`}
      aria-label={`开源仓库 ${GITHUB_REPO_LABEL}`}
    >
      <Github size={iconSize} className="shrink-0" />
      {showUrl ? (
        <span className="truncate font-mono text-[11px] tracking-tight text-slate-600 hover:text-ark-accent/90">
          {GITHUB_REPO_LABEL}
        </span>
      ) : null}
    </a>
  );
}
