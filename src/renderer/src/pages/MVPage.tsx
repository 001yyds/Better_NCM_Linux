import { useEffect, useRef, useState } from 'react'
import { Heart, Loader2, Play } from 'lucide-react'
import type { MV } from '../../../shared/types'
import { api, coverUrl } from '../lib/api'
import { cn } from '../lib/cn'
import { useAuthStore } from '../store/auth'
import { useUiStore } from '../store/ui'
import { MVCard } from '../components/MVCard'

const RESOLUTIONS = [480, 720, 1080]

export function MVPage({
  id,
  title,
  cover,
  artist,
  artistId,
  subed
}: {
  id: number
  title?: string
  cover?: string
  artist?: string
  artistId?: number
  subed?: boolean
}): React.JSX.Element {
  const navigate = useUiStore((state) => state.navigate)
  const toast = useUiStore((state) => state.toast)
  const setLoginOpen = useUiStore((state) => state.setLoginOpen)
  const loggedIn = useAuthStore((state) => state.loggedIn)

  const videoRef = useRef<HTMLVideoElement>(null)
  const resumeRef = useRef(0)
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [resolution, setResolution] = useState(1080)
  const [subscribed, setSubscribed] = useState(!!subed)
  const [subscribing, setSubscribing] = useState(false)
  const [related, setRelated] = useState<MV[]>([])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setFailed(false)
    setUrl(null)
    api.mv
      .url(id, resolution)
      .then((result) => {
        if (!alive) return
        if (!result.url) {
          setFailed(true)
          toast(result.mvFee ? '该 MV 需要会员或付费观看' : 'MV 暂时无法播放', 'error')
          return
        }
        setUrl(result.url)
      })
      .catch(() => {
        if (!alive) return
        setFailed(true)
        toast('MV 地址获取失败', 'error')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [id, resolution, toast])

  useEffect(() => {
    if (!artistId) return
    let alive = true
    api.artist
      .mvs(artistId, 0, 12)
      .then((result) => {
        if (alive) setRelated(result.mvs.filter((mv) => mv.id !== id))
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [artistId, id])

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
      await api.mv.subscribe(id, next)
      toast(next ? '已收藏 MV' : '已取消收藏', 'success')
    } catch (cause) {
      setSubscribed(!next)
      toast(cause instanceof Error ? cause.message : '操作失败', 'error')
    } finally {
      setSubscribing(false)
    }
  }

  const changeResolution = (value: number): void => {
    if (value === resolution) return
    resumeRef.current = videoRef.current?.currentTime ?? 0
    setResolution(value)
  }

  return (
    <div className="relative min-h-full px-4 pb-10 pt-5 sm:px-8 sm:pb-12 sm:pt-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[340px] bg-[radial-gradient(60%_100%_at_35%_0%,rgba(255,25,73,0.07),transparent_72%)]" />

      <div className="relative mx-auto max-w-[1040px]">
        <div className="relative overflow-hidden rounded-[22px] border border-white/30 bg-black shadow-[0_30px_80px_-36px_rgba(0,0,0,0.55)]">
          <div className="aspect-video w-full">
            {url ? (
              <video
                ref={videoRef}
                key={url}
                src={url}
                poster={cover ? coverUrl(cover, 1080) : undefined}
                controls
                autoPlay
                playsInline
                preload="metadata"
                className="h-full w-full bg-black object-contain"
                onLoadedMetadata={() => {
                  if (videoRef.current && resumeRef.current > 0) {
                    videoRef.current.currentTime = resumeRef.current
                  }
                }}
                onError={() => {
                  setFailed(true)
                  toast('MV 播放失败，请尝试切换清晰度', 'error')
                }}
              />
            ) : (
              <div className="relative flex h-full w-full items-center justify-center bg-black/90">
                {cover && (
                  <img
                    src={coverUrl(cover, 1080)}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-35 blur-sm"
                    draggable={false}
                  />
                )}
                <div className="relative flex flex-col items-center gap-3 text-white/75">
                  {loading ? (
                    <>
                      <Loader2 size={26} className="animate-spin" />
                      <span className="text-[12px]">正在获取 MV…</span>
                    </>
                  ) : (
                    <>
                      <Play size={26} />
                      <span className="text-[12px]">MV 暂时无法播放</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-[20px] font-semibold tracking-[-0.02em] text-black/90 sm:text-[24px]">
              {title ?? 'MV'}
            </h1>
            {artist && (
              <button
                onClick={() => artistId && navigate({ page: 'artist', id: artistId, title: artist })}
                className="mt-1 block truncate text-[12px] text-black/45 transition-colors hover:text-brand"
              >
                {artist}
              </button>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="glass-soft flex items-center gap-1 rounded-full border border-white/40 p-1">
              {RESOLUTIONS.map((value) => (
                <button
                  key={value}
                  onClick={() => changeResolution(value)}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[10.5px] transition-colors duration-200',
                    resolution === value
                      ? 'bg-white/55 text-black'
                      : 'text-black/45 hover:text-black'
                  )}
                >
                  {value}P
                </button>
              ))}
            </div>
            <button
              onClick={() => void toggleSubscribe()}
              disabled={subscribing}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[11px] transition-all duration-200 active:scale-95',
                subscribed
                  ? 'border-brand/30 bg-brand/10 text-brand'
                  : 'glass-soft border-white/40 text-black/55 hover:bg-white/30 hover:text-black'
              )}
            >
              <Heart size={13} fill={subscribed ? 'currentColor' : 'none'} />
              {subscribed ? '已收藏' : '收藏'}
            </button>
          </div>
        </div>

        {failed && !loading && (
          <p className="mt-3 rounded-[14px] border border-brand/20 bg-brand/5 px-4 py-2.5 text-[11.5px] text-brand/80">
            该 MV 可能受版权或会员限制。可尝试切换 480P / 720P，或登录后重试。
          </p>
        )}

        {related.length > 0 && (
          <section className="mt-8">
            <div className="mb-3 flex items-end justify-between">
              <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-black/85">更多 MV</h2>
              {artistId && (
                <button
                  onClick={() => navigate({ page: 'artist', id: artistId, title: artist })}
                  className="text-[11px] text-black/35 transition-colors hover:text-black/70"
                >
                  查看歌手
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {related.slice(0, 6).map((mv) => (
                <MVCard key={mv.id} mv={mv} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
