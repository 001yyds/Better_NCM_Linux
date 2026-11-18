export interface LyricWord {
  time: number
  duration: number
  text: string
}

export interface LyricLine {
  time: number
  text: string
  translation?: string
  /** 逐字歌词（yrc），用于卡拉 OK 高亮 */
  words?: LyricWord[]
  duration?: number
}

export function parseLyric(
  lrc: string,
  translated = '',
  userOffset = 0,
  yrc = ''
): LyricLine[] {
  const entries = new Map<number, LyricLine>()
  const credit =
    /(作词|作曲|编曲|制作|监制|录音|混音|母带|人声|和声|吉他|贝斯|鼓|键盘|弦乐|出品|发行|统筹|策划|OP|SP)[^:：]{0,8}[:：]/
  // LRC 的 [offset:毫秒] 是整首歌的时间轴修正，正数表示歌词整体延后
  const offsetTag = lrc.match(/\[offset:\s*([+-]?\d+)\s*\]/i)
  const offset = (offsetTag ? Number(offsetTag[1]) / 1000 : 0) + userOffset

  /**
   * 官方 v1 接口的 lrc 是「富文本行 + 标准 LRC」混合格式：
   *   {"t":1000,"c":[{"tx":"作词: "},{"tx":"周杰伦"}]}
   *   [01:23.456]歌词正文
   * 富文本行主要用于制作人员信息，按时间点并入即可。
   */
  const consumeRich = (line: string): void => {
    try {
      const parsed = JSON.parse(line) as { t?: unknown; c?: unknown }
      if (typeof parsed.t !== 'number' || !Array.isArray(parsed.c)) return
      const text = parsed.c
        .map((piece) => {
          if (!piece || typeof piece !== 'object') return ''
          const tx = (piece as { tx?: unknown }).tx
          return typeof tx === 'string' ? tx : ''
        })
        .join('')
        .trim()
      if (!text || credit.test(text)) return
      const time = parsed.t / 1000 + offset
      entries.set(time, { time, text })
    } catch {
      // 不是富文本行，交给标准 LRC 解析
    }
  }

  const consume = (raw: string, translation: boolean): void => {
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed) continue
      if (!translation && trimmed.startsWith('{')) {
        consumeRich(trimmed)
        continue
      }
      const stamps = [...line.matchAll(/\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g)]
      if (!stamps.length) continue
      const text = line.replace(/\[[^\]]*\]/g, '').trim()
      if (!text) continue
      if (!translation && credit.test(text)) continue
      for (const stamp of stamps) {
        const minutes = Number(stamp[1])
        const seconds = Number(stamp[2])
        const fraction = stamp[3] ? Number(`0.${stamp[3]}`) : 0
        const time = minutes * 60 + seconds + fraction + offset
        if (translation) {
          const existing = entries.get(time)
          if (existing) existing.translation = text
        } else {
          entries.set(time, { time, text })
        }
      }
    }
  }

  consume(lrc, false)
  consume(translated, true)

  // yrc：每行 [起始, 时长](字起始, 字时长, 0)字……，用于逐字高亮
  for (const raw of yrc.split('\n')) {
    const trimmed = raw.trim()
    if (!trimmed || trimmed.startsWith('{')) continue
    const header = /^\[(\d+),(\d+)\](.*)$/.exec(trimmed)
    if (!header) continue
    const start = Number(header[1]) / 1000 + offset
    const duration = Number(header[2]) / 1000
    const words: LyricWord[] = []
    const wordPattern = /\((\d+),(\d+),[^)]*\)([^(]*)/g
    let match: RegExpExecArray | null
    while ((match = wordPattern.exec(header[3]))) {
      const text = match[3]
      if (!text) continue
      words.push({
        time: Number(match[1]) / 1000 + offset,
        duration: Number(match[2]) / 1000,
        text
      })
    }
    if (!words.length) continue
    const text = words.map((word) => word.text).join('').trim()
    if (!text || credit.test(text)) continue
    const existing = entries.get(start)
    if (existing) {
      existing.words = words
      existing.duration = duration
      if (!existing.text) existing.text = text
    } else {
      entries.set(start, { time: start, text, words, duration })
    }
  }

  return [...entries.values()].sort((a, b) => a.time - b.time)
}

export function activeLineIndex(lines: LyricLine[], time: number): number {
  if (!lines.length) return -1
  let low = 0
  let high = lines.length - 1
  let result = 0
  while (low <= high) {
    const mid = (low + high) >> 1
    if (lines[mid].time <= time) {
      result = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  return result
}
