import { useEffect, useState } from 'react'
import { Disc3, LogIn, UserRound, Video } from 'lucide-react'
import type { AlbumDetail, ArtistDetail, MV } from '../../../shared/types'
import { api } from '../lib/api'
import { cn } from '../lib/cn'
import { useAuthStore } from '../store/auth'
import { useUiStore } from '../store/ui'
import { AlbumCard } from '../components/AlbumCard'
import { ArtistCard } from '../components/ArtistCard'
import { MVCard } from '../components/MVCard'

type Tab = 'albums' | 'artists' | 'mvs'

const TABS: { key: Tab; label: string; icon: typeof Disc3 }[] = [
  { key: 'albums', label: '收藏专辑', icon: Disc3 },
  { key: 'artists', label: '关注歌手', icon: UserRound },
  { key: 'mvs', label: '收藏 MV', icon: Video }
]

export function CollectionPage(): React.JSX.Element {
  const loggedIn = useAuthStore((state) => state.loggedIn)
  const setLoginOpen = useUiStore((state) => state.setLoginOpen)
  const toast = useUiStore((state) => state.toast)

  const [tab, setTab] = useState<Tab>('albums')
  const [albums, setAlbums] = useState<AlbumDetail[] | null>(null)
  const [artists, setArtists] = useState<ArtistDetail[] | null>(null)
  const [mvs, setMvs] = useState<MV[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!loggedIn) return
    let alive = true
    setLoading(true)
    void (async () => {
      try {
        if (tab === 'albums' && !albums) {
          const result = await api.album.sublist(0, 50)
          if (alive) setAlbums(result.data)
        } else if (tab === 'artists' && !artists) {
          const result = await api.artist.sublist(0, 50)
          if (alive) setArtists(result.data)
        } else if (tab === 'mvs' && !mvs) {
          const result = await api.mv.sublist(0, 50)
          if (alive) setMvs(result)
        }
      } catch (cause) {
        if (alive) toast(cause instanceof Error ? cause.message : '收藏加载失败', 'error')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [tab, loggedIn, albums, artists, mvs, toast])

  if (!loggedIn) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-8 pb-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-white/45 bg-white/25 text-brand">
          <Disc3 size={26} strokeWidth={1.7} />
        </div>
        <h1 className="mt-5 text-[22px] font-semibold tracking-[-0.02em] text-black/85">登录后查看我的收藏</h1>
        <p className="mt-2 max-w-[360px] text-center text-[12px] leading-relaxed text-black/40">
          收藏的专辑、关注的歌手与 MV 都会同步到这里。
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

  const data: AlbumDetail[] | ArtistDetail[] | MV[] | null =
    tab === 'albums' ? albums : tab === 'artists' ? artists : mvs

  return (
    <div className="relative min-h-full px-4 pb-10 pt-5 sm:px-8 sm:pb-12 sm:pt-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[320px] bg-[radial-gradient(55%_100%_at_30%_0%,rgba(255,25,73,0.06),transparent_70%)]" />

      <header className="relative mb-5">
        <p className="text-[10px] uppercase tracking-[0.28em] text-black/35 sm:text-[10.5px]">Collection</p>
        <h1 className="mt-2 text-[27px] font-semibold leading-none tracking-[-0.02em] text-black/90 sm:text-[32px]">
          我的收藏
        </h1>
        <p className="mt-2 text-[12px] text-black/40 sm:text-[12.5px]">专辑、歌手与 MV，和网易云账号同步</p>
      </header>

      <div className="no-scrollbar mb-5 flex items-center gap-2 overflow-x-auto pb-1">
        {TABS.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[11.5px] transition-all duration-200 active:scale-95',
                tab === item.key
                  ? 'border-white/60 bg-white/45 text-black'
                  : 'border-white/30 bg-white/10 text-black/45 hover:bg-white/25 hover:text-black'
              )}
            >
              <Icon size={12} />
              {item.label}
            </button>
          )
        })}
      </div>

      {loading && !data?.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="skeleton aspect-[3/4] rounded-[22px]" />
          ))}
        </div>
      ) : data?.length ? (
        tab === 'albums' ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-x-4 gap-y-6 xl:gap-x-5">
            {(albums ?? []).map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        ) : tab === 'artists' ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] sm:gap-5">
            {(artists ?? []).map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(mvs ?? []).map((mv) => (
              <MVCard key={mv.id} mv={mv} />
            ))}
          </div>
        )
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-black/30">
          <Disc3 size={34} strokeWidth={1.2} />
          <p className="mt-3 text-[12px]">这里还没有内容</p>
        </div>
      )}
    </div>
  )
}
