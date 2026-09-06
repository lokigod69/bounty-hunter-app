import { Link, useLocation } from 'react-router-dom';
import { History, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useActionCounts } from '../../hooks/useActionCounts';
import { useThemeStrings } from '../../hooks/useThemeStrings';
import { PageHeader } from './PageHeader';
import { AppButton } from '../ui';

export function MissionsHeader({ onCreate }: { onCreate?: () => void }) {
  const { t } = useTranslation();
  const { strings } = useThemeStrings();
  const { pathname } = useLocation();
  const { reviewCount, rejectedCount } = useActionCounts();
  return <>
    <PageHeader title={strings.missionsLabel}
      actions={<Link to="/archive" className="inline-flex items-center gap-2 min-h-[44px] text-sm text-white/65 hover:text-white"><History size={16} />{strings.historyLabel}</Link>} />
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <nav aria-label={t('workflow.missionViews')} className="mission-views flex-1">
        {[{ path: '/', label: t('workflow.forYou'), count: rejectedCount }, { path: '/issued', label: t('workflow.sentByYou'), count: reviewCount }].map(item => (
          <Link key={item.path} to={item.path} aria-current={pathname === item.path ? 'page' : undefined}>
            {item.label}{item.count > 0 && <span className="ml-2 rounded-full bg-white/15 px-2 text-xs">{item.count}</span>}
          </Link>
        ))}
      </nav>
      {onCreate ? <AppButton variant="cta" icon={<Plus size={18} />} onClick={onCreate}>{t('workflow.newMission')}</AppButton>
        : <Link to="/issued?create=1" className="new-mission-link"><Plus size={18} />{t('workflow.newMission')}</Link>}
    </div>
  </>;
}
