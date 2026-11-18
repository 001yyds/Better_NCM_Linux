import { useEffect, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import type { ToplistGroup } from '../../../shared/types'
import { api, coverUrl } from '../lib/api'
import { useUiStore } from '../store/ui'
import { Cover } from '../components/Cover'

export function ToplistPage(): React.JSX.Element {
  const navigate = useUiStore((state) => state.navigate)
  const toast = useUiStore((state) => state.toast)
  const [groups, setGroups] = useState<ToplistGroup[] | null>(null)

  useEffect(() => {
    let alive = true
    api.discover
      .toplistGroups()
      .then((result) => {
        if (alive) setGroups(result)
      })
      .catch(() => {
        if (!alive) return
        setGroups([])
        toast('排行榜加载失败', 'error')
      })
    return () => {
      alive = false
    }
  }, [toast])

  return (
    <div className="relative min-h-full px-4 pb-10 pt-5 sm:px-8 sm:pb-12 sm:pt-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[340px] bg-[radial-gradient(60%_100%_at_30%_0%,rgba(255,25,73,0.07),transparent_72%)]" />

      <header className="relative mb-6">
        <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.28em] text-black/35 sm:text-[10.5px]">
          <TrendingUp size={11} className="text-brand" />
          Charts
        </p>
        <h1 className="mt-2 text-[27px] font-semibold leading-none tracking-[-0.02em] text-black/90 sm:text-[32px]">
          排行榜
        </h1>
        <p className="mt-2 text-[12px] text-black/40 sm:text-[12.5px]">
          官方榜、精选榜、曲风榜与全球榜，每周持续更新
        </p>
      </header>

      {!groups ? (
        <div className="space-y-8">
          {Array.from({ length: 3 }).map((_, groupIndex) => (
            <div key={groupIndex}>
              <div className="skeleton mb-4 h-5 w-28 rounded" />
              <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="skeleton aspect-[3/4] rounded-[22px]" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : groups.length ? (
        <div className="space-y-8 sm:space-y-10">
          {groups.map((group) => (
            <section key={group.name}>
              <div className="mb-3 flex items-end justify-between">
                <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-black/85 sm:text-[18px]">
                  {group.name}
                </h2>
                <span className="text-[9.5px] uppercase tracking-[0.24em] text-black/30">
                  {group.list.length} 个榜单
                </span>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
                {group.list.map((item) => (
                  <button
                    key={`${group.name}-${item.id}`}
                    onClick={() =>
                      navigate({ page: 'playlist', id: item.id, title: item.name })
                    }
                    className="glass-tile group relative overflow-hidden rounded-[22px] border border-white/40 p-2 text-left transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.99]"
                  >
                    <div className="relative">
                      <Cover
                        src={coverUrl(item.coverUrl ?? item.coverImgUrl, 400)}
                        radius={16}
                        className="aspect-square w-full"
                        imgClassName="transition-transform duration-500 group-hover:scale-[1.045]"
                      />
                      <div className="pointer-events-none absolute inset-0 rounded-[16px] bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                      <span className="absolute left-2 top-2 rounded-full bg-black/35 px-1.5 py-0.5 text-[9px] text-white/80 backdrop-blur-md">
                        {item.updateFrequency ?? '持续更新'}
                      </span>
                    </div>
                    <div className="mt-2 px-1">
                      <div className="truncate text-[12.5px] text-black/80 group-hover:text-black">
                        {item.name}
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {(item.tracks ?? []).slice(0, 3).map((track, index) => (
                          <div key={`${track.first}-${index}`} className="truncate text-[10px] text-black/40">
                            <span className={index === 0 ? 'text-brand/80' : 'text-black/25'}>
                              {index + 1}
                            </span>
                            {`  ${track.first ?? ''}`}
                          </div>
                        ))}
                        {!item.tracks?.length && (
                          <div className="truncate text-[10px] text-black/25">点击查看完整榜单</div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-black/30">
          <TrendingUp size={34} strokeWidth={1.2} />
          <p className="mt-3 text-[12px]">暂时没有可用的排行榜</p>
        </div>
      )}
    </div>
  )
}
