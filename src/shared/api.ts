import type {
  AlbumDetail,
  AppInfo,
  Banner,
  ArtistDetail,
  ArtistIntroduction,
  Comment,
  CommentFloorPage,
  CommentPage,
  CommentSort,
  DesktopLyricTheme,
  DownloadRecord,
  LyricResult,
  MediaWarmPayload,
  MV,
  MvDownloadRequest,
  MvDownloadResult,
  MvUrlResult,
  Playlist,
  PlaylistCatalogue,
  Profile,
  Quality,
  SearchUser,
  Settings,
  Song,
  SongUrlResult,
  ToplistGroup,
  UserProfile
} from './types'

export interface SearchArtist {
  id: number
  name: string
  picUrl?: string
  albumSize?: number
  fansCount?: number
}

export interface SearchResult {
  songs?: Song[]
  songCount?: number
  playlists?: Playlist[]
  playlistCount?: number
  artists?: SearchArtist[]
  artistCount?: number
  albums?: AlbumDetail[]
  albumCount?: number
  mvs?: MV[]
  mvCount?: number
  userprofiles?: SearchUser[]
  userCount?: number
}

export type SearchType = 1 | 10 | 100 | 1000 | 1002 | 1004 | 1006

export interface ArtistPageData {
  artist: ArtistDetail
  hotSongs: Song[]
  more: boolean
}

export interface ArtistAlbumsData {
  artist: ArtistDetail | null
  hotAlbums: AlbumDetail[]
  more: boolean
}

export interface ArtistMvsData {
  mvs: MV[]
  hasMore: boolean
}

export interface ArtistIntroData {
  briefDesc: string
  introduction: ArtistIntroduction[]
}

export interface AlbumPageData {
  album: AlbumDetail
  songs: Song[]
}

export interface MVListData {
  data: MV[]
  hasMore: boolean
  count?: number
}

export interface MVQuery {
  area?: string
  type?: string
  order?: string
  limit?: number
  offset?: number
}

export interface HighQualityParams {
  cat?: string
  limit?: number
  lasttime?: number
  offset?: number
  total?: boolean
}

export interface HighQualityData {
  playlists: Playlist[]
  more: boolean
  lasttime?: number
  total?: number
}

export interface PlaylistMutation {
  id: number
  name: string
  coverImgUrl?: string
  description?: string
}

export interface NcmApi {
  platform: 'desktop' | 'mobile'
  auth: {
    qrCreate(): Promise<{ key: string }>
    qrCheck(key: string): Promise<{ code: number; message?: string }>
    captchaSend(phone: string, countryCode?: string): Promise<{ code: number; message?: string }>
    phoneLogin(
      phone: string,
      captcha: string,
      countryCode?: string
    ): Promise<{ code: number; message?: string }>
    status(): Promise<{ loggedIn: boolean; profile: Profile | null; playlists: Playlist[] }>
    logout(): Promise<{ ok: boolean }>
    /** 仅手机端：打开官方网页登录页，人工完成短信登录与滑块验证 */
    webLogin?(): Promise<{ ok: boolean }>
  }
  /** 仅桌面端：桌面歌词覆盖层 */
  lyrics?: {
    update(state: { current: string; secondary?: string; playing?: boolean }): void
    setVisible(visible: boolean): Promise<boolean>
    setLocked(locked: boolean): Promise<boolean>
    setFont(size: number): Promise<boolean>
    setTheme(theme: DesktopLyricTheme): Promise<boolean>
  }
  user: {
    playlists(uid: number): Promise<Playlist[]>
    detail(uid: number): Promise<UserProfile>
    follows(uid: number, offset?: number, limit?: number): Promise<{ users: UserProfile[]; more: boolean }>
    followers(uid: number, offset?: number, limit?: number): Promise<{ users: UserProfile[]; more: boolean }>
    /** 听歌排行：type 1 = 最近一周，0 = 所有时间 */
    playRecord(uid: number, type?: 0 | 1): Promise<Song[]>
    /** 最近播放（PC 端） */
    recent(limit?: number, uid?: number): Promise<Song[]>
  }
  playlist: {
    detail(id: number): Promise<Playlist | null>
    dynamic(id: number): Promise<{ subscribed: boolean; playCount?: number; commentCount?: number }>
    catalogue(): Promise<PlaylistCatalogue>
    highquality(params?: HighQualityParams): Promise<HighQualityData>
    subscribe(id: number, subscribed: boolean): Promise<void>
    create(name: string): Promise<Playlist | null>
    remove(id: number): Promise<void>
    rename(id: number, name: string): Promise<void>
    updateDesc(id: number, description: string): Promise<void>
    updateTags(id: number, tags: string): Promise<void>
    addTracks(id: number, trackIds: number[]): Promise<void>
    removeTracks(id: number, trackIds: number[]): Promise<void>
  }
  artist: {
    detail(id: number): Promise<ArtistPageData>
    albums(id: number, offset?: number, limit?: number): Promise<ArtistAlbumsData>
    mvs(id: number, offset?: number, limit?: number): Promise<ArtistMvsData>
    introduction(id: number): Promise<ArtistIntroData>
    subscribe(id: number, subscribed: boolean): Promise<void>
    sublist(offset?: number, limit?: number): Promise<{ data: ArtistDetail[]; hasMore: boolean; count: number }>
    similar(id: number): Promise<ArtistDetail[]>
  }
  album: {
    detail(id: number): Promise<AlbumPageData>
    subscribe(id: number, subscribed: boolean): Promise<void>
    sublist(offset?: number, limit?: number): Promise<{ data: AlbumDetail[]; hasMore: boolean }>
  }
  mv: {
    all(query?: MVQuery): Promise<MVListData>
    exclusive(limit?: number, offset?: number): Promise<MV[]>
    url(id: number, resolution?: number): Promise<MvUrlResult>
    download(request: MvDownloadRequest): Promise<MvDownloadResult>
    subscribe(id: number, subscribed: boolean): Promise<void>
    sublist(offset?: number, limit?: number): Promise<MV[]>
  }
  radio: {
    /** 私人漫游下一批歌曲 */
    next(): Promise<Song[]>
    /** 垃圾桶 / 不感兴趣，并尽量返回后续歌曲 */
    trash(songId: number, time?: number): Promise<Song[]>
  }
  song: {
    url(id: number, level: Quality): Promise<SongUrlResult>
    lyric(id: number): Promise<LyricResult>
    like(id: number, like: boolean): Promise<void>
    detail(id: number): Promise<Song | null>
  }
  banner: {
    list(): Promise<Banner[]>
  }
  comment: {
    list(songId: number, offset?: number, limit?: number): Promise<CommentPage>
    sorted(
      songId: number,
      sort: CommentSort,
      pageNo?: number,
      limit?: number,
      cursor?: string
    ): Promise<CommentPage>
    floor(songId: number, parentCommentId: number, limit?: number): Promise<CommentFloorPage>
    like(songId: number, commentId: number, like: boolean): Promise<void>
    add(songId: number, content: string, replyTo?: number): Promise<Comment | null>
    remove(songId: number, commentId: number): Promise<void>
  }
  search: {
    query(keyword: string, type: SearchType, offset?: number, limit?: number): Promise<SearchResult>
    suggest(keyword: string): Promise<string[]>
    hot(): Promise<string[]>
  }
  discover: {
    daily(): Promise<Song[]>
    playlists(): Promise<Playlist[]>
    newsongs(): Promise<Song[]>
    toplists(): Promise<Playlist[]>
    toplistGroups(): Promise<ToplistGroup[]>
  }
  media: {
    warm(payload: MediaWarmPayload): Promise<void>
    local?(id: number): Promise<string | null>
  }
  cache: {
    info(): Promise<{ audio: number; images: number }>
    clear(): Promise<void>
  }
  settings: {
    get(): Promise<Settings>
    set(patch: Partial<Settings>): Promise<Settings>
    chooseDownloadDir(): Promise<string>
  }
  app: {
    info(): Promise<AppInfo>
  }
  downloads: {
    add(song: Song, level: Quality): Promise<DownloadRecord>
    remove(id: number, path: string): Promise<boolean>
    openFolder(): Promise<string>
  }
  win: {
    minimize(): void
    toggleMaximize(): Promise<boolean>
    close(): void
    isMaximized(): Promise<boolean>
    onMaximize(callback: (value: boolean) => void): () => void
  }
  events: {
    onDownloadProgress(callback: (payload: { id: number; received: number; total: number }) => void): () => void
    onMvProgress(callback: (payload: { id: number; received: number; total: number }) => void): () => void
    onPlayerCommand(callback: (command: string) => void): () => void
  }
}
