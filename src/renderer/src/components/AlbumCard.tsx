import { motion } from 'framer-motion'
import type { AlbumDetail } from '../../../shared/types'
import { coverUrl } from '../lib/api'
import { useUiStore } from '../store/ui'
import { Cover } from './Cover'

export function AlbumCard({ album }: { album: AlbumDetail }): React.JSX.Element {
  const navigate = useUiStore((state) => state.navigate)
  const artist = album.artist ?? album.artists?.[0]

  return (
    <motion.button
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      onClick={() => navigate({ page: 'album', id: album.id, title: album.name })}
      className="glass-tile group block w-full rounded-[22px] border border-white/40 p-2 pb-2.5 text-left"
    >
      <Cover
        src={coverUrl(album.picUrl, 400)}
        radius={16}
        className="aspect-square w-full shadow-[0_14px_34px_-20px_rgba(0,0,0,0.4)]"
        imgClassName="transition-transform duration-500 ease-out group-hover:scale-[1.045]"
      />
      <div className="mt-2.5 line-clamp-1 px-1 text-[12.5px] leading-[1.45] text-black/75 transition-colors duration-200 group-hover:text-black">
        {album.name}
      </div>
      <div className="truncate px-1 text-[10.5px] text-black/35">{artist?.name ?? '未知歌手'}</div>
    </motion.button>
  )
}
