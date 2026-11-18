import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, Heart, ListPlus, Loader2, Pencil, Play, Trash2, X } from 'lucide-react'
import type { Playlist, Song } from '../../../shared/types'
import { api, coverUrl } from '../lib/api'
import { downloadSongs } from '../lib/actions'
import { cn } from '../lib/cn'
import { formatCount } from '../lib/format'
import { cachedPlaylist, invalidatePlaylist, loadPlaylist } from '../lib/playlistCache'
import { useAuthStore } from '../store/auth'
import { useLikesStore } from '../store/likes'
import { usePlayerStore } from '../store/player'
import { useSettingsStore } from '../store/settings'
import { useUiStore } from '../store/ui'
import { Cover } from '../components/Cover'
import { TrackList } from '../components/TrackList'

export function PlaylistPage({ id }: { id: number }): React.JSX.Element {
  const [playlist, setPlaylist] = useState<Playlist | null>(cachedPlaylist(id) ?? null)
  const [loading, setLoading] = useState(!cachedPlaylist(id))
  const navigate = useUiStore((state) => state.navigate)
  const toast = useUiStore((state) => state.toast)
  const setLoginOpen = useUiStore((state) => state.setLoginOpen)
  const playQueue = usePlayerStore((state) => state.playQueue)
  const addToQueue = usePlayerStore((state) => state.addToQueue)
  const quality = useSettingsStore((state) => state.settings?.quality ?? 'exhigh')
  const liked = useLikesStore((state) => state.liked)
  const likesLoaded = useLikesStore((state) => state.loaded)
  const loggedIn = useAuthStore((state) => state.loggedIn)
  const profile = useAuthStore((state) => state.profile)

  const [subscribed, setSubscribed] = useState(false)
  const [subBusy, setSubBusy] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editTags, setEditTags] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isFavorites =
    playlist?.specialType === 5 || !!playlist?.name.includes('喜欢的音乐')
  const tracks = useMemo(() => {
    const all = playlist?.tracks ?? []
    if (!isFavorites || !likesLoaded) return all
    return all.filter((song) => liked.has(song.id))
  }, [playlist?.tracks, isFavorites, likesLoaded, liked])

  const isOwner = !!(
    playlist &&
    profile &&
    (playlist.creator?.userId === profile.userId || playlist.userId === profile.userId)
  )

  useEffect(() => {
    let alive = true
    api.playlist
      .dynamic(id)
      .then((result) => {
        if (alive) setSubscribed(result.subscribed)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [id])

  const toggleSubscribe = async (): Promise<void> => {
    if (!loggedIn) {
      setLoginOpen(true)
      return
    }
    if (subBusy) return
    setSubBusy(true)
    const next = !subscribed
    setSubscribed(next)
    try {
      await api.playlist.subscribe(id, next)
      invalidatePlaylist(id)
      toast(next ? '已收藏歌单' : '已取消收藏', 'success')
    } catch (cause) {
      setSubscribed(!next)
      toast(cause instanceof Error ? cause.message : '操作失败', 'error')
    } finally {
      setSubBusy(false)
    }
  }

  const removeTrack = async (song: Song): Promise<void> => {
    try {
      await api.playlist.removeTracks(id, [song.id])
      invalidatePlaylist(id)
      setPlaylist((previous) =>
        previous
          ? {
              ...previous,
              tracks: (previous.tracks ?? []).filter((item) => item.id !== song.id),
              trackCount: Math.max(0, (previous.trackCount ?? 1) - 1)
            }
          : previous
      )
      toast(`已从歌单移除《${song.name}》`, 'success')
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : '移除失败', 'error')
    }
  }

  const openEdit = (): void => {
    if (!playlist) return
    setEditName(playlist.name)
    setEditDesc(playlist.description ?? '')
    setEditTags(playlist.tags ?? '')
    setConfirmDelete(false)
    setEditOpen(true)
  }

  const removePlaylist = async (): Promise<void> => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    if (deleting) return
    setDeleting(true)
    try {
      await api.playlist.remove(id)
      invalidatePlaylist(id)
      await useAuthStore.getState().refresh()
      setEditOpen(false)
      toast('歌单已删除', 'success')
      navigate({ page: 'home' })
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : '删除歌单失败', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const saveEdit = async (): Promise<void> => {
    if (!playlist || saving) return
    const value = editName.trim()
    if (!value) {
      toast('歌单名称不能为空', 'error')
      return
    }
    setSaving(true)
    try {
      await Promise.all([
        value !== playlist.name ? api.playlist.rename(id, value) : Promise.resolve(),
        editDesc !== (playlist.description ?? '')
          ? api.playlist.updateDesc(id, editDesc)
          : Promise.resolve(),
        editTags !== (playlist.tags ?? '') ? api.playlist.updateTags(id, editTags) : Promise.resolve()
      ])
      setPlaylist({ ...playlist, name: value, description: editDesc, tags: editTags })
      invalidatePlaylist(id)
      await useAuthStore.getState().refresh()
      setEditOpen(false)
      toast('歌单信息已更新', 'success')
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : '保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    let alive = true
    const cached = cachedPlaylist(id)
    if (cached) {
      setPlaylist(cached)
      setLoading(false)
      return
    }
    setLoading(true)
    setPlaylist(null)
    loadPlaylist(id)
      .then((result) => {
        if (alive) setPlaylist(result)
      })
      .catch(() => {
        if (alive) toast('歌单加载失败', 'error')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [id, toast])

  if (loading && !playlist) {
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

  if (!playlist) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 text-black/40">
        <p className="text-[13px]">歌单不存在或加载失败</p>
        <button
          onClick={() => navigate({ page: 'home' })}
          className="rounded-full border border-black/10 bg-white/40 px-4 py-1.5 text-[11.5px] transition-all duration-200 hover:bg-white/70 hover:text-black"
        >
          回到首页
        </button>
      </div>
    )
  }

  const cover = coverUrl(playlist.coverImgUrl, 600)
  const creator = playlist.creator
  const trackTotal = isFavorites && likesLoaded ? tracks.length : playlist.trackCount ?? tracks.length

  return (
    <div className="relative min-h-full pb-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[360px] overflow-hidden">
        <img
          src={cover}
          alt=""
          className="h-full w-full scale-125 object-cover opacity-20 blur-[80px] saturate-125"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/25 to-transparent" />
      </div>

      <div className="relative px-4 pt-6 sm:px-8 sm:pt-9">
        <div className="flex items-end gap-4 sm:gap-6">
          <Cover
            src={cover}
            radius={18}
            className="h-[128px] w-[128px] shrink-0 shadow-[0_22px_50px_-22px_rgba(0,0,0,0.4)] sm:h-[186px] sm:w-[186px]"
          />
          <div className="min-w-0 flex-1 pb-1">
            <div className="text-[9px] uppercase tracking-[0.3em] text-black/40 sm:text-[9.5px] sm:tracking-[0.32em]">Playlist</div>
            <h1 className="mt-1.5 line-clamp-3 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-black/90 sm:mt-2 sm:text-[28px] xl:text-[32px]">
              {playlist.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10.5px] text-black/45 sm:mt-3 sm:gap-2 sm:text-[11.5px]">
              {creator?.avatarUrl && (
                <img
                  src={coverUrl(creator.avatarUrl, 60)}
                  alt=""
                  className="h-[18px] w-[18px] rounded-full object-cover"
                  draggable={false}
                />
              )}
              <span className="text-black/65">{creator?.nickname ?? '网易云音乐'}</span>
              <span className="text-black/20">/</span>
              <span>{trackTotal} 首</span>
              <span className="text-black/20">/</span>
              <span>{formatCount(playlist.playCount)} 次播放</span>
            </div>

            {playlist.description && (
              <p className="mt-2.5 line-clamp-2 max-w-[720px] text-[11px] leading-relaxed text-black/40">
                {playlist.description}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-4 sm:gap-2.5">
              <button
                onClick={() => playQueue(tracks, 0)}
                disabled={!tracks.length}
                className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-brand px-4 py-2 text-[11.5px] font-medium text-white shadow-[0_8px_22px_rgba(255,25,73,0.28)] transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-40 sm:px-5 sm:text-[12px]"
              >
                <Play size={13} fill="currentColor" />
                播放全部
              </button>
              <button
                onClick={() => addToQueue(tracks)}
                disabled={!tracks.length}
                className="glass-soft flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/40 px-3.5 py-2 text-[11px] text-black/60 transition-all duration-200 hover:bg-white/30 hover:text-black disabled:opacity-40 sm:px-4 sm:text-[11.5px]"
              >
                <ListPlus size={13} />
                加入队列
              </button>
              <button
                onClick={() => downloadSongs(tracks, quality)}
                disabled={!tracks.length}
                className="glass-soft flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/40 px-3.5 py-2 text-[11px] text-black/60 transition-all duration-200 hover:bg-white/30 hover:text-black disabled:opacity-40 sm:px-4 sm:text-[11.5px]"
              >
                <Download size={13} />
                全部下载
              </button>
              {!isFavorites &&
                (isOwner ? (
                  <button
                    onClick={openEdit}
                    className="glass-soft flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/40 px-3.5 py-2 text-[11px] text-black/60 transition-all duration-200 hover:bg-white/30 hover:text-black sm:px-4 sm:text-[11.5px]"
                  >
                    <Pencil size={13} />
                    编辑歌单
                  </button>
                ) : (
                  <button
                    onClick={() => void toggleSubscribe()}
                    disabled={subBusy}
                    className={cn(
                      'glass-soft flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-[11px] transition-all duration-200 active:scale-95 sm:px-4 sm:text-[11.5px]',
                      subscribed
                        ? 'border-brand/30 text-brand'
                        : 'border-white/40 text-black/60 hover:bg-white/30 hover:text-black'
                    )}
                  >
                    <Heart size={13} fill={subscribed ? 'currentColor' : 'none'} />
                    {subscribed ? '已收藏' : '收藏歌单'}
                  </button>
                ))}
            </div>
          </div>
        </div>

        <div className="glass-panel mt-6 rounded-[24px] border border-white/40 p-2 pt-3 sm:mt-8">
          <div className="mb-1 grid grid-cols-[28px_minmax(0,1fr)_118px] items-center gap-3 px-3.5 text-[10px] text-black/35 sm:grid-cols-[28px_minmax(0,2.4fr)_52px_118px] min-[1040px]:grid-cols-[28px_minmax(0,2.4fr)_minmax(0,1.5fr)_52px_118px]">
            <span className="text-center">#</span>
            <span>标题</span>
            <span className="hidden min-[1040px]:block">专辑</span>
            <span className="hidden text-right sm:block">时长</span>
            <span />
          </div>
          <TrackList
            songs={tracks}
            onRemove={
              isOwner && !isFavorites ? (song) => void removeTrack(song) : undefined
            }
          />
        </div>
      </div>

      <AnimatePresence>
        {editOpen && (
          <motion.div
            key="edit-playlist"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[85] flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-slate-900/20 backdrop-blur-xl"
              onClick={() => setEditOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              role="dialog"
              aria-modal="true"
              aria-label="编辑歌单"
              className="glass-strong relative w-full max-w-[460px] rounded-[24px] border border-white/55 p-4 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.45)]"
            >
              <header className="flex items-start gap-3 px-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-white/45 bg-white/25 text-brand">
                  <Pencil size={15} strokeWidth={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium text-black/85">编辑歌单</div>
                  <div className="mt-0.5 text-[11px] text-black/40">修改会同步到网易云账号</div>
                </div>
                <button
                  onClick={() => setEditOpen(false)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-black/35 transition-all duration-200 hover:bg-white/35 hover:text-black active:scale-90"
                  aria-label="关闭"
                >
                  <X size={16} />
                </button>
              </header>

              <div className="mt-4 space-y-2.5">
                <label className="block">
                  <span className="mb-1 block px-1 text-[10.5px] text-black/40">名称</span>
                  <input
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    maxLength={40}
                    className="w-full rounded-[12px] border border-white/45 bg-white/20 px-3 py-2 text-[12.5px] text-black/85 outline-none placeholder:text-black/25 focus:border-white/70"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block px-1 text-[10.5px] text-black/40">简介</span>
                  <textarea
                    value={editDesc}
                    onChange={(event) => setEditDesc(event.target.value)}
                    rows={3}
                    maxLength={1000}
                    className="w-full resize-none rounded-[12px] border border-white/45 bg-white/20 px-3 py-2 text-[12.5px] leading-relaxed text-black/85 outline-none placeholder:text-black/25 focus:border-white/70"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block px-1 text-[10.5px] text-black/40">
                    标签（用逗号分隔）
                  </span>
                  <input
                    value={editTags}
                    onChange={(event) => setEditTags(event.target.value)}
                    placeholder="流行, 华语, 夜晚"
                    className="w-full rounded-[12px] border border-white/45 bg-white/20 px-3 py-2 text-[12.5px] text-black/85 outline-none placeholder:text-black/25 focus:border-white/70"
                  />
                </label>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => void removePlaylist()}
                  disabled={deleting}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition-all duration-200 active:scale-95 disabled:opacity-50',
                    confirmDelete
                      ? 'border-brand/40 bg-brand/10 text-brand'
                      : 'border-white/35 text-black/40 hover:bg-white/25 hover:text-brand'
                  )}
                >
                  {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                  {confirmDelete ? '确认删除' : '删除歌单'}
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => setEditOpen(false)}
                    className="rounded-full px-3.5 py-1.5 text-[11.5px] text-black/45 transition-colors hover:bg-white/25 hover:text-black"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => void saveEdit()}
                    disabled={saving || !editName.trim()}
                    className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-[11.5px] font-medium text-white transition-all duration-200 active:scale-95 disabled:opacity-40"
                  >
                    {saving && <Loader2 size={12} className="animate-spin" />}
                    {saving ? '保存中…' : '保存'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
