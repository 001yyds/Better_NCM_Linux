import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, FolderPlus, Loader2, Plus, X } from 'lucide-react'
import { api, coverUrl } from '../lib/api'
import { cn } from '../lib/cn'
import { invalidatePlaylist } from '../lib/playlistCache'
import { useAuthStore } from '../store/auth'
import { useUiStore } from '../store/ui'
import { Cover } from './Cover'

export function PlaylistPicker(): React.JSX.Element {
  const song = useUiStore((state) => state.playlistPickerFor)
  const close = useUiStore((state) => state.closePlaylistPicker)
  const setLoginOpen = useUiStore((state) => state.setLoginOpen)
  const toast = useUiStore((state) => state.toast)
  const loggedIn = useAuthStore((state) => state.loggedIn)
  const playlists = useAuthStore((state) => state.playlists)
  const refresh = useAuthStore((state) => state.refresh)

  const [busy, setBusy] = useState<number | null>(null)
  const [done, setDone] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  const addTo = async (id: number, title: string): Promise<void> => {
    if (!song) return
    setBusy(id)
    try {
      await api.playlist.addTracks(id, [song.id])
      invalidatePlaylist(id)
      setDone(id)
      toast(`已添加到《${title}》`, 'success')
      window.setTimeout(close, 420)
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : '添加失败', 'error')
    } finally {
      setBusy(null)
    }
  }

  const createAndAdd = async (): Promise<void> => {
    const value = name.trim()
    if (!value || !song || creating) return
    setCreating(true)
    try {
      const playlist = await api.playlist.create(value)
      await refresh()
      if (playlist?.id) {
        await api.playlist.addTracks(playlist.id, [song.id])
        invalidatePlaylist(playlist.id)
        toast(`已创建《${value}》并添加歌曲`, 'success')
      } else {
        toast(`已创建《${value}》`, 'success')
      }
      setName('')
      close()
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : '创建歌单失败', 'error')
    } finally {
      setCreating(false)
    }
  }

  return (
    <AnimatePresence>
      {song && (
        <motion.div
          key="playlist-picker"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[85] flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-xl" onClick={close} />
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="添加到歌单"
            className="glass-strong relative max-h-[80vh] w-full max-w-[420px] overflow-hidden rounded-[24px] border border-white/55 p-4 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.45)]"
          >
            <header className="flex items-start gap-3 px-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-white/45 bg-white/25 text-brand">
                <FolderPlus size={16} strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium text-black/85">添加到歌单</div>
                <div className="mt-0.5 truncate text-[11px] text-black/40">
                  {song.name}
                </div>
              </div>
              <button
                onClick={close}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-black/35 transition-all duration-200 hover:bg-white/35 hover:text-black active:scale-90"
                aria-label="关闭"
              >
                <X size={16} />
              </button>
            </header>

            {!loggedIn ? (
              <div className="flex flex-col items-center gap-3 py-10">
                <p className="text-[12px] text-black/45">登录后才能把歌曲添加到歌单</p>
                <button
                  onClick={() => {
                    close()
                    setLoginOpen(true)
                  }}
                  className="rounded-full bg-brand px-4 py-2 text-[12px] font-medium text-white transition-transform active:scale-95"
                >
                  立即登录
                </button>
              </div>
            ) : (
              <>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void createAndAdd()
                    }}
                    placeholder="新建歌单并添加"
                    maxLength={40}
                    className="min-w-0 flex-1 rounded-[12px] border border-white/45 bg-white/20 px-3 py-2 text-[12px] text-black/80 outline-none placeholder:text-black/25 focus:border-white/70"
                  />
                  <button
                    onClick={() => void createAndAdd()}
                    disabled={!name.trim() || creating}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-brand text-white transition-transform active:scale-95 disabled:opacity-35"
                    aria-label="新建歌单并添加"
                  >
                    {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} />}
                  </button>
                </div>

                <div className="mt-3 max-h-[46vh] overflow-y-auto pr-0.5">
                  {playlists.length ? (
                    playlists.map((playlist) => (
                      <button
                        key={playlist.id}
                        onClick={() => void addTo(playlist.id, playlist.name)}
                        disabled={busy !== null}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-[12px] px-2 py-1.5 text-left transition-colors duration-200',
                          done === playlist.id ? 'bg-brand/10' : 'hover:bg-white/25'
                        )}
                      >
                        <Cover
                          src={coverUrl(playlist.coverImgUrl ?? playlist.picUrl, 80)}
                          radius={7}
                          className="h-9 w-9 shrink-0"
                        />
                        <span className="min-w-0 flex-1 truncate text-[12px] text-black/75">
                          {playlist.name}
                        </span>
                        {busy === playlist.id ? (
                          <Loader2 size={13} className="shrink-0 animate-spin text-black/35" />
                        ) : done === playlist.id ? (
                          <Check size={14} className="shrink-0 text-brand" />
                        ) : null}
                      </button>
                    ))
                  ) : (
                    <p className="py-8 text-center text-[12px] text-black/30">还没有歌单，先新建一个</p>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
