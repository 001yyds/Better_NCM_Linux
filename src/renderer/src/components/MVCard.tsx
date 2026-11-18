import { motion } from 'framer-motion'
import { Play, Video } from 'lucide-react'
import type { MV } from '../../../shared/types'
import { coverUrl } from '../lib/api'
import { formatCount, formatDuration } from '../lib/format'
import { useUiStore } from '../store/ui'
import { Cover } from './Cover'

export function MVCard({ mv, className }: { mv: MV; className?: string }): React.JSX.Element {
  const navigate = useUiStore((state) => state.navigate)

  return (
    <motion.button
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      onClick={() =>
        navigate({
          page: 'mv',
          id: mv.id,
          title: mv.name,
          cover: mv.cover ?? '',
          artist: mv.artistName ?? mv.artists?.map((item) => item.name).join(' / ') ?? '',
          artistId: mv.artistId,
          subed: mv.subed
        })
      }
      className={`glass-tile group block w-full rounded-[20px] border border-white/40 p-2 text-left ${className ?? ''}`}
    >
      <div className="relative">
        <Cover
          src={coverUrl(mv.cover, 480)}
          radius={14}
          className="aspect-video w-full"
          imgClassName="transition-transform duration-500 ease-out group-hover:scale-[1.045]"
        />
        <div className="pointer-events-none absolute inset-0 rounded-[14px] bg-black/10 transition-colors duration-300 group-hover:bg-black/25" />
        <div className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-black opacity-0 shadow-lg backdrop-blur transition-all duration-300 group-hover:opacity-100">
          <Play size={16} fill="currentColor" className="ml-0.5" />
        </div>
        {mv.duration ? (
          <span className="tabular absolute bottom-2 right-2 rounded-full bg-black/45 px-1.5 py-0.5 text-[9.5px] text-white/85 backdrop-blur-md">
            {formatDuration(mv.duration)}
          </span>
        ) : null}
        {mv.playCount != null && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/35 px-1.5 py-0.5 text-[9.5px] text-white/80 backdrop-blur-md">
            <Video size={9} />
            {formatCount(mv.playCount)}
          </span>
        )}
      </div>
      <div className="mt-2 line-clamp-1 px-0.5 text-[12.5px] text-black/75 transition-colors group-hover:text-black">
        {mv.name}
      </div>
      <div className="truncate px-0.5 pb-0.5 text-[10.5px] text-black/35">
        {mv.artistName ?? mv.artists?.map((item) => item.name).join(' / ') ?? '未知歌手'}
      </div>
    </motion.button>
  )
}
