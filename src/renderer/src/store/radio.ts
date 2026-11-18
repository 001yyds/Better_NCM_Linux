import { create } from 'zustand'
import type { Song } from '../../../shared/types'
import { api } from '../lib/api'
import { usePlayerStore } from './player'
import { useUiStore } from './ui'

interface RadioState {
  active: boolean
  loading: boolean
  filling: boolean
  ids: number[]
  start: () => Promise<void>
  fetchMore: () => Promise<void>
  dislike: (song: Song) => Promise<void>
  stop: () => void
}

let subscribed = false

/** 播放器切到队列末尾前自动续上下一批，保证漫游不断 */
function ensureSubscription(): void {
  if (subscribed) return
  subscribed = true
  usePlayerStore.subscribe((state, previous) => {
    const radio = useRadioStore.getState()
    if (!radio.active) return

    if (state.current && radio.ids.length && !radio.ids.includes(state.current.id)) {
      radio.stop()
      return
    }

    if (state.queue !== previous.queue || state.index !== previous.index) {
      if (state.queue.length && state.index >= state.queue.length - 4) {
        void radio.fetchMore()
      }
    }
  })
}

export const useRadioStore = create<RadioState>((set, get) => ({
  active: false,
  loading: false,
  filling: false,
  ids: [],

  start: async () => {
    ensureSubscription()
    const { toast } = useUiStore.getState()
    set({ active: true, loading: true, ids: [] })
    try {
      const songs = await api.radio.next()
      if (!songs.length) {
        set({ active: false, loading: false })
        toast('私人漫游暂无歌曲，请稍后再试', 'info')
        return
      }
      set({ ids: songs.map((song) => song.id), loading: false })
      usePlayerStore.getState().playQueue(songs, 0)
    } catch (cause) {
      set({ active: false, loading: false })
      toast(cause instanceof Error ? cause.message : '私人漫游启动失败', 'error')
    }
  },

  fetchMore: async () => {
    if (!get().active || get().filling) return
    set({ filling: true })
    try {
      const songs = await api.radio.next()
      if (!get().active) return
      const known = new Set(get().ids)
      const fresh = songs.filter((song) => song.id && !known.has(song.id))
      if (!fresh.length) return
      set({ ids: [...get().ids, ...fresh.map((song) => song.id)] })
      const player = usePlayerStore.getState()
      usePlayerStore.setState({ queue: [...player.queue, ...fresh] })
    } catch {
      // 漫游续歌失败不打断当前播放
    } finally {
      set({ filling: false })
    }
  },

  dislike: async (song) => {
    const { toast } = useUiStore.getState()
    const player = usePlayerStore.getState()
    try {
      const fresh = await api.radio.trash(song.id, Math.floor(player.time))
      const known = new Set(get().ids)
      const extra = fresh.filter((item) => item.id && !known.has(item.id))
      if (get().active && extra.length) {
        set({ ids: [...get().ids, ...extra.map((item) => item.id)] })
        usePlayerStore.setState({ queue: [...usePlayerStore.getState().queue, ...extra] })
      }
    } catch {
      // 垃圾桶接口失败时仍然跳过本地这首
    }

    const nextIds = get().ids.filter((id) => id !== song.id)
    set({ ids: nextIds })
    const current = usePlayerStore.getState()
    const position = current.queue.findIndex((item) => item.id === song.id)
    if (position >= 0) {
      current.removeFromQueue(position)
    }
    toast('已减少此类推荐', 'info')
  },

  stop: () => set({ active: false, loading: false, filling: false, ids: [] })
}))
