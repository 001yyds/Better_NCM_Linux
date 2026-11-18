import { motion } from 'framer-motion'
import type { ArtistDetail } from '../../../shared/types'
import { coverUrl } from '../lib/api'
import { formatCount } from '../lib/format'
import { useUiStore } from '../store/ui'
import { Cover } from './Cover'

export function ArtistCard({ artist }: { artist: ArtistDetail }): React.JSX.Element {
  const navigate = useUiStore((state) => state.navigate)

  return (
    <motion.button
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      onClick={() => navigate({ page: 'artist', id: artist.id, title: artist.name })}
      className="glass-tile group flex w-full flex-col items-center rounded-[22px] border border-white/40 p-3 text-center sm:p-4"
    >
      <Cover
        src={coverUrl(artist.picUrl, 320)}
        radius={999}
        className="h-[104px] w-[104px] shadow-[0_14px_34px_-20px_rgba(0,0,0,0.4)] sm:h-[118px] sm:w-[118px]"
        imgClassName="transition-transform duration-500 ease-out group-hover:scale-[1.045]"
      />
      <div className="mt-3 w-full truncate text-[12.5px] text-black/80 transition-colors group-hover:text-black">
        {artist.name}
      </div>
      <div className="mt-0.5 w-full truncate text-[10px] text-black/35">
        {artist.musicSize != null ? `${formatCount(artist.musicSize)} 首单曲` : '歌手'}
      </div>
    </motion.button>
  )
}
