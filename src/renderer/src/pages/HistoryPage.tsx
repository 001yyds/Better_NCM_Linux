import { useEffect, useState } from 'react'
import { History, LogIn, Play } from 'lucide-react'
import type { Song } from '../../../shared/types'
import { api } from '../lib/api'
import { cn } from '../lib/cn'
import { useAuthStore } from '../store/auth'
import { usePlayerStore } from '../store/player'
import { useUiStore } from '../store/ui'
import { TrackList } from '../components/TrackList'

type Tab = 'recent' | 'week' | 'all'

const TABS: { key: Tab; label: string; hint: string }[] = [
  { key: 'recent', label: '最近播放', hint: 'PC 端最近收听记录' },
  { key: 'week', label: '本周最热', hint: '最近一周播放最多的歌曲' },
  { key: 'all', label: '所有时间', hint: '历史累计播放排行' }
]

export function HistoryPage(): React.JSX.Element {
  const loggedIn = useAuthStore((state) => state.loggedIn)
  const profile = useAuthStore((state) => state.profile)
  const setLoginOpen = useUiStore((state) => state.setLoginOpen)
  const toast = useUiStore((state) => state.toast)
  const playQueue = usePlayerStore((state) => state.playQueue)

  const [tab, setTab] = useState<Tab>('recent')
  const [songs, setSongs] = useState<Song[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!loggedIn || !profile?.userId) return
    let alive = true
    setSongs(null)
    setLoading(true)
    void (async () => {
      try {
        const result =
          tab === 'recent'
            ? await api.user.recent(200, profile.userId)
            : await api.user.playRecord(profile.userId, tab === 'week' ? 1 : 0)
        if (alive) setSongs(result)
      } catch (cause) {
        if (!alive) return
        setSongs([])
        toast(cause instanceof Error ? cause.message : '播放记录加载失败', 'error')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [tab, loggedIn, profile?.userId, toast])

  if (!loggedIn) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-8 pb-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-white/45 bg-white/25 text-brand">
          <History size={26} strokeWidth={1.7} />
        </div>
        <h1 className="mt-5 text-[22px] font-semibold tracking-[-0.02em] text-black/85">登录后查看播放记录</h1>
        <p className="mt-2 max-w-[360px] text-center text-[12px] leading-relaxed text-black/40">
          最近播放与听歌排行都来自你的网易云账号。
        </p>
        <button
          onClick={() => setLoginOpen(true)}
          className="mt-5 flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-[12.5px] font-medium text-white shadow-[0_8px_24px_rgba(255,25,73,0.28)] transition-all duration-200 hover:scale-[1.03] active:scale-95"
        >
          <LogIn size={14} />
          立即登录
        </button>
      </div>
    )
  }

  const active = TABS.find((item) => item.key === tab) ?? TABS[0]

  return (
    <div className="relative min-h-full px-4 pb-10 pt-5 sm:px-8 sm:pb-12 sm:pt-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[320px] bg-[radial-gradient(55%_100%_at_30%_0%,rgba(255,25,73,0.06),transparent_70%)]" />

      <header className="relative mb-5">
        <p className="text-[10px] uppercase tracking-[0.28em] text-black/35 sm:text-[10.5px]">History</p>
        <h1 className="mt-2 text-[27px] font-semibold leading-none tracking-[-0.02em] text-black/90 sm:text-[32px]">
          播放记录
        </h1>
        <p className="mt-2 text-[12px] text-black/40 sm:text-[12.5px]">{active.hint}</p>
      </header>

      <div className="no-scrollbar mb-5 flex items-center gap-2 overflow-x-auto pb-1">
        {TABS.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              'shrink-0 rounded-full border px-3.5 py-1.5 text-[11.5px] transition-all duration-200 active:scale-95',
              tab === item.key
                ? 'border-white/60 bg-white/45 text-black'
                : 'border-white/30 bg-white/10 text-black/45 hover:bg-white/25 hover:text-black'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="glass-panel rounded-[24px] border border-white/40 p-2 pt-3">
        <div className="mb-1 flex items-center justify-between px-3.5 pb-1">
          <span className="text-[12.5px] font-medium text-black/80">{active.label}</span>
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] text-black/35">{songs?.length ?? 0} 首</span>
            {!!songs?.length && (
              <button
                onClick={() => playQueue(songs, 0)}
                className="flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-[10.5px] text-brand transition-colors duration-200 hover:bg-brand/15"
              >
                <Play size={10} fill="currentColor" />
                播放全部
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="skeleton h-12 rounded-[10px]" />
            ))}
          </div>
        ) : songs?.length ? (
          <TrackList songs={songs} />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-black/30">
            <History size={32} strokeWidth={1.2} />
            <p className="mt-3 text-[12px]">还没有播放记录</p>
          </div>
        )}
      </div>
    </div>
  )
}
