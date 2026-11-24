import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Compass } from 'lucide-react';
import { myTopicsPath, topicsOverviewPath } from '@/pages/app/topics/paths';

/** 阶段 2：精选占位，对齐观枢侧栏「发现」入口；内容待后续官方目录。 */
export function ExplorePage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-0 flex-1 flex-col items-start justify-center gap-4 px-2 py-10">
      <div className="flex items-center gap-2 text-ark-accent">
        <Compass size={22} />
        <h1 className="text-lg font-semibold text-white">{t('explore.title')}</h1>
      </div>
      <p className="max-w-md text-sm leading-6 text-slate-400">{t('explore.placeholder')}</p>
      <div className="flex flex-wrap gap-3 text-sm">
        <Link to={topicsOverviewPath()} className="text-ark-accent underline-offset-4 hover:underline">
          {t('nav.topics')}
        </Link>
        <Link to={myTopicsPath()} className="text-slate-400 underline-offset-4 hover:underline">
          {t('nav.myTopics')}
        </Link>
      </div>
    </div>
  );
}
