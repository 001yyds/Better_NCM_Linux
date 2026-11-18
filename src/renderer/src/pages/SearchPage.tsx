import { useEffect, useRef, useState } from 'react'
import { Loader2, Search, X } from 'lucide-react'
import type { SearchResult } from '../../../shared/api'
import type { AlbumDetail, MV, Playlist, SearchUser, Song } from '../../../shared/types'
import { api, coverUrl } from '../lib/api'
import { cn } from '../lib/cn'
import { useUiStore } from '../store/ui'
import { AlbumCard } from '../components/AlbumCard'
import { Cover } from '../components/Cover'
import { MVCard } from '../components/MVCard'
import { PlaylistCard } from '../components/PlaylistCard'
import { TrackList } from '../components/TrackList'

type Tab = 'songs' | 'lyrics' | 'artists' | 'albums' | 'playlists' | 'mvs' | 'users'

interface SearchPayload {
  songs: Song[]
  lyrics: Song[]
  playlists: Playlist[]
  artists: NonNullable<SearchResult['artists']>
  albums: AlbumDetail[]
  mvs: MV[]
  users: SearchUser[]
  counts: Record<Tab, number>
}

const cache = new Map<string, SearchPayload>()

function artistCover(picUrl?: string): string {
  return coverUrl(picUrl, 300)
}

export function SearchPage({ initialKeyword }: { initialKeyword?: string }): React.JSX.Element {
  const [keyword, setKeyword] = useState(initialKeyword ?? '')
  const [tab, setTab] = useState<Tab>('songs')
  const [payload, setPayload] = useState<SearchPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [hot, setHot] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const toast = useUiStore((state) => state.toast)
  const navigate = useUiStore((state) => state.navigate)
  const route = useUiStore((state) => state.route)

  useEffect(() => {
    inputRef.current?.focus()
    void api.search.hot().then(setHot).catch(() => undefined)
  }, [])

  useEffect(() => {
    if (route.page === 'search' && route.keyword !== undefined) setKeyword(route.keyword)
  }, [route])

  useEffect(() => {
    const query = keyword.trim()
    if (!query) {
      setPayload(null)
      setSearched(false)
      setLoading(false)
      setSuggestions([])
      return
    }
    const cached = cache.get(query)
    if (cached) {
      setPayload(cached)
      setSearched(true)
      setLoading(false)
      return
    }
    setLoading(true)
    const timer = window.setTimeout(async () => {
      try {
        const [
          songResult,
          lyricResult,
          playlistResult,
          artistResult,
          albumResult,
          mvResult,
          userResult
        ] = await Promise.all([
          api.search.query(query, 1),
          api.search.query(query, 1006),
          api.search.query(query, 1000),
          api.search.query(query, 100),
          api.search.query(query, 10),
          api.search.query(query, 1004),
          api.search.query(query, 1002)
        ])
        const next: SearchPayload = {
          songs: songResult.songs ?? [],
          lyrics: lyricResult.songs ?? [],
          playlists: playlistResult.playlists ?? [],
          artists: artistResult.artists ?? [],
          albums: albumResult.albums ?? [],
          mvs: mvResult.mvs ?? [],
          users: userResult.userprofiles ?? [],
          counts: {
            songs: songResult.songCount ?? songResult.songs?.length ?? 0,
            lyrics: lyricResult.songCount ?? lyricResult.songs?.length ?? 0,
            playlists: playlistResult.playlistCount ?? playlistResult.playlists?.length ?? 0,
            artists: artistResult.artistCount ?? artistResult.artists?.length ?? 0,
            albums: albumResult.albumCount ?? albumResult.albums?.length ?? 0,
            mvs: mvResult.mvCount ?? mvResult.mvs?.length ?? 0,
            users: userResult.userCount ?? userResult.userprofiles?.length ?? 0
          }
        }
        cache.set(query, next)
        setPayload(next)
        setSearched(true)
        setSuggestions([])
      } catch {
        toast('搜索失败，请稍后再试', 'error')
      } finally {
        setLoading(false)
      }
    }, 320)
    return () => window.clearTimeout(timer)
  }, [keyword, toast])

  useEffect(() => {
    const query = keyword.trim()
    if (!query || query.length < 1) {
      setSuggestions([])
      return
    }
    const timer = window.setTimeout(() => {
      void api.search
        .suggest(query)
        .then((list) => setSuggestions(list.filter((item) => item !== query)))
        .catch(() => undefined)
    }, 220)
    return () => window.clearTimeout(timer)
  }, [keyword])

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'songs', label: '单曲', count: payload?.counts.songs ?? 0 },
    { key: 'lyrics', label: '歌词', count: payload?.counts.lyrics ?? 0 },
    { key: 'artists', label: '歌手', count: payload?.counts.artists ?? 0 },
    { key: 'albums', label: '专辑', count: payload?.counts.albums ?? 0 },
    { key: 'playlists', label: '歌单', count: payload?.counts.playlists ?? 0 },
    { key: 'mvs', label: 'MV', count: payload?.counts.mvs ?? 0 },
    { key: 'users', label: '用户', count: payload?.counts.users ?? 0 }
  ]

  const showSuggestions = focused && !!keyword.trim() && suggestions.length > 0

  return (
    <div className="relative min-h-full px-4 pb-8 pt-5 sm:px-8 sm:pb-10 sm:pt-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[300px] bg-[radial-gradient(60%_100%_at_40%_0%,rgba(255,25,73,0.06),transparent_70%)]" />

      <div className="relative mx-auto max-w-[900px]">
        <div className="relative z-20">
          <div className="glass flex items-center gap-2.5 rounded-[18px] border border-white/45 px-4 py-3 transition-colors duration-200 focus-within:border-white/70 sm:gap-3 sm:rounded-[20px] sm:px-5 sm:py-3.5">
            <Search size={18} className={cn('shrink-0 transition-colors duration-200 sm:h-5 sm:w-5', keyword ? 'text-brand' : 'text-black/35')} />
            <input
              ref={inputRef}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => window.setTimeout(() => setFocused(false), 160)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  setFocused(false)
                  inputRef.current?.blur()
                }
              }}
              placeholder="搜索歌曲、歌手、专辑、歌单、MV"
              className="w-full bg-transparent text-[17px] font-medium tracking-[-0.02em] text-black/90 outline-none placeholder:text-black/20 sm:text-[24px]"
              spellCheck={false}
            />
            {loading && <Loader2 size={18} className="animate-spin text-black/30" />}
            {keyword && !loading && (
              <button
                onClick={() => {
                  setKeyword('')
                  inputRef.current?.focus()
                }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-black/30 transition-all duration-200 hover:bg-white/35 hover:text-black active:scale-90"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {showSuggestions && (
            <div className="glass-strong absolute inset-x-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-[16px] border border-white/50 p-1 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.35)]">
              {suggestions.slice(0, 8).map((item) => (
                <button
                  key={item}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setKeyword(item)
                    setFocused(false)
                    inputRef.current?.blur()
                  }}
                  className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-left text-[12.5px] text-black/60 transition-colors hover:bg-white/35 hover:text-black"
                >
                  <Search size={12} className="shrink-0 text-black/25" />
                  <span className="truncate">{item}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {!keyword && (
          <>
            {hot.length > 0 && (
              <div className="mt-6">
                <div className="mb-3 text-[11px] uppercase tracking-[0.24em] text-black/35">热门搜索</div>
                <div className="flex flex-wrap gap-2">
                  {hot.map((item, index) => (
                    <button
                      key={item}
                      onClick={() => setKeyword(item)}
                      className="flex items-center gap-1.5 rounded-full border border-white/40 bg-white/15 px-3 py-1.5 text-[11.5px] text-black/55 transition-all duration-200 hover:bg-white/35 hover:text-black active:scale-95"
                    >
                      <span className={cn('tabular text-[9.5px]', index < 3 ? 'text-brand/80' : 'text-black/25')}>
                        {index + 1}
                      </span>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col items-center justify-center pt-[14vh] text-center">
              <div className="relative">
                <div className="absolute inset-0 -z-10 rounded-full bg-brand/10 blur-[50px]" />
                <Search size={40} strokeWidth={1.2} className="text-black/15" />
              </div>
              <p className="mt-5 text-[13px] text-black/35">输入关键词，发现你想听的音乐</p>
              <p className="mt-1 text-[11px] text-black/20">支持歌曲、歌手、专辑、歌单、MV 与用户搜索</p>
            </div>
          </>
        )}

        {searched && payload && (
          <div className="no-scrollbar mt-4 flex items-center gap-5 overflow-x-auto sm:mt-5 sm:gap-6">
            {tabs.map((item) => (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={cn(
                  'relative shrink-0 pb-2 text-[12.5px] transition-colors duration-200',
                  tab === item.key ? 'text-black' : 'text-black/45 hover:text-black/70'
                )}
              >
                {item.label}
                <span className="ml-1 text-[10px] text-black/25">{item.count}</span>
                {tab === item.key && <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-brand" />}
              </button>
            ))}
          </div>
        )}

        <div className="mt-5">
          {keyword && searched && payload && tab === 'songs' && (
            <div className="glass-panel rounded-[22px] border border-white/40 p-2">
              {payload.songs.length ? (
                <TrackList songs={payload.songs} />
              ) : (
                <p className="py-16 text-center text-[12px] text-black/35">没有找到相关单曲</p>
              )}
            </div>
          )}

          {keyword && searched && payload && tab === 'lyrics' && (
            <div className="glass-panel rounded-[22px] border border-white/40 p-2">
              {payload.lyrics.length ? (
                <TrackList songs={payload.lyrics} />
              ) : (
                <p className="py-16 text-center text-[12px] text-black/35">没有找到歌词匹配的歌曲</p>
              )}
            </div>
          )}

          {keyword && searched && payload && tab === 'playlists' && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-x-4 gap-y-6 xl:gap-x-5">
              {payload.playlists.length ? (
                payload.playlists.map((playlist) => <PlaylistCard key={playlist.id} playlist={playlist} />)
              ) : (
                <p className="col-span-full py-16 text-center text-[12px] text-black/30">没有找到相关歌单</p>
              )}
            </div>
          )}

          {keyword && searched && payload && tab === 'artists' && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] sm:gap-6">
              {payload.artists.length ? (
                payload.artists.map((artist) => (
                  <button
                    key={artist.id}
                    onClick={() => navigate({ page: 'artist', id: artist.id, title: artist.name })}
                    className="glass-tile flex flex-col items-center rounded-[22px] border border-white/40 p-4 text-center transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.99]"
                  >
                    <Cover
                      src={artistCover(artist.picUrl)}
                      radius={999}
                      className="h-[118px] w-[118px] shadow-[0_14px_34px_-20px_rgba(0,0,0,0.4)]"
                    />
                    <div className="mt-3 w-full truncate text-[12.5px] text-black/80">{artist.name}</div>
                    <div className="mt-0.5 w-full truncate text-[10px] text-black/35">
                      {artist.albumSize ?? 0} 张专辑
                    </div>
                  </button>
                ))
              ) : (
                <p className="col-span-full py-16 text-center text-[12px] text-black/30">没有找到相关歌手</p>
              )}
            </div>
          )}

          {keyword && searched && payload && tab === 'albums' && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-x-4 gap-y-6 xl:gap-x-5">
              {payload.albums.length ? (
                payload.albums.map((album) => <AlbumCard key={album.id} album={album} />)
              ) : (
                <p className="col-span-full py-16 text-center text-[12px] text-black/30">没有找到相关专辑</p>
              )}
            </div>
          )}

          {keyword && searched && payload && tab === 'mvs' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {payload.mvs.length ? (
                payload.mvs.map((mv) => <MVCard key={mv.id} mv={mv} />)
              ) : (
                <p className="col-span-full py-16 text-center text-[12px] text-black/30">没有找到相关 MV</p>
              )}
            </div>
          )}

          {keyword && searched && payload && tab === 'users' && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {payload.users.length ? (
                payload.users.map((user) => (
                  <button
                    key={user.userId}
                    onClick={() => navigate({ page: 'user', id: user.userId, title: user.nickname })}
                    className="glass-soft flex w-full items-center gap-3 rounded-[16px] border border-white/35 p-2.5 text-left transition-all duration-200 hover:bg-white/30 active:scale-[0.99]"
                  >
                    <Cover src={coverUrl(user.avatarUrl, 96)} radius={999} className="h-10 w-10 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] text-black/80">{user.nickname}</div>
                      <div className="truncate text-[10.5px] text-black/40">
                        {user.signature || '这个人很懒，什么都没有留下'}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <p className="col-span-full py-16 text-center text-[12px] text-black/30">没有找到相关用户</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
