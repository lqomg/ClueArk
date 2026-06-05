import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

export function HomeStatusBar() {
  const { t } = useTranslation();
  const utcLabel = dayjs.utc().format('YYYY.MM.DD // HH:mm UTC');

  return (
    <footer className="mt-4 hidden shrink-0 items-center justify-between gap-4 border-t border-white/[0.06] py-2 font-mono text-[10px] uppercase tracking-wider text-slate-600 md:flex">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>{t('home.statusOk')}</span>
        <span className="text-ark-accent/70">{t('home.radarRunning')}</span>
      </div>
      <span className="tabular-nums">{utcLabel}</span>
    </footer>
  );
}
