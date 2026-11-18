import type { LyricLine } from '../lib/lyrics'

interface KaraokeTextProps {
  line: LyricLine
  time: number
  /** 尚未唱到的字的透明度 */
  dim?: number
}

/**
 * 逐字歌词高亮：已唱完的字保持不透明，当前字按时间进度渐显，未唱的字变淡。
 * 只在当前行使用；没有 yrc 数据时退回整行文本。
 */
export function KaraokeText({ line, time, dim = 0.34 }: KaraokeTextProps): React.JSX.Element {
  if (!line.words?.length) return <>{line.text}</>

  return (
    <span>
      {line.words.map((word, index) => {
        const progress =
          word.duration > 0
            ? Math.min(1, Math.max(0, (time - word.time) / word.duration))
            : time >= word.time
              ? 1
              : 0
        const opacity = progress >= 1 ? 1 : progress > 0 ? 0.5 + progress * 0.5 : dim
        return (
          <span
            key={`${word.time}-${index}`}
            style={{ opacity, transition: 'opacity 120ms linear' }}
          >
            {word.text}
          </span>
        )
      })}
    </span>
  )
}
