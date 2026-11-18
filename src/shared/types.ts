export type Quality = 'standard' | 'higher' | 'exhigh' | 'lossless' | 'hires'

export interface Artist {
  id: number
  name: string
}

export interface Album {
  id: number
  name: string
  picUrl?: string
}

export interface Song {
  id: number
  name: string
  ar?: Artist[]
  al?: Album
  artists?: Artist[]
  album?: Album
  dt?: number
  duration?: number
  fee?: number
  mvid?: number
  privilege?: Record<string, unknown>
}

export interface Playlist {
  id: number
  name: string
  coverImgUrl?: string
  picUrl?: string
  trackCount?: number
  playCount?: number
  description?: string
  tags?: string
  creator?: { userId: number; nickname: string; avatarUrl?: string }
  subscribed?: boolean
  userId?: number
  updateFrequency?: string
  specialType?: number
  tracks?: Song[]
}

export interface Profile {
  userId: number
  nickname: string
  avatarUrl?: string
  backgroundUrl?: string
  signature?: string
  follows?: number
  followeds?: number
  playlistCount?: number
}

export interface DownloadRecord {
  id: number
  /** song = 歌曲；mv = 音乐视频（id 存负数避免与歌曲 id 冲突） */
  kind?: 'song' | 'mv'
  name: string
  artist: string
  album: string
  cover: string
  level: Quality
  path: string
  size: number
  createdAt: number
}

export interface AppInfo {
  version: string
  electron: string
  chrome: string
  node: string
}

export interface Settings {
  quality: Quality
  volume: number
  downloadDir: string
  downloads: DownloadRecord[]
  lyricFontSize: number
  /** 歌词时间轴偏移，单位毫秒，正数表示歌词延后 */
  lyricOffset: number
  /** 播放速度倍率 */
  playbackRate: number
  /** 桌面歌词（仅桌面端，Wayland 下走 layer-shell） */
  desktopLyrics: boolean
  desktopLyricsLocked: boolean
  desktopLyricsFontSize: number
  desktopLyricsColor: string
  desktopLyricsOutline: boolean
  desktopLyricsBackground: boolean
  desktopLyricsBackgroundColor: string
  desktopLyricsBackgroundOpacity: number
}

/** 桌面歌词外观参数（主进程转发给 Python 覆盖层） */
export interface DesktopLyricTheme {
  font: number
  color: string
  outline: boolean
  background: boolean
  backgroundColor: string
  backgroundOpacity: number
}

export interface SongUrlResult {
  id: number
  url: string | null
  upstream: string | null
  level: Quality
  br: number
  size: number
  trial: boolean
  type: string
}

export interface LyricResult {
  lrc: string
  tlyric: string
  /** 逐字歌词（yrc），部分歌曲与登录态才有 */
  yrc?: string
  /** 逐字翻译 */
  ytlyric?: string
  /** 卡拉 OK 歌词 */
  klyric?: string
  /** 罗马音 */
  romalrc?: string
  /** 主进程/接口返回的歌词偏移（毫秒） */
  offset?: number
}

export interface ArtistDetail extends Artist {
  picUrl?: string
  img1v1Url?: string
  briefDesc?: string
  alias?: string[]
  trans?: string
  albumSize?: number
  musicSize?: number
  mvSize?: number
  followed?: boolean
}

export interface AlbumDetail extends Album {
  songs?: Song[]
  artist?: Artist
  artists?: Artist[]
  publishTime?: number
  company?: string
  description?: string
  briefDesc?: string
  size?: number
  subType?: string
  tags?: string
  followed?: boolean
}

export interface MV {
  id: number
  name: string
  cover?: string
  playCount?: number
  briefDesc?: string
  desc?: string
  artistName?: string
  artistId?: number
  duration?: number
  artists?: Artist[]
  subed?: boolean
}

export interface SearchUser {
  userId: number
  nickname: string
  avatarUrl?: string
  signature?: string
  followed?: boolean
  accountStatus?: number
  authStatus?: number
}

export interface UserProfile extends Profile {
  level?: number
  listenSongs?: number
  followed?: boolean
}

export interface ToplistSongPreview {
  first?: string
  second?: string
}

export interface ToplistItem {
  id: number
  name: string
  updateFrequency?: string
  coverUrl?: string
  coverImgUrl?: string
  tracks?: ToplistSongPreview[]
  toplistCode?: string
  category?: string
  canPlay?: boolean
}

export interface ToplistGroup {
  name: string
  categoryCode?: string
  list: ToplistItem[]
}

export interface PlaylistCategory {
  name: string
  resourceCount?: number
  hot?: boolean
  category?: number
}

export interface PlaylistCatalogue {
  all?: PlaylistCategory
  sub: PlaylistCategory[]
  categories?: Record<string, string[]>
}

export interface ArtistIntroduction {
  ti?: string
  txt?: string
}

export interface Banner {
  imageUrl: string
  targetId?: number
  targetType?: number
  url?: string
  title?: string
  typeTitle?: string
  encodeId?: string
}

export interface MvDownloadRequest {
  id: number
  name: string
  artist?: string
  resolution?: number
}

export interface MvDownloadResult {
  path: string
  size: number
}

export interface MvUrlResult {
  id: number
  url: string | null
  r?: number
  size?: number
  fee?: number
  mvFee?: number
  code?: number
}

export interface CommentUser {
  userId: number
  nickname: string
  avatarUrl?: string
  vipType?: number
}

export interface CommentBeReplied {
  user?: CommentUser
  content?: string
  beRepliedCommentId?: number
}

export interface Comment {
  commentId: number
  content: string
  time: number
  timeStr?: string
  likedCount: number
  liked?: boolean
  user?: CommentUser
  beReplied?: CommentBeReplied[]
  showFloorComment?: { replyCount?: number } | null
  replyCount?: number
  owner?: boolean
  ipLocation?: { location?: string } | null
  parentCommentId?: number
}

export interface CommentPage {
  total: number
  hasMore: boolean
  hotComments: Comment[]
  comments: Comment[]
  cursor?: string
}

export interface CommentFloorPage {
  total: number
  hasMore: boolean
  comments: Comment[]
}

export type CommentSort = 99 | 2 | 3

export interface MediaWarmPayload {
  id: number
  upstream: string
  level: Quality
  type: string
  size: number
}
