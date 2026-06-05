import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MonitorSettingsForm } from '@/pages/app/monitors/MonitorSettingsForm';

export function MonitorSettingsPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <p className="text-sm text-slate-500">{t('monitors.invalidId')}</p>;
  }

  return <MonitorSettingsForm monitorId={id} />;
}
