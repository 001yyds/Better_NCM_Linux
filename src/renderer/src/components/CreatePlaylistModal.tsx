import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ListMusic, Loader2, X } from 'lucide-react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { useUiStore } from '../store/ui'

export function CreatePlaylistModal(): React.JSX.Element {
  const open = useUiStore((state) => state.createPlaylistOpen)
  const setOpen = useUiStore((state) => state.setCreatePlaylistOpen)
  const setLoginOpen = useUiStore((state) => state.setLoginOpen)
  const navigate = useUiStore((state) => state.navigate)
  const toast = useUiStore((state) => state.toast)
  const loggedIn = useAuthStore((state) => state.loggedIn)
  const refresh = useAuthStore((state) => state.refresh)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) setName('')
  }, [open])

  const submit = async (): Promise<void> => {
    const value = name.trim()
    if (!value || busy) return
    if (!loggedIn) {
      setOpen(false)
      setLoginOpen(true)
      return
    }
    setBusy(true)
    try {
      const playlist = await api.playlist.create(value)
      await refresh()
      toast(`已创建歌单《${value}》`, 'success')
      setOpen(false)
      if (playlist?.id) navigate({ page: 'playlist', id: playlist.id, title: playlist.name })
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : '创建歌单失败', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="create-playlist"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[85] flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-xl" onClick={() => setOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="新建歌单"
            className="glass-strong relative w-full max-w-[400px] rounded-[24px] border border-white/55 p-4 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.45)]"
          >
            <header className="flex items-start gap-3 px-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-white/45 bg-white/25 text-brand">
                <ListMusic size={16} strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium text-black/85">新建歌单</div>
                <div className="mt-0.5 text-[11px] text-black/40">创建后会同步到网易云账号</div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-black/35 transition-all duration-200 hover:bg-white/35 hover:text-black active:scale-90"
                aria-label="关闭"
              >
                <X size={16} />
              </button>
            </header>

            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void submit()
                if (event.key === 'Escape') setOpen(false)
              }}
              placeholder="歌单名称"
              maxLength={40}
              className="mt-4 w-full rounded-[14px] border border-white/45 bg-white/20 px-3.5 py-2.5 text-[13px] text-black/85 outline-none placeholder:text-black/25 focus:border-white/70"
            />

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-full px-3.5 py-1.5 text-[11.5px] text-black/45 transition-colors hover:bg-white/25 hover:text-black"
              >
                取消
              </button>
              <button
                onClick={() => void submit()}
                disabled={!name.trim() || busy}
                className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-[11.5px] font-medium text-white transition-all duration-200 active:scale-95 disabled:opacity-40"
              >
                {busy && <Loader2 size={12} className="animate-spin" />}
                {busy ? '创建中…' : '创建'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
