import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getHomeFeed, getMorningBriefing } from '@/api/developments';
import type {
  HomeFeedResponse,
  HomeFeedStreamTab,
  HomeFeedTab,
  MorningBriefingResponse,
} from '@/types/models';
import { normalizeUserTimeZone } from '@/lib/datetime';
import { useAuthStore } from '@/stores/authStore';
import { HomeTopicLanding } from './components/HomeTopicLanding';

const HOME_PAGE_LIMIT = 20;

type StreamCache = {
  items: HomeFeedResponse['items'];
  nextCursor: string | null;
  hasMore: boolean;
  loaded: boolean;
};

type BriefingCache = {
  data: MorningBriefingResponse | null;
  loaded: boolean;
};

const EMPTY_STREAM: StreamCache = {
  items: [],
  nextCursor: null,
  hasMore: false,
  loaded: false,
};

function emptyStreamCache(): Record<HomeFeedStreamTab, StreamCache> {
  return {
    subscribed: { ...EMPTY_STREAM },
    recommended: { ...EMPTY_STREAM },
  };
}

function isStreamTab(tab: HomeFeedTab): tab is HomeFeedStreamTab {
  return tab === 'subscribed' || tab === 'recommended';
}

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const userTimeZone = normalizeUserTimeZone(useAuthStore((state) => state.user?.timeZone));

  const requestSeq = useRef(0);
  const loadingMoreRef = useRef(false);
  const skipNextLoad = useRef(false);
  const defaultTabResolved = useRef(false);
  const userPickedTab = useRef(false);
  const tabRef = useRef<HomeFeedTab>('briefing');

  const [tab, setTab] = useState<HomeFeedTab>('briefing');
  tabRef.current = tab;
  const [cache, setCache] = useState<Record<HomeFeedStreamTab, StreamCache>>(emptyStreamCache);
  const [briefing, setBriefing] = useState<BriefingCache>({ data: null, loaded: false });
  const cacheRef = useRef(cache);
  cacheRef.current = cache;
  const briefingRef = useRef(briefing);
  briefingRef.current = briefing;

  const [readableMonitorCount, setReadableMonitorCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = isStreamTab(tab) ? cache[tab] : EMPTY_STREAM;

  const writeStreamTab = useCallback((target: HomeFeedStreamTab, page: HomeFeedResponse, append: boolean) => {
    setReadableMonitorCount(page.readableMonitorCount);
    setCache((prev) => {
      const prevTab = prev[target];
      return {
        ...prev,
        [target]: {
          items: append ? [...prevTab.items, ...page.items] : page.items,
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
          loaded: true,
        },
      };
    });
  }, []);

  const writeBriefing = useCallback((page: MorningBriefingResponse) => {
    setReadableMonitorCount(page.readableMonitorCount);
    setBriefing({ data: page, loaded: true });
  }, []);

  const loadBriefing = useCallback(
    async (opts?: { soft?: boolean }) => {
      const seq = ++requestSeq.current;
      const soft = opts?.soft === true && briefingRef.current.loaded;
      setError(null);
      if (!soft) setLoading(!briefingRef.current.loaded);
      try {
        const page = await getMorningBriefing();
        if (seq !== requestSeq.current) return;
        if (!defaultTabResolved.current && !userPickedTab.current) {
          defaultTabResolved.current = true;
          writeBriefing(page);
          if (page.readableMonitorCount === 0) {
            const rec = await getHomeFeed({ tab: 'recommended', limit: HOME_PAGE_LIMIT });
            if (seq !== requestSeq.current) return;
            skipNextLoad.current = true;
            setTab('recommended');
            writeStreamTab('recommended', rec, false);
            return;
          }
          if ((page.stats?.pulseCount ?? 0) === 0) {
            const sub = await getHomeFeed({ tab: 'subscribed', limit: HOME_PAGE_LIMIT });
            if (seq !== requestSeq.current) return;
            skipNextLoad.current = true;
            setTab('subscribed');
            writeStreamTab('subscribed', sub, false);
            return;
          }
          if (tabRef.current !== 'briefing') {
            skipNextLoad.current = true;
            setTab('briefing');
          }
          return;
        }
        if (!defaultTabResolved.current) defaultTabResolved.current = true;
        writeBriefing(page);
      } catch (e) {
        if (seq !== requestSeq.current) return;
        setError(e instanceof Error ? e.message : t('common.loadFailed'));
        if (!soft) setBriefing({ data: null, loaded: true });
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    },
    [t, writeBriefing, writeStreamTab],
  );

  const loadFirstPage = useCallback(
    async (nextTab: HomeFeedStreamTab, opts?: { soft?: boolean }) => {
      const seq = ++requestSeq.current;
      const soft = opts?.soft === true && cacheRef.current[nextTab].loaded;
      setError(null);
      if (!soft) setLoading(!cacheRef.current[nextTab].loaded);
      try {
        const page = await getHomeFeed({ tab: nextTab, limit: HOME_PAGE_LIMIT });
        if (seq !== requestSeq.current) return;
        writeStreamTab(nextTab, page, false);
      } catch (e) {
        if (seq !== requestSeq.current) return;
        setError(e instanceof Error ? e.message : t('common.loadFailed'));
        if (!soft) {
          setCache((prev) => ({
            ...prev,
            [nextTab]: { ...EMPTY_STREAM, loaded: true },
          }));
        }
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    },
    [t, writeStreamTab],
  );

  const loadMore = useCallback(async () => {
    if (!isStreamTab(tab)) return;
    const snap = cacheRef.current[tab];
    if (!snap.hasMore || !snap.nextCursor || loadingMoreRef.current || loading) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setError(null);
    const targetTab = tab;
    const cursor = snap.nextCursor;
    try {
      const page = await getHomeFeed({ tab: targetTab, limit: HOME_PAGE_LIMIT, cursor });
      writeStreamTab(targetTab, page, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.loadFailed'));
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [loading, t, tab, writeStreamTab]);

  useEffect(() => {
    if (skipNextLoad.current) {
      skipNextLoad.current = false;
      return;
    }
    if (!defaultTabResolved.current && !userPickedTab.current) {
      const soft = briefingRef.current.loaded;
      void loadBriefing(soft ? { soft: true } : undefined);
      return;
    }
    if (tab === 'briefing') {
      const soft = briefingRef.current.loaded;
      void loadBriefing(soft ? { soft: true } : undefined);
      return;
    }
    const soft = cacheRef.current[tab].loaded;
    void loadFirstPage(tab, soft ? { soft: true } : undefined);
  }, [loadBriefing, loadFirstPage, tab]);

  const handleTabChange = useCallback((next: HomeFeedTab) => {
    if (next === tab) return;
    userPickedTab.current = true;
    defaultTabResolved.current = true;
    setError(null);
    setLoadingMore(false);
    loadingMoreRef.current = false;
    setTab(next);
  }, [tab]);

  const handleRetry = useCallback(() => {
    if (tab === 'briefing') void loadBriefing();
    else void loadFirstPage(tab);
  }, [loadBriefing, loadFirstPage, tab]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <HomeTopicLanding
        tab={tab}
        items={current.items}
        briefing={briefing.data}
        briefingLoaded={briefing.loaded}
        loading={loading && (tab === 'briefing' ? !briefing.loaded : !current.loaded)}
        loadingMore={loadingMore}
        hasMore={current.hasMore}
        error={error}
        timeZone={userTimeZone}
        readableMonitorCount={readableMonitorCount}
        onTabChange={handleTabChange}
        onRetry={handleRetry}
        onLoadMore={() => void loadMore()}
        onCreateTopic={() => navigate('/app/my-topics')}
      />
    </div>
  );
}
