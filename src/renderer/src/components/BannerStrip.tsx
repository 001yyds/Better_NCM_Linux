import { useEffect, useState } from 'react'
import type { Banner } from '../../../shared/types'
import { api, coverUrl } from '../lib/api'
import { cn } from '../lib/cn'
import { usePlayerStore } from '../store/player'
import { useUiStore } from '../store/ui'

export function BannerStrip(): React.JSX.Element | null {
  const [banners, setBanners] = useState<Banner[]>([])
  const [index, setIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  const navigate = useUiStore((state) => state.navigate)
  const toast = useUiStore((state) => state.toast)

  useEffect(() => {
    let alive = true
    api.banner
      .list()
      .then((list) => {
        if (!alive) return
        setBanners(list.filter((item) => !!item.imageUrl))
        setIndex(0)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (banners.length <= 1) return
    const timer = window.setInterval(() => {
      setIndex((value) => (value + 1) % banners.length)
    }, 6000)
    return () => window.clearInterval(timer)
  }, [banners.length])

  if (!banners.length) return null

  const open = async (banner: Banner): Promise<void> => {
    if (busy) return
    setBusy(true)
    try {
      const parsed = /orpheus:\/\/(song|album|playlist|mv)\/(\d+)/.exec(banner.url ?? '')
      const kind = parsed?.[1]
      const id = parsed ? Number(parsed[2]) : banner.targetId
      if (kind === 'song' || (!kind && banner.targetType === 1)) {
        if (!id) return
        const song = await api.song.detail(id)
        if (song) usePlayerStore.getState().play(song, [song])
        else toast('歌曲暂时无法播放', 'error')
      } else if (kind === 'album' || (!kind && banner.targetType === 10)) {
        if (id) navigate({ page: 'album', id, title: banner.typeTitle })
      } else if (kind === 'playlist' || (!kind && banner.targetType === 1000)) {
        if (id) navigate({ page: 'playlist', id, title: banner.typeTitle })
      } else if (kind === 'mv' || (!kind && banner.targetType === 1004)) {
        if (id) navigate({ page: 'mv', id, title: banner.typeTitle })
      } else if (banner.url?.startsWith('http')) {
        window.open(banner.url)
      }
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : '打开失败', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="relative mt-5">
      <button
        onClick={() => void open(banners[index])}
        className="group relative block aspect-[16/5.4] w-full overflow-hidden rounded-[24px] border border-white/30 text-left shadow-[0_24px_60px_-34px_rgba(24,32,64,0.5)] transition-transform duration-200 active:scale-[0.995] sm:aspect-[16/4.6]"
      >
        {banners.map((banner, position) => (
          <img
            key={`${banner.imageUrl}-${position}`}
            src={coverUrl(banner.imageUrl, 1200)}
            alt=""
            draggable={false}
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-700',
              position === index ? 'opacity-100' : 'opacity-0'
            )}
          />
        ))}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
        {banners[index]?.typeTitle && (
          <span className="absolute bottom-3 left-4 max-w-[70%] truncate rounded-full bg-black/30 px-3 py-1 text-[11px] text-white/90 backdrop-blur-md">
            {banners[index].typeTitle}
          </span>
        )}
        {banners.length > 1 && (
          <div className="absolute bottom-3 right-4 flex items-center gap-1.5">
            {banners.map((_, position) => (
              <span
                key={position}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  position === index ? 'w-4 bg-white' : 'w-1.5 bg-white/45'
                )}
              />
            ))}
          </div>
        )}
      </button>
    </section>
  )
}
