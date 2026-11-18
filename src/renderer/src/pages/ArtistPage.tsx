import { useEffect, useState } from 'react'
import { UserPlus, UserCheck, Play, Sparkles } from 'lucide-react'
import type { ArtistAlbumsData, ArtistIntroData, ArtistPageData } from '../../../shared/api'
import type { ArtistDetail, AlbumDetail, MV } from '../../../shared/types'
import { api, coverUrl } from '../lib/api'
import { cn } from '../lib/cn'
import { formatCount } from '../lib/format'
import { useAuthStore } from '../store/auth'
import { usePlayerStore } from '../store/player'
import { useUiStore } from '../store/ui'
import { AlbumCard } from '../components/AlbumCard'
import { ArtistCard } from '../components/ArtistCard'
import { Cover } from '../components/Cover'
import { MVCard } from '../components/MVCard'
import { TrackList } from '../components/TrackList'

type Tab = 'songs' | 'albums' | 'mvs' | 'about'

const TABS: { key: Tab; label: string }[] = [
  { key: 'songs', label: '热门作品' },
  { key: 'albums', label: '专辑' },
  { key: 'mvs', label: 'MV' },
  { key: 'about', label: '歌手简介' }
]

function Skeleton(): React.JSX.Element {
  return (
    <div className="px-4 pt-6 sm:px-8 sm:pt-10">
      <div className="flex items-end gap-5">
        <div className="skeleton h-[128px] w-[128px] rounded-full sm:h-[176px] sm:w-[176px]" />
        <div className="flex-1 space-y-3 pb-2">
          <div className="skeleton h-3 w-20 rounded" />
          <div className="skeleton h-9 w-1/2 rounded" />
          <div className="skeleton h-3 w-2/3 rounded" />
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

export function ArtistPage({
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

  const [data, setData] = useState<ArtistPageData | null>(null)
  const [error, setError] = useState(false)
  const [tab, setTab] = useState<Tab>('songs')
  const [followed, setFollowed] = useState(false)
  const [following, setFollowing] = useState(false)
  const [albums, setAlbums] = useState<AlbumDetail[] | null>(null)
  const [albumMore, setAlbumMore] = useState(false)
  const [mvs, setMvs] = useState<MV[] | null>(null)
  const [intro, setIntro] = useState<ArtistIntroData | null>(null)
  const [similar, setSimilar] = useState<ArtistDetail[] | null>(null)
  const [loadingTab, setLoadingTab] = useState(false)

  useEffect(() => {
    let alive = true
    setData(null)
    setError(false)
    setTab('songs')
    setAlbums(null)
    setMvs(null)
    setIntro(null)
    setSimilar(null)
    api.artist
      .detail(id)
      .then((result) => {
        if (!alive) return
        setData(result)
        setFollowed(!!result.artist.followed)
      })
      .catch(() => {
        if (!alive) return
        setError(true)
        toast('歌手信息加载失败', 'error')
      })
    return () => {
      alive = false
    }
  }, [id, toast])

  useEffect(() => {
    if (tab === 'songs') return
    let alive = true
    setLoadingTab(true)
    void (async () => {
      try {
        if (tab === 'albums' && !albums) {
          const result: ArtistAlbumsData = await api.artist.albums(id, 0, 50)
          if (!alive) return
          setAlbums(result.hotAlbums)
          setAlbumMore(result.more)
        } else if (tab === 'mvs' && !mvs) {
          const result = await api.artist.mvs(id, 0, 40)
          if (!alive) return
          setMvs(result.mvs)
        } else if (tab === 'about') {
          const [text, list] = await Promise.all([
            intro ? Promise.resolve(intro) : api.artist.introduction(id),
            similar ? Promise.resolve(similar) : api.artist.similar(id)
          ])
          if (!alive) return
          setIntro(text)
          setSimilar(list)
        }
      } catch {
        if (alive) toast('加载失败，请稍后重试', 'error')
      } finally {
        if (alive) setLoadingTab(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [tab, id, albums, mvs, intro, similar, toast])

  const toggleFollow = async (): Promise<void> => {
    if (!loggedIn) {
      setLoginOpen(true)
      return
    }
    if (following) return
    setFollowing(true)
    const next = !followed
    setFollowed(next)
    try {
      await api.artist.subscribe(id, next)
      toast(next ? '已关注歌手' : '已取消关注', 'success')
    } catch (cause) {
      setFollowed(!next)
      toast(cause instanceof Error ? cause.message : '操作失败', 'error')
    } finally {
      setFollowing(false)
    }
  }

  const loadMoreAlbums = async (): Promise<void> => {
    if (!albums) return
    try {
      const result = await api.artist.albums(id, albums.length, 50)
      setAlbums([...albums, ...result.hotAlbums])
      setAlbumMore(result.more)
    } catch {
      toast('加载更多失败', 'error')
    }
  }

  if (error) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 text-black/40">
        <p className="text-[13px]">歌手不存在或加载失败</p>
        <button
          onClick={() => navigate({ page: 'home' })}
          className="rounded-full border border-black/10 bg-white/40 px-4 py-1.5 text-[11.5px] transition-all duration-200 hover:bg-white/70 hover:text-black"
        >
          回到首页
        </button>
      </div>
    )
  }

  if (!data) return <Skeleton />

  const artist = data.artist
  const name = artist.name || title || '歌手'

  return (
    <div className="relative min-h-full pb-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[380px] overflow-hidden">
        {artist.picUrl && (
          <img
            src={coverUrl(artist.picUrl, 600)}
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
            src={coverUrl(artist.picUrl, 500)}
            radius={999}
            className="h-[128px] w-[128px] shrink-0 shadow-[0_22px_50px_-22px_rgba(0,0,0,0.45)] sm:h-[176px] sm:w-[176px]"
          />
          <div className="min-w-0 flex-1 pb-1">
            <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.32em] text-black/40 sm:text-[9.5px]">
              <Sparkles size={10} className="text-brand" />
              Artist
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <h1 className="truncate text-[24px] font-semibold leading-tight tracking-[-0.02em] text-black/90 sm:text-[30px]">
                {name}
              </h1>
              {followed && <UserCheck size={16} className="shrink-0 text-brand" />}
            </div>
            {artist.alias?.length ? (
              <p className="mt-1 truncate text-[11.5px] text-black/40">{artist.alias.join(' / ')}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10.5px] text-black/45 sm:text-[11.5px]">
              <span>{formatCount(artist.musicSize)} 首单曲</span>
              <span className="text-black/20">/</span>
              <span>{formatCount(artist.albumSize)} 张专辑</span>
              <span className="text-black/20">/</span>
              <span>{formatCount(artist.mvSize)} 个 MV</span>
            </div>
            {artist.briefDesc && (
              <p className="mt-2.5 line-clamp-2 max-w-[760px] text-[11px] leading-relaxed text-black/40">
                {artist.briefDesc}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-4">
              <button
                onClick={() => data.hotSongs.length && playQueue(data.hotSongs, 0)}
                disabled={!data.hotSongs.length}
                className="flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-[11.5px] font-medium text-white shadow-[0_8px_22px_rgba(255,25,73,0.28)] transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-40 sm:px-5 sm:text-[12px]"
              >
                <Play size={13} fill="currentColor" />
                播放热门
              </button>
              <button
                onClick={() => void toggleFollow()}
                disabled={following}
                className={cn(
                  'glass-soft flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[11px] transition-all duration-200 active:scale-95 sm:px-4 sm:text-[11.5px]',
                  followed
                    ? 'border-brand/30 text-brand'
                    : 'border-white/40 text-black/60 hover:bg-white/30 hover:text-black'
                )}
              >
                {followed ? <UserCheck size={13} /> : <UserPlus size={13} />}
                {followed ? '已关注' : '关注'}
              </button>
            </div>
          </div>
        </div>

        <div className="no-scrollbar mt-6 flex items-center gap-6 overflow-x-auto border-b border-white/30 sm:mt-8 sm:gap-8">
          {TABS.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={cn(
                'relative shrink-0 pb-2.5 text-[12.5px] transition-colors duration-200',
                tab === item.key ? 'text-black' : 'text-black/45 hover:text-black/70'
              )}
            >
              {item.label}
              {tab === item.key && (
                <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-brand" />
              )}
            </button>
          ))}
        </div>

        <div className="relative mt-5">
          {tab === 'songs' && (
            <div className="glass-panel rounded-[24px] border border-white/40 p-2 pt-3">
              {data.hotSongs.length ? (
                <TrackList songs={data.hotSongs} />
              ) : (
                <p className="py-16 text-center text-[12px] text-black/35">暂无热门作品</p>
              )}
            </div>
          )}

          {tab === 'albums' && (
            <>
              {!albums && loadingTab ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-4">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index}>
                      <div className="skeleton aspect-square w-full rounded-[22px]" />
                      <div className="skeleton mt-3 h-3 w-3/4 rounded" />
                    </div>
                  ))}
                </div>
              ) : albums?.length ? (
                <>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-x-4 gap-y-6 xl:gap-x-5">
                    {albums.map((album) => (
                      <AlbumCard key={album.id} album={album} />
                    ))}
                  </div>
                  {albumMore && (
                    <button
                      onClick={() => void loadMoreAlbums()}
                      className="mx-auto mt-5 block rounded-full border border-white/45 bg-white/20 px-5 py-2 text-[11.5px] text-black/55 transition-all duration-200 hover:bg-white/35 hover:text-black active:scale-95"
                    >
                      加载更多专辑
                    </button>
                  )}
                </>
              ) : (
                <p className="py-16 text-center text-[12px] text-black/35">暂无专辑</p>
              )}
            </>
          )}

          {tab === 'mvs' && (
            <>
              {!mvs && loadingTab ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="skeleton aspect-video rounded-[20px]" />
                  ))}
                </div>
              ) : mvs?.length ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {mvs.map((mv) => (
                    <MVCard key={mv.id} mv={mv} />
                  ))}
                </div>
              ) : (
                <p className="py-16 text-center text-[12px] text-black/35">暂无 MV</p>
              )}
            </>
          )}

          {tab === 'about' && (
            <div className="space-y-5">
              <section className="glass-panel rounded-[24px] border border-white/40 p-5">
                <h2 className="text-[14px] font-medium text-black/85">歌手简介</h2>
                <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-black/50">
                  {intro?.briefDesc || artist.briefDesc || '暂无简介'}
                </p>
                {intro?.introduction?.map((item, index) => (
                  <div key={`${item.ti ?? index}`} className="mt-4 border-t border-white/30 pt-3">
                    {item.ti && <div className="text-[12px] font-medium text-black/70">{item.ti}</div>}
                    <p className="mt-1 whitespace-pre-wrap text-[11.5px] leading-relaxed text-black/45">
                      {item.txt}
                    </p>
                  </div>
                ))}
              </section>

              <section>
                <div className="mb-3 flex items-end justify-between">
                  <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-black/85">相似歌手</h2>
                </div>
                {similar?.length ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] sm:gap-5">
                    {similar.map((item) => (
                      <ArtistCard key={item.id} artist={item} />
                    ))}
                  </div>
                ) : (
                  <p className="py-10 text-center text-[12px] text-black/30">暂无相似歌手</p>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
