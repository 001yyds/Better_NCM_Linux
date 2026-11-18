import { contextBridge, ipcRenderer } from 'electron'
import type { HighQualityParams, MVQuery, SearchType } from '../shared/api'
import type {
  AppInfo,
  Comment,
  DesktopLyricTheme,
  MediaWarmPayload,
  MvDownloadRequest,
  Quality,
  Settings,
  Song
} from '../shared/types'

const invoke = <T>(channel: string, ...args: unknown[]): Promise<T> =>
  ipcRenderer.invoke(channel, ...args) as Promise<T>

const api = {
  platform: 'desktop' as const,
  auth: {
    qrCreate: () => invoke<{ key: string }>('auth:qr:create'),
    qrCheck: (key: string) => invoke<{ code: number; message?: string }>('auth:qr:check', key),
    captchaSend: (phone: string, countryCode = '86') =>
      invoke<{ code: number; message?: string }>('auth:captcha:send', phone, countryCode),
    phoneLogin: (phone: string, captcha: string, countryCode = '86') =>
      invoke<{ code: number; message?: string }>('auth:phone:login', phone, captcha, countryCode),
    status: () => invoke('auth:status'),
    logout: () => invoke('auth:logout')
  },
  user: {
    playlists: (uid: number) => invoke('user:playlists', uid),
    detail: (uid: number) => invoke('user:detail', uid),
    follows: (uid: number, offset = 0, limit = 30) =>
      invoke('user:follows', uid, offset, limit),
    followers: (uid: number, offset = 0, limit = 30) =>
      invoke('user:followers', uid, offset, limit),
    playRecord: (uid: number, type: 0 | 1 = 1) => invoke('user:play-record', uid, type),
    recent: (limit = 100, uid?: number) => invoke('user:recent', limit, uid)
  },
  playlist: {
    detail: (id: number) => invoke('playlist:detail', id),
    dynamic: (id: number) => invoke('playlist:dynamic', id),
    catalogue: () => invoke('playlist:catalogue'),
    highquality: (params: HighQualityParams = {}) => invoke('playlist:highquality', params),
    subscribe: (id: number, subscribed: boolean) =>
      invoke('playlist:subscribe', id, subscribed),
    create: (name: string) => invoke('playlist:create', name),
    remove: (id: number) => invoke('playlist:remove', id),
    rename: (id: number, name: string) => invoke('playlist:rename', id, name),
    updateDesc: (id: number, description: string) =>
      invoke('playlist:update-desc', id, description),
    updateTags: (id: number, tags: string) => invoke('playlist:update-tags', id, tags),
    addTracks: (id: number, trackIds: number[]) => invoke('playlist:add-tracks', id, trackIds),
    removeTracks: (id: number, trackIds: number[]) =>
      invoke('playlist:remove-tracks', id, trackIds)
  },
  artist: {
    detail: (id: number) => invoke('artist:detail', id),
    albums: (id: number, offset = 0, limit = 30) => invoke('artist:albums', id, offset, limit),
    mvs: (id: number, offset = 0, limit = 20) => invoke('artist:mvs', id, offset, limit),
    introduction: (id: number) => invoke('artist:introduction', id),
    subscribe: (id: number, subscribed: boolean) => invoke('artist:subscribe', id, subscribed),
    sublist: (offset = 0, limit = 50) => invoke('artist:sublist', offset, limit),
    similar: (id: number) => invoke('artist:similar', id)
  },
  album: {
    detail: (id: number) => invoke('album:detail', id),
    subscribe: (id: number, subscribed: boolean) => invoke('album:subscribe', id, subscribed),
    sublist: (offset = 0, limit = 50) => invoke('album:sublist', offset, limit)
  },
  mv: {
    all: (query: MVQuery = {}) => invoke('mv:all', query),
    exclusive: (limit = 20, offset = 0) => invoke('mv:exclusive', limit, offset),
    url: (id: number, resolution = 1080) => invoke('mv:url', id, resolution),
    download: (request: MvDownloadRequest) => invoke('mv:download', request),
    subscribe: (id: number, subscribed: boolean) => invoke('mv:subscribe', id, subscribed),
    sublist: (offset = 0, limit = 50) => invoke('mv:sublist', offset, limit)
  },
  radio: {
    next: () => invoke('radio:next'),
    trash: (songId: number, time = 0) => invoke('radio:trash', songId, time)
  },
  song: {
    url: (id: number, level: Quality) => invoke('song:url', id, level),
    lyric: (id: number) => invoke('song:lyric', id),
    like: (id: number, like: boolean) => invoke('song:like', id, like),
    detail: (id: number) => invoke('song:detail', id)
  },
  banner: {
    list: () => invoke('banner:list')
  },
  comment: {
    list: (songId: number, offset = 0, limit = 20) =>
      invoke('comment:list', songId, offset, limit),
    sorted: (songId: number, sort: 99 | 2 | 3, pageNo = 1, limit = 20, cursor = '') =>
      invoke('comment:sorted', songId, sort, pageNo, limit, cursor),
    floor: (songId: number, parentCommentId: number, limit = 50) =>
      invoke('comment:floor', songId, parentCommentId, limit),
    like: (songId: number, commentId: number, like: boolean) =>
      invoke('comment:like', songId, commentId, like),
    add: (songId: number, content: string, replyTo?: number) =>
      invoke<Comment | null>('comment:add', songId, content, replyTo),
    remove: (songId: number, commentId: number) =>
      invoke('comment:remove', songId, commentId)
  },
  search: {
    query: (keyword: string, type: SearchType, offset = 0, limit = 30) =>
      invoke('search:query', keyword, type, offset, limit),
    suggest: (keyword: string) => invoke('search:suggest', keyword),
    hot: () => invoke('search:hot')
  },
  discover: {
    daily: () => invoke('discover:daily'),
    playlists: () => invoke('discover:playlists'),
    newsongs: () => invoke('discover:newsongs'),
    toplists: () => invoke('discover:toplists'),
    toplistGroups: () => invoke('discover:toplist-groups')
  },
  media: {
    warm: (payload: MediaWarmPayload) => invoke('media:warm', payload)
  },
  cache: {
    info: () => invoke<{ audio: number; images: number }>('cache:info'),
    clear: () => invoke<void>('cache:clear')
  },
  settings: {
    get: () => invoke<Settings>('settings:get'),
    set: (patch: Partial<Settings>) => invoke<Settings>('settings:set', patch),
    chooseDownloadDir: () => invoke<string>('settings:choose-download-dir')
  },
  app: {
    info: () => invoke<AppInfo>('app:info')
  },
  downloads: {
    add: (song: Song, level: Quality) => invoke('download:add', song, level),
    remove: (id: number, path: string) => invoke<boolean>('download:remove', id, path),
    openFolder: () => invoke<string>('download:open-folder')
  },
  lyrics: {
    update: (state: { current: string; secondary?: string; playing?: boolean }) =>
      ipcRenderer.send('lyrics:update', state),
    setVisible: (visible: boolean) => invoke<boolean>('lyrics:visible', visible),
    setLocked: (locked: boolean) => invoke<boolean>('lyrics:lock', locked),
    setFont: (size: number) => invoke<boolean>('lyrics:font', size),
    setTheme: (theme: DesktopLyricTheme) => invoke<boolean>('lyrics:theme', theme)
  },
  win: {
    minimize: () => void ipcRenderer.invoke('win:minimize'),
    toggleMaximize: () => invoke<boolean>('win:toggle-maximize'),
    close: () => void ipcRenderer.invoke('win:close'),
    isMaximized: () => invoke<boolean>('win:is-maximized'),
    onMaximize: (callback: (value: boolean) => void) => {
      const handler = (_event: unknown, value: boolean): void => callback(value)
      ipcRenderer.on('win:maximized', handler)
      return () => ipcRenderer.removeListener('win:maximized', handler)
    }
  },
  events: {
    onDownloadProgress: (callback: (payload: { id: number; received: number; total: number }) => void) => {
      const handler = (_event: unknown, payload: { id: number; received: number; total: number }): void =>
        callback(payload)
      ipcRenderer.on('download:progress', handler)
      return () => ipcRenderer.removeListener('download:progress', handler)
    },
    onMvProgress: (callback: (payload: { id: number; received: number; total: number }) => void) => {
      const handler = (_event: unknown, payload: { id: number; received: number; total: number }): void =>
        callback(payload)
      ipcRenderer.on('mv:progress', handler)
      return () => ipcRenderer.removeListener('mv:progress', handler)
    },
    onPlayerCommand: (callback: (command: string) => void) => {
      const handler = (_event: unknown, command: string): void => callback(command)
      ipcRenderer.on('player:command', handler)
      return () => ipcRenderer.removeListener('player:command', handler)
    }
  }
}

contextBridge.exposeInMainWorld('ncm', api)
