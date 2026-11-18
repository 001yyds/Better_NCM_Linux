import { Heart, Loader2, Pause, Play, Radio, SkipForward, Square, ThumbsDown } from 'lucide-react'
import { songArtists, songCover } from '../lib/api'
import { cn } from '../lib/cn'
import { useLikesStore } from '../store/likes'
import { usePlayerStore } from '../store/player'
import { useRadioStore } from '../store/radio'
import { useUiStore } from '../store/ui'
import { Cover } from '../components/Cover'
import { Equalizer } from '../components/Equalizer'

export function RadioPage(): React.JSX.Element {
  const toast = useUiStore((state) => state.toast)
  const active = useRadioStore((state) => state.active)
  const loading = useRadioStore((state) => state.loading)
  const start = useRadioStore((state) => state.start)
  const stop = useRadioStore((state) => state.stop)
  const dislike = useRadioStore((state) => state.dislike)

  const current = usePlayerStore((state) => state.current)
  const playing = usePlayerStore((state) => state.playing)
  const playerLoading = usePlayerStore((state) => state.loading)
  const queue = usePlayerStore((state) => state.queue)
  const index = usePlayerStore((state) => state.index)
  const toggle = usePlayerStore((state) => state.toggle)
  const next = usePlayerStore((state) => state.next)
  const playQueue = usePlayerStore((state) => state.playQueue)
  const liked = useLikesStore((state) => state.liked)

  const isLiked = current ? liked.has(current.id) : false
  const radioCurrent = active && current ? current : null

  return (
    <div className="relative min-h-full px-4 pb-10 pt-5 sm:px-8 sm:pb-12 sm:pt-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[380px] bg-[radial-gradient(65%_100%_at_30%_0%,rgba(255,25,73,0.08),transparent_70%)]" />

      <header className="relative mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.28em] text-black/35 sm:text-[10.5px]">
            <Radio size={11} className="text-brand" />
            Personal FM
          </p>
          <h1 className="mt-2 text-[27px] font-semibold leading-none tracking-[-0.02em] text-black/90 sm:text-[32px]">
            私人漫游
          </h1>
          <p className="mt-2 text-[12px] text-black/40 sm:text-[12.5px]">
            根据你的口味持续推荐，不喜欢的歌可以直接丢进垃圾桶
          </p>
        </div>
        {active && (
          <button
            onClick={() => {
              stop()
              toast('已停止漫游', 'info')
            }}
            className="glass-soft flex items-center gap-1.5 rounded-full border border-white/40 px-3.5 py-1.5 text-[11px] text-black/50 transition-all duration-200 hover:bg-white/30 hover:text-black active:scale-95"
          >
            <Square size={11} />
            停止漫游
          </button>
        )}
      </header>

      {!active ? (
        <section className="glass-panel relative overflow-hidden rounded-[28px] border border-white/45 p-6 sm:p-9">
          <div className="pointer-events-none absolute -right-16 -top-20 h-[300px] w-[300px] rounded-full bg-brand/10 blur-[80px]" />
          <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-[560px]">
              <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-white/45 bg-white/25 text-brand">
                <Radio size={26} strokeWidth={1.7} />
              </div>
              <h2 className="mt-4 text-[20px] font-semibold tracking-[-0.02em] text-black/85">
                开启一段不会停的漫游
              </h2>
              <p className="mt-2 text-[12px] leading-relaxed text-black/45">
                私人漫游会不断续上新的歌曲；播放、喜欢与垃圾桶都会影响后续推荐。
                登录后推荐会更贴近你的口味。
              </p>
            </div>
            <button
              onClick={() => void start()}
              disabled={loading}
              className="flex shrink-0 items-center gap-2 rounded-full bg-brand px-6 py-3 text-[13px] font-medium text-white shadow-[0_12px_30px_rgba(255,25,73,0.3)] transition-all duration-200 hover:scale-[1.03] active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
              {loading ? '正在准备…' : '开始漫游'}
            </button>
          </div>
        </section>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="glass-panel relative overflow-hidden rounded-[28px] border border-white/45 p-5 sm:p-7">
            <div className="pointer-events-none absolute inset-0 opacity-60">
              {radioCurrent && (
                <img
                  src={songCover(radioCurrent, 500)}
                  alt=""
                  className="h-full w-full scale-125 object-cover opacity-20 blur-[60px]"
                  draggable={false}
                />
              )}
            </div>

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
              <Cover
                src={songCover(radioCurrent ?? undefined, 500)}
                radius={22}
                className="h-[190px] w-[190px] shrink-0 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.45)] sm:h-[220px] sm:w-[220px]"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.3em] text-black/40">
                  <Radio size={10} className="text-brand" />
                  Now Roaming
                </div>
                <h2 className="mt-2 line-clamp-2 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-black/90 sm:text-[26px]">
                  {radioCurrent?.name ?? '准备下一首…'}
                </h2>
                <p className="mt-1.5 truncate text-[12.5px] text-black/45">
                  {radioCurrent ? songArtists(radioCurrent) : '私人漫游'}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    onClick={toggle}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#ff3559] to-[#d40036] text-white shadow-[0_10px_26px_rgba(255,25,73,0.3)] transition-all duration-200 hover:scale-[1.04] active:scale-95"
                    aria-label={playing ? '暂停' : '播放'}
                  >
                    {playerLoading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : playing ? (
                      <Pause size={17} fill="currentColor" />
                    ) : (
                      <Play size={17} fill="currentColor" className="ml-0.5" />
                    )}
                  </button>
                  <button
                    onClick={() => next()}
                    className="glass-soft flex h-9 items-center gap-1.5 rounded-full border border-white/45 px-3.5 text-[11px] text-black/55 transition-all duration-200 hover:bg-white/35 hover:text-black active:scale-95"
                  >
                    <SkipForward size={13} />
                    下一首
                  </button>
                  <button
                    onClick={() => radioCurrent && void useLikesStore.getState().toggle(radioCurrent)}
                    className={cn(
                      'glass-soft flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[11px] transition-all duration-200 active:scale-95',
                      isLiked
                        ? 'border-brand/30 text-brand'
                        : 'border-white/45 text-black/55 hover:bg-white/35 hover:text-black'
                    )}
                  >
                    <Heart size={13} fill={isLiked ? 'currentColor' : 'none'} />
                    {isLiked ? '已喜欢' : '喜欢'}
                  </button>
                  <button
                    onClick={() => radioCurrent && void dislike(radioCurrent)}
                    className="glass-soft flex h-9 items-center gap-1.5 rounded-full border border-white/45 px-3.5 text-[11px] text-black/50 transition-all duration-200 hover:bg-white/35 hover:text-black active:scale-95"
                    title="不感兴趣，并减少同类推荐"
                  >
                    <ThumbsDown size={13} />
                    不喜欢
                  </button>
                </div>

                <div className="mt-4 flex items-center gap-2 text-[10px] text-black/35">
                  <Equalizer active={playing} />
                  <span>已缓存 {queue.length} 首 · 自动续播</span>
                </div>
              </div>
            </div>
          </section>

          <aside className="glass-soft flex min-h-0 flex-col overflow-hidden rounded-[24px] border border-white/40">
            <header className="flex items-center justify-between px-4 pb-2 pt-4">
              <span className="text-[12.5px] font-medium text-black/80">漫游队列</span>
              <span className="text-[10px] text-black/35">{queue.length} 首</span>
            </header>
            <div className="max-h-[420px] min-h-0 flex-1 overflow-y-auto px-2 pb-3">
              {queue.map((song, position) => {
                const isCurrent = song.id === radioCurrent?.id
                return (
                  <button
                    key={`${song.id}-${position}`}
                    onClick={() => playQueue(queue, position)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-[12px] px-2 py-1.5 text-left transition-colors duration-200',
                      isCurrent ? 'glass-pill' : 'hover:bg-white/25'
                    )}
                  >
                    <div className="relative shrink-0">
                      <Cover src={songCover(song, 80)} radius={7} className="h-9 w-9" />
                      {isCurrent && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-[7px] bg-white/45 backdrop-blur-sm">
                          {playing ? <Equalizer active className="scale-75" /> : <Play size={11} fill="currentColor" />}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={cn('truncate text-[12px]', isCurrent ? 'text-brand' : 'text-black/80')}>
                        {song.name}
                      </div>
                      <div className="truncate text-[10px] text-black/40">{songArtists(song)}</div>
                    </div>
                    <span className="tabular shrink-0 text-[9.5px] text-black/25">{position + 1}</span>
                  </button>
                )
              })}
              {!queue.length && (
                <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-black/25">
                  <Radio size={24} strokeWidth={1.3} />
                  <p className="text-[11px]">正在准备歌曲…</p>
                </div>
              )}
            </div>
            <div className="border-t border-white/30 px-4 py-2.5 text-[10px] text-black/30">
              当前第 {Math.max(1, index + 1)} 首 · 快结束时自动续歌
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
