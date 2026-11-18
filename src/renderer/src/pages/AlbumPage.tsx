import { useEffect, useState } from 'react'
import { Disc3, Heart, Play } from 'lucide-react'
import type { AlbumPageData } from '../../../shared/api'
import { api, coverUrl } from '../lib/api'
import { cn } from '../lib/cn'
import { formatCount } from '../lib/format'
import { useAuthStore } from '../store/auth'
import { usePlayerStore } from '../store/player'
import { useUiStore } from '../store/ui'
import { Cover } from '../components/Cover'
import { TrackList } from '../components/TrackList'

export function AlbumPage({
  id,
  title
}: {
  id: number
  title?: string
}): React.JSX.Element {
  const navigate = useUiStore((state) => state.navigate)
  const toast = useUiStore((state) => state.toast)
  const setLoginOpen = useUiStore((state) => state.setLoginOpen)
  const loggedIn = useAuthStore((state) => state.loggedIn)
  const playQueue = usePlayerStore((state) => state.playQueue)

  const [data, setData] = useState<AlbumPageData | null>(null)
  const [error, setError] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    let alive = true
    setData(null)
    setError(false)
    api.album
      .detail(id)
      .then((result) => {
        if (!alive) return
        setData(result)
        setSubscribed(!!result.album.followed)
      })
      .catch(() => {
        if (!alive) return
        setError(true)
        toast('专辑信息加载失败', 'error')
      })
    return () => {
      alive = false
    }
  }, [id, toast])

  const toggleSubscribe = async (): Promise<void> => {
    if (!loggedIn) {
      setLoginOpen(true)
      return
    }
    if (subscribing) return
    setSubscribing(true)
    const next = !subscribed
    setSubscribed(next)
    try {
      await api.album.subscribe(id, next)
      toast(next ? '已收藏专辑' : '已取消收藏', 'success')
    } catch (cause) {
      setSubscribed(!next)
      toast(cause instanceof Error ? cause.message : '操作失败', 'error')
    } finally {
      setSubscribing(false)
    }
  }

  if (error) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 text-black/40">
        <p className="text-[13px]">专辑不存在或加载失败</p>
        <button
          onClick={() => navigate({ page: 'home' })}
          className="rounded-full border border-black/10 bg-white/40 px-4 py-1.5 text-[11.5px] transition-all duration-200 hover:bg-white/70 hover:text-black"
        >
          回到首页
        </button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="px-4 pt-6 sm:px-8 sm:pt-10">
        <div className="flex items-end gap-6">
          <div className="skeleton h-[128px] w-[128px] rounded-[20px] sm:h-[186px] sm:w-[186px]" />
          <div className="flex-1 space-y-3 pb-2">
            <div className="skeleton h-3 w-24 rounded" />
            <div className="skeleton h-8 w-2/3 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
          </div>
        </div>
        <div className="mt-10 space-y-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="skeleton h-12 rounded-[10px]" />
          ))}
        </div>
      </div>
    )
  }

  const album = data.album
  const cover = coverUrl(album.picUrl, 700)
  const artist = album.artist ?? album.artists?.[0]
  const publish = album.publishTime
    ? new Date(album.publishTime).toLocaleDateString('zh-CN')
    : ''

  return (
    <div className="relative min-h-full pb-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[380px] overflow-hidden">
        {cover && (
          <img
            src={cover}
            alt=""
            className="h-full w-full scale-125 object-cover opacity-20 blur-[80px] saturate-125"
            draggable={false}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/25 to-transparent" />
      </div>

      <div className="relative px-4 pt-6 sm:px-8 sm:pt-9">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
          <Cover
            src={cover}
            radius={18}
            className="h-[128px] w-[128px] shrink-0 shadow-[0_22px_50px_-22px_rgba(0,0,0,0.45)] sm:h-[186px] sm:w-[186px]"
          />
          <div className="min-w-0 flex-1 pb-1">
            <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.3em] text-black/40 sm:text-[9.5px]">
              <Disc3 size={10} className="text-brand" />
              Album
              {album.subType ? <span>· {album.subType}</span> : null}
            </div>
            <h1 className="mt-1.5 line-clamp-3 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-black/90 sm:mt-2 sm:text-[28px] xl:text-[32px]">
              {album.name || title}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10.5px] text-black/45 sm:mt-3 sm:gap-2 sm:text-[11.5px]">
              {artist ? (
                <button
                  onClick={() => navigate({ page: 'artist', id: artist.id, title: artist.name })}
                  className="text-black/65 transition-colors hover:text-brand"
                >
                  {artist.name}
                </button>
              ) : (
                <span className="text-black/60">未知歌手</span>
              )}
              {album.size != null && (
                <>
                  <span className="text-black/20">/</span>
                  <span>{album.size} 首</span>
                </>
              )}
              {publish && (
                <>
                  <span className="text-black/20">/</span>
                  <span>{publish}</span>
                </>
              )}
              {album.company && (
                <>
                  <span className="text-black/20">/</span>
                  <span className="truncate">{album.company}</span>
                </>
              )}
            </div>

            {(album.description || album.briefDesc) && (
              <p className="mt-2.5 line-clamp-3 max-w-[760px] whitespace-pre-wrap text-[11px] leading-relaxed text-black/40">
                {album.description || album.briefDesc}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-4">
              <button
                onClick={() => data.songs.length && playQueue(data.songs, 0)}
                disabled={!data.songs.length}
                className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-brand px-4 py-2 text-[11.5px] font-medium text-white shadow-[0_8px_22px_rgba(255,25,73,0.28)] transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-40 sm:px-5 sm:text-[12px]"
              >
                <Play size={13} fill="currentColor" />
                播放全部
              </button>
              <button
                onClick={() => void toggleSubscribe()}
                disabled={subscribing}
                className={cn(
                  'glass-soft flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-[11px] transition-all duration-200 active:scale-95 sm:px-4 sm:text-[11.5px]',
                  subscribed
                    ? 'border-brand/30 text-brand'
                    : 'border-white/40 text-black/60 hover:bg-white/30 hover:text-black'
                )}
              >
                <Heart size={13} fill={subscribed ? 'currentColor' : 'none'} />
                {subscribed ? '已收藏' : '收藏专辑'}
              </button>
            </div>
          </div>
        </div>

        <div className="glass-panel mt-6 rounded-[24px] border border-white/40 p-2 pt-3 sm:mt-8">
          <div className="mb-1 flex items-center justify-between px-3.5 pb-1">
            <span className="text-[12.5px] font-medium text-black/80">歌曲列表</span>
            <span className="text-[10.5px] text-black/35">{formatCount(data.songs.length)} 首</span>
          </div>
          {data.songs.length ? (
            <TrackList songs={data.songs} />
          ) : (
            <p className="py-16 text-center text-[12px] text-black/35">暂无歌曲</p>
          )}
        </div>
      </div>
    </div>
  )
}
