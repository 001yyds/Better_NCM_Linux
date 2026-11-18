import { useEffect, useState } from 'react'
import { LayoutGrid, Loader2 } from 'lucide-react'
import type { Playlist, PlaylistCatalogue } from '../../../shared/types'
import { api } from '../lib/api'
import { cn } from '../lib/cn'
import { useUiStore } from '../store/ui'
import { PlaylistCard } from '../components/PlaylistCard'

const PAGE_SIZE = 30

export function SquarePage(): React.JSX.Element {
  const toast = useUiStore((state) => state.toast)
  const [catalogue, setCatalogue] = useState<PlaylistCatalogue | null>(null)
  const [cat, setCat] = useState('全部')
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [lasttime, setLasttime] = useState(0)
  const [more, setMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    let alive = true
    api.playlist
      .catalogue()
      .then((result) => {
        if (alive) setCatalogue(result)
      })
      .catch(() => {
        if (alive) toast('歌单分类加载失败', 'error')
      })
    return () => {
      alive = false
    }
  }, [toast])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setPlaylists([])
    setLasttime(0)
    setMore(false)
    api.playlist
      .highquality({ cat, limit: PAGE_SIZE, lasttime: 0 })
      .then((result) => {
        if (!alive) return
        setPlaylists(result.playlists)
        setLasttime(result.lasttime ?? 0)
        setMore(result.more)
      })
      .catch(() => {
        if (alive) toast('精品歌单加载失败', 'error')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [cat, toast])

  const loadMore = async (): Promise<void> => {
    if (loadingMore || !more) return
    setLoadingMore(true)
    try {
      const result = await api.playlist.highquality({
        cat,
        limit: PAGE_SIZE,
        lasttime
      })
      const known = new Set(playlists.map((item) => item.id))
      setPlaylists([...playlists, ...result.playlists.filter((item) => !known.has(item.id))])
      setLasttime(result.lasttime ?? lasttime)
      setMore(result.more)
    } catch {
      toast('加载更多失败', 'error')
    } finally {
      setLoadingMore(false)
    }
  }

  const categories = catalogue?.sub ?? []

  return (
    <div className="relative min-h-full px-4 pb-10 pt-5 sm:px-8 sm:pb-12 sm:pt-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[340px] bg-[radial-gradient(60%_100%_at_30%_0%,rgba(255,25,73,0.07),transparent_72%)]" />

      <header className="relative mb-5">
        <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.28em] text-black/35 sm:text-[10.5px]">
          <LayoutGrid size={11} className="text-brand" />
          Playlist Square
        </p>
        <h1 className="mt-2 text-[27px] font-semibold leading-none tracking-[-0.02em] text-black/90 sm:text-[32px]">
          歌单广场
        </h1>
        <p className="mt-2 text-[12px] text-black/40 sm:text-[12.5px]">
          来自全站的精品歌单，按分类浏览
        </p>
      </header>

      <div className="no-scrollbar relative -mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1">
        {['全部', ...categories.map((item) => item.name)].map((name) => (
          <button
            key={name}
            onClick={() => setCat(name)}
            className={cn(
              'shrink-0 rounded-full border px-3.5 py-1.5 text-[11.5px] transition-all duration-200 active:scale-95',
              cat === name
                ? 'border-white/60 bg-white/45 text-black'
                : 'border-white/30 bg-white/10 text-black/45 hover:bg-white/25 hover:text-black'
            )}
          >
            {name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-x-4 gap-y-6 xl:gap-x-5">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index}>
              <div className="skeleton aspect-square w-full rounded-[22px]" />
              <div className="skeleton mt-3 h-3 w-3/4 rounded" />
            </div>
          ))}
        </div>
      ) : playlists.length ? (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-x-4 gap-y-6 xl:gap-x-5">
            {playlists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </div>
          {more && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="flex items-center gap-2 rounded-full border border-white/45 bg-white/20 px-5 py-2 text-[11.5px] text-black/55 transition-all duration-200 hover:bg-white/35 hover:text-black active:scale-95 disabled:opacity-50"
              >
                {loadingMore && <Loader2 size={12} className="animate-spin" />}
                {loadingMore ? '加载中…' : '加载更多'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-black/30">
          <LayoutGrid size={34} strokeWidth={1.2} />
          <p className="mt-3 text-[12px]">这个分类下暂时没有歌单</p>
        </div>
      )}
    </div>
  )
}
