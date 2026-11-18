import { useEffect, useState } from 'react'
import { ChevronRight, Music2, UserRound } from 'lucide-react'
import type { Playlist, UserProfile } from '../../../shared/types'
import { api, coverUrl } from '../lib/api'
import { cn } from '../lib/cn'
import { formatCount } from '../lib/format'
import { useUiStore } from '../store/ui'
import { Cover } from '../components/Cover'
import { PlaylistCard } from '../components/PlaylistCard'

type Tab = 'playlists' | 'follows' | 'followers'

const TABS: { key: Tab; label: string }[] = [
  { key: 'playlists', label: '歌单' },
  { key: 'follows', label: '关注' },
  { key: 'followers', label: '粉丝' }
]

function UserRow({ user }: { user: UserProfile }): React.JSX.Element {
  const navigate = useUiStore((state) => state.navigate)
  return (
    <button
      onClick={() => navigate({ page: 'user', id: user.userId, title: user.nickname })}
      className="glass-soft flex w-full items-center gap-3 rounded-[16px] border border-white/35 p-2.5 text-left transition-all duration-200 hover:bg-white/30 active:scale-[0.99]"
    >
      <Cover
        src={coverUrl(user.avatarUrl, 96)}
        radius={999}
        className="h-10 w-10 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] text-black/80">{user.nickname}</div>
        <div className="truncate text-[10.5px] text-black/40">
          {user.signature || '这个人很懒，什么都没有留下'}
        </div>
      </div>
      <ChevronRight size={14} className="shrink-0 text-black/25" />
    </button>
  )
}

export function UserPage({
  id,
  title
}: {
  id: number
  title?: string
}): React.JSX.Element {
  const navigate = useUiStore((state) => state.navigate)
  const toast = useUiStore((state) => state.toast)

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [error, setError] = useState(false)
  const [tab, setTab] = useState<Tab>('playlists')
  const [playlists, setPlaylists] = useState<Playlist[] | null>(null)
  const [follows, setFollows] = useState<UserProfile[] | null>(null)
  const [followers, setFollowers] = useState<UserProfile[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let alive = true
    setProfile(null)
    setError(false)
    setTab('playlists')
    setPlaylists(null)
    setFollows(null)
    setFollowers(null)
    api.user
      .detail(id)
      .then((result) => {
        if (alive) setProfile(result)
      })
      .catch(() => {
        if (!alive) return
        setError(true)
        toast('用户信息加载失败', 'error')
      })
    return () => {
      alive = false
    }
  }, [id, toast])

  useEffect(() => {
    if (!profile) return
    let alive = true
    setLoading(true)
    void (async () => {
      try {
        if (tab === 'playlists' && !playlists) {
          const result = await api.user.playlists(id)
          if (alive) setPlaylists(result)
        } else if (tab === 'follows' && !follows) {
          const result = await api.user.follows(id, 0, 50)
          if (alive) setFollows(result.users)
        } else if (tab === 'followers' && !followers) {
          const result = await api.user.followers(id, 0, 50)
          if (alive) setFollowers(result.users)
        }
      } catch (cause) {
        if (alive) toast(cause instanceof Error ? cause.message : '加载失败', 'error')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [tab, profile, id, playlists, follows, followers, toast])

  if (error) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 text-black/40">
        <p className="text-[13px]">用户不存在或加载失败</p>
        <button
          onClick={() => navigate({ page: 'home' })}
          className="rounded-full border border-black/10 bg-white/40 px-4 py-1.5 text-[11.5px] transition-all duration-200 hover:bg-white/70 hover:text-black"
        >
          回到首页
        </button>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="px-4 pt-6 sm:px-8 sm:pt-10">
        <div className="flex items-center gap-4">
          <div className="skeleton h-[76px] w-[76px] rounded-full" />
          <div className="flex-1 space-y-3">
            <div className="skeleton h-7 w-48 rounded" />
            <div className="skeleton h-3 w-64 rounded" />
          </div>
        </div>
      </div>
    )
  }

  const data =
    tab === 'playlists'
      ? playlists
      : tab === 'follows'
        ? follows
        : followers

  return (
    <div className="relative min-h-full px-4 pb-10 pt-5 sm:px-8 sm:pb-12 sm:pt-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[340px] bg-[radial-gradient(60%_100%_at_30%_0%,rgba(255,25,73,0.07),transparent_72%)]" />

      <header className="relative flex flex-wrap items-center gap-4 sm:flex-nowrap sm:gap-5">
        <Cover
          src={coverUrl(profile.avatarUrl, 220)}
          radius={999}
          className="h-[64px] w-[64px] shrink-0 shadow-[0_14px_36px_-18px_rgba(0,0,0,0.35)] sm:h-[80px] sm:w-[80px]"
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[24px] font-semibold leading-tight tracking-[-0.02em] text-black/90 sm:text-[28px]">
            {profile.nickname || title}
          </h1>
          <p className="mt-1 truncate text-[12px] text-black/40">
            {profile.signature || '这个人很懒，什么都没有留下'}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-black/40">
            <span>
              <span className="font-medium text-black/70">{formatCount(profile.playlistCount)}</span> 歌单
            </span>
            <span>
              <span className="font-medium text-black/70">{formatCount(profile.follows)}</span> 关注
            </span>
            <span>
              <span className="font-medium text-black/70">{formatCount(profile.followeds)}</span> 粉丝
            </span>
            {profile.level != null && (
              <span>
                Lv.<span className="font-medium text-black/70">{profile.level}</span>
              </span>
            )}
            {profile.listenSongs != null && (
              <span>
                累计听歌 <span className="font-medium text-black/70">{formatCount(profile.listenSongs)}</span> 首
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="no-scrollbar mt-6 flex items-center gap-2 overflow-x-auto border-b border-white/30 pb-2">
        {TABS.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              'relative shrink-0 rounded-full px-3.5 py-1.5 text-[11.5px] transition-colors duration-200',
              tab === item.key ? 'bg-white/45 text-black' : 'text-black/45 hover:bg-white/25 hover:text-black'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="relative mt-5">
        {loading && !data?.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="skeleton aspect-[3/4] rounded-[22px]" />
            ))}
          </div>
        ) : tab === 'playlists' ? (
          playlists?.length ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-x-4 gap-y-6 xl:gap-x-5">
              {playlists.map((playlist) => (
                <PlaylistCard key={playlist.id} playlist={playlist} />
              ))}
            </div>
          ) : (
            <Empty icon={<Music2 size={30} strokeWidth={1.2} />} text="这个用户还没有公开歌单" />
          )
        ) : data?.length ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {(data as UserProfile[]).map((user) => (
              <UserRow key={user.userId} user={user} />
            ))}
          </div>
        ) : (
          <Empty icon={<UserRound size={30} strokeWidth={1.2} />} text={tab === 'follows' ? '还没有关注任何人' : '还没有粉丝'} />
        )}
      </div>
    </div>
  )
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-black/30">
      {icon}
      <p className="mt-3 text-[12px]">{text}</p>
    </div>
  )
}
