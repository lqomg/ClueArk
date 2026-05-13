import { useParams } from 'react-router-dom';
import { MonitorSettingsForm } from '@/pages/app/monitors/MonitorSettingsForm';

export function MonitorSettingsPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <p className="text-sm text-slate-500">无效的监控 ID</p>;
  }

  return <MonitorSettingsForm monitorId={id} mode="page" />;
}
