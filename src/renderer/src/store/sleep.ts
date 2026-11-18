import { create } from 'zustand'
import { usePlayerStore } from './player'
import { useUiStore } from './ui'

interface SleepState {
  /** 定时结束的时间戳，null 表示未开启 */
  endAt: number | null
  /** 剩余秒数，用于界面倒计时 */
  remaining: number
  /** 当前选中的定时长度，0 表示关闭 */
  minutes: number
  setTimer: (minutes: number | null) => void
  cancel: () => void
}

let ticker: ReturnType<typeof setInterval> | undefined

function stopTicker(): void {
  if (ticker) {
    clearInterval(ticker)
    ticker = undefined
  }
}

export const useSleepStore = create<SleepState>((set) => ({
  endAt: null,
  remaining: 0,
  minutes: 0,

  setTimer: (minutes) => {
    stopTicker()
    if (!minutes || minutes <= 0) {
      set({ endAt: null, remaining: 0, minutes: 0 })
      return
    }
    const endAt = Date.now() + minutes * 60_000
    set({ endAt, remaining: minutes * 60, minutes })
    ticker = setInterval(() => {
      const rest = Math.max(0, Math.round((endAt - Date.now()) / 1000))
      if (rest > 0) {
        set({ remaining: rest })
        return
      }
      stopTicker()
      set({ endAt: null, remaining: 0, minutes: 0 })
      const player = usePlayerStore.getState()
      if (player.playing) player.toggle()
      useUiStore.getState().toast('睡眠定时结束，已暂停播放', 'info')
    }, 1000)
  },

  cancel: () => {
    stopTicker()
    set({ endAt: null, remaining: 0, minutes: 0 })
  }
}))
