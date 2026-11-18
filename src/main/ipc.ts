import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { once } from 'node:events'
import { createWriteStream } from 'node:fs'
import { mkdir, stat, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import type { HighQualityParams, MVQuery, SearchType } from '../shared/api'
import type {
  DownloadRecord,
  MediaWarmPayload,
  MvDownloadRequest,
  MvDownloadResult,
  Quality,
  Settings,
  Song
} from '../shared/types'
import {
  setDesktopLyricsFont,
  setDesktopLyricsLocked,
  setDesktopLyricsTheme,
  setDesktopLyricsVisible,
  updateDesktopLyrics
} from './desktopLyrics'
import { netease } from './netease/client'
import { cacheInfo, clearCache, warmAudio } from './media'
import { addDownload, getSettings, updateSettings } from './store'

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

function artistsOf(song: Song): string {
  const list = song.ar ?? song.artists ?? []
  return list.map((artist) => artist.name).join(' / ') || '未知艺人'
}

function safeName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 120)
}

async function uniquePath(dir: string, base: string, ext: string): Promise<string> {
  let candidate = join(dir, `${base}.${ext}`)
  let index = 1
  for (;;) {
    try {
      await stat(candidate)
      index += 1
      candidate = join(dir, `${base} (${index}).${ext}`)
    } catch {
      return candidate
    }
  }
}

async function downloadSong(sender: Electron.WebContents, song: Song, level: Quality): Promise<DownloadRecord> {
  // 同一首歌只保留一份：已有记录且文件仍在时直接复用，避免重复下载
  const existing = getSettings().downloads.find((item) => item.id === song.id)
  if (existing) {
    try {
      await stat(existing.path)
      return existing
    } catch {
      // 记录还在但文件已丢失，继续重新下载
    }
  }

  const result = await netease.songUrl(song.id, level)
  if (!result.upstream) throw new Error('该歌曲暂无可下载音源')
  if (result.trial) throw new Error('会员歌曲仅提供试听片段，无法下载')

  const ext = result.type || (result.upstream.includes('.flac') ? 'flac' : 'mp3')
  const dir = getSettings().downloadDir
  await mkdir(dir, { recursive: true })
  const target = await uniquePath(dir, safeName(`${artistsOf(song)} - ${song.name}`), ext)

  const response = await fetch(result.upstream, {
    headers: { 'User-Agent': UA, Referer: 'https://music.163.com/' }
  })
  if (!response.ok || !response.body) throw new Error('下载失败，来源无响应')

  const total = Number(response.headers.get('content-length') ?? 0)
  const reader = response.body.getReader()
  const sink = createWriteStream(target)
  let received = 0

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = Buffer.from(value)
    received += chunk.byteLength
    if (!sink.write(chunk)) await once(sink, 'drain')
    if (total) sender.send('download:progress', { id: song.id, received, total })
  }
  sink.end()
  await once(sink, 'finish')

  const record: DownloadRecord = {
    id: song.id,
    name: song.name,
    artist: artistsOf(song),
    album: (song.al ?? song.album)?.name ?? '',
    cover: (song.al ?? song.album)?.picUrl ?? '',
    level: result.level,
    path: target,
    size: received,
    createdAt: Date.now()
  }
  addDownload(record)
  return record
}

async function downloadMv(
  sender: Electron.WebContents,
  request: MvDownloadRequest
): Promise<MvDownloadResult> {
  const result = await netease.mvUrl(request.id, request.resolution ?? 720)
  if (!result.url) throw new Error('该 MV 暂无可下载源')

  const dir = getSettings().downloadDir
  await mkdir(dir, { recursive: true })
  const base =
    safeName(`${request.artist ? `${request.artist} - ` : ''}${request.name}`) || `MV-${request.id}`
  const target = await uniquePath(dir, base, 'mp4')

  const response = await fetch(result.url, {
    headers: { 'User-Agent': UA, Referer: 'https://music.163.com/' }
  })
  if (!response.ok || !response.body) throw new Error('MV 下载失败，来源无响应')

  const total = Number(response.headers.get('content-length') ?? 0) || result.size || 0
  const reader = response.body.getReader()
  const sink = createWriteStream(target)
  let received = 0

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = Buffer.from(value)
    received += chunk.byteLength
    if (!sink.write(chunk)) await once(sink, 'drain')
    if (total) sender.send('mv:progress', { id: request.id, received, total })
  }
  sink.end()
  await once(sink, 'finish')

  addDownload({
    id: -request.id,
    kind: 'mv',
    name: request.name,
    artist: request.artist ?? '',
    album: 'MV',
    cover: '',
    level: 'standard',
    path: target,
    size: received,
    createdAt: Date.now()
  })

  return { path: target, size: received }
}

export function registerIpc(): void {
  ipcMain.handle('auth:qr:create', () => netease.qrCreate())
  ipcMain.handle('auth:qr:check', (_event, key: string) => netease.qrCheck(key))
  ipcMain.handle('auth:captcha:send', (_event, phone: string, countryCode?: string) =>
    netease.captchaSend(phone, countryCode)
  )
  ipcMain.handle(
    'auth:phone:login',
    (_event, phone: string, captcha: string, countryCode?: string) =>
      netease.phoneLogin(phone, captcha, countryCode)
  )
  ipcMain.handle('auth:status', async () => {
    const { profile } = await netease.account()
    if (!profile) return { loggedIn: false, profile: null, playlists: [] }
    const playlists = await netease.userPlaylists(profile.userId)
    return { loggedIn: true, profile, playlists }
  })
  ipcMain.handle('auth:logout', () => {
    netease.logout()
    return { ok: true }
  })

  ipcMain.handle('user:playlists', async (_event, uid: number) => netease.userPlaylists(uid))
  ipcMain.handle('user:detail', (_event, uid: number) => netease.userDetail(uid))
  ipcMain.handle('user:follows', (_event, uid: number, offset = 0, limit = 30) =>
    netease.userFollows(uid, offset, limit)
  )
  ipcMain.handle('user:followers', (_event, uid: number, offset = 0, limit = 30) =>
    netease.userFollowers(uid, offset, limit)
  )
  ipcMain.handle('user:play-record', (_event, uid: number, type: 0 | 1 = 1) =>
    netease.userPlayRecord(uid, type)
  )
  ipcMain.handle('user:recent', (_event, limit = 100, uid?: number) =>
    netease.userRecent(limit, uid)
  )
  ipcMain.handle('playlist:detail', (_event, id: number) => netease.playlistDetail(id))
  ipcMain.handle('playlist:dynamic', (_event, id: number) => netease.playlistDynamic(id))
  ipcMain.handle('playlist:catalogue', () => netease.playlistCatalogue())
  ipcMain.handle('playlist:highquality', (_event, params: HighQualityParams = {}) =>
    netease.playlistHighQuality(params)
  )
  ipcMain.handle('playlist:subscribe', (_event, id: number, subscribed: boolean) =>
    netease.playlistSubscribe(id, subscribed)
  )
  ipcMain.handle('playlist:create', (_event, name: string) => netease.playlistCreate(name))
  ipcMain.handle('playlist:remove', (_event, id: number) => netease.playlistRemove(id))
  ipcMain.handle('playlist:rename', (_event, id: number, name: string) =>
    netease.playlistRename(id, name)
  )
  ipcMain.handle('playlist:update-desc', (_event, id: number, description: string) =>
    netease.playlistUpdateDesc(id, description)
  )
  ipcMain.handle('playlist:update-tags', (_event, id: number, tags: string) =>
    netease.playlistUpdateTags(id, tags)
  )
  ipcMain.handle('playlist:add-tracks', (_event, id: number, trackIds: number[]) =>
    netease.playlistAddTracks(id, trackIds)
  )
  ipcMain.handle('playlist:remove-tracks', (_event, id: number, trackIds: number[]) =>
    netease.playlistRemoveTracks(id, trackIds)
  )
  ipcMain.handle('artist:detail', (_event, id: number) => netease.artistDetail(id))
  ipcMain.handle('artist:albums', (_event, id: number, offset = 0, limit = 30) =>
    netease.artistAlbums(id, offset, limit)
  )
  ipcMain.handle('artist:mvs', (_event, id: number, offset = 0, limit = 20) =>
    netease.artistMvs(id, offset, limit)
  )
  ipcMain.handle('artist:introduction', (_event, id: number) => netease.artistIntroduction(id))
  ipcMain.handle('artist:subscribe', (_event, id: number, subscribed: boolean) =>
    netease.artistSubscribe(id, subscribed)
  )
  ipcMain.handle('artist:sublist', (_event, offset = 0, limit = 50) =>
    netease.artistSublist(offset, limit)
  )
  ipcMain.handle('artist:similar', (_event, id: number) => netease.artistSimilar(id))
  ipcMain.handle('album:detail', (_event, id: number) => netease.albumDetail(id))
  ipcMain.handle('album:subscribe', (_event, id: number, subscribed: boolean) =>
    netease.albumSubscribe(id, subscribed)
  )
  ipcMain.handle('album:sublist', (_event, offset = 0, limit = 50) =>
    netease.albumSublist(offset, limit)
  )
  ipcMain.handle('mv:all', (_event, query: MVQuery = {}) => netease.mvAll(query))
  ipcMain.handle('mv:exclusive', (_event, limit = 20, offset = 0) =>
    netease.mvExclusive(limit, offset)
  )
  ipcMain.handle('mv:url', (_event, id: number, resolution = 1080) =>
    netease.mvUrl(id, resolution)
  )
  ipcMain.handle('mv:subscribe', (_event, id: number, subscribed: boolean) =>
    netease.mvSubscribe(id, subscribed)
  )
  ipcMain.handle('mv:sublist', (_event, offset = 0, limit = 50) =>
    netease.mvSublist(offset, limit)
  )
  ipcMain.handle('mv:download', (event, request: MvDownloadRequest) =>
    downloadMv(event.sender, request)
  )
  ipcMain.handle('radio:next', () => netease.radioNext())
  ipcMain.handle('radio:trash', (_event, songId: number, time = 0) =>
    netease.radioTrash(songId, time)
  )
  ipcMain.handle('song:url', (_event, id: number, level: Quality) => netease.songUrl(id, level))
  ipcMain.handle('song:lyric', (_event, id: number) => netease.lyric(id))
  ipcMain.handle('song:like', (_event, id: number, like: boolean) => netease.like(id, like))
  ipcMain.handle('song:detail', (_event, id: number) => netease.songInfo(id))
  ipcMain.handle('banner:list', () => netease.banners())
  ipcMain.handle('comment:list', (_event, songId: number, offset = 0, limit = 20) =>
    netease.comments(songId, offset, limit)
  )
  ipcMain.handle(
    'comment:sorted',
    (_event, songId: number, sort: 99 | 2 | 3, pageNo = 1, limit = 20, cursor = '') =>
      netease.sortedComments(songId, sort, pageNo, limit, cursor)
  )
  ipcMain.handle('comment:floor', (_event, songId: number, parentCommentId: number, limit = 50) =>
    netease.commentFloor(songId, parentCommentId, limit)
  )
  ipcMain.handle('comment:like', (_event, songId: number, commentId: number, like: boolean) =>
    netease.commentLike(songId, commentId, like)
  )
  ipcMain.handle('comment:add', (_event, songId: number, content: string, replyTo?: number) =>
    netease.addComment(songId, content, replyTo)
  )
  ipcMain.handle('comment:remove', (_event, songId: number, commentId: number) =>
    netease.deleteComment(songId, commentId)
  )
  ipcMain.handle(
    'search:query',
    (_event, keyword: string, type: SearchType, offset = 0, limit = 30) =>
      netease.search(keyword, type, offset, limit)
  )
  ipcMain.handle('search:suggest', (_event, keyword: string) => netease.searchSuggest(keyword))
  ipcMain.handle('search:hot', () => netease.searchHot())
  ipcMain.handle('discover:daily', () => netease.dailySongs())
  ipcMain.handle('discover:playlists', () => netease.recommendPlaylists())
  ipcMain.handle('discover:newsongs', () => netease.newSongs())
  ipcMain.handle('discover:toplists', () => netease.toplists())
  ipcMain.handle('discover:toplist-groups', () => netease.toplistGroups())

  ipcMain.handle('media:warm', (_event, payload: MediaWarmPayload) => warmAudio(payload))
  ipcMain.handle('cache:info', () => cacheInfo())
  ipcMain.handle('cache:clear', () => clearCache())
  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:set', (_event, patch: Partial<Settings>) => updateSettings(patch))
  ipcMain.handle('settings:choose-download-dir', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const options: Electron.OpenDialogOptions = {
      title: '选择下载目录',
      defaultPath: getSettings().downloadDir,
      properties: ['openDirectory', 'createDirectory']
    }
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
    if (result.canceled || !result.filePaths[0]) return getSettings().downloadDir
    return updateSettings({ downloadDir: result.filePaths[0] }).downloadDir
  })
  ipcMain.handle('app:info', () => ({
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  }))

  ipcMain.handle('download:add', async (event, song: Song, level: Quality) =>
    downloadSong(event.sender, song, level)
  )
  ipcMain.handle('download:remove', async (_event, id: number, path: string) => {
    const current = getSettings()
    const record = current.downloads.find((item) => item.id === id && item.path === path)
    if (!record) return false
    try {
      await unlink(record.path)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    updateSettings({
      downloads: current.downloads.filter((item) => !(item.id === id && item.path === path))
    })
    return true
  })
  ipcMain.handle('download:open-folder', async () => {
    const dir = getSettings().downloadDir
    await mkdir(dir, { recursive: true })
    await shell.openPath(dir)
    return dir
  })

  ipcMain.handle('win:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })
  ipcMain.handle('win:toggle-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return false
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
    return win.isMaximized()
  })
  ipcMain.handle('win:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })
  ipcMain.handle('win:is-maximized', (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false
  })

  // 桌面歌词通道：只接受主框架发来的、类型受控的参数，避免子框架或异常载荷
  const fromMainFrame = (
    event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent
  ): boolean => {
    try {
      return event.senderFrame === event.sender.mainFrame
    } catch {
      return false
    }
  }
  const boundedText = (value: unknown): string =>
    typeof value === 'string' ? value.slice(0, 500) : ''

  ipcMain.on('lyrics:update', (event, state: unknown) => {
    if (!fromMainFrame(event)) return
    if (!state || typeof state !== 'object') return
    const payload = state as Record<string, unknown>
    try {
      updateDesktopLyrics({
        current: boundedText(payload.current),
        secondary: boundedText(payload.secondary),
        playing: payload.playing !== false
      })
    } catch {
      // 覆盖层不可用时静默失败，不打断渲染层
    }
  })
  ipcMain.handle('lyrics:visible', (event, visible: unknown) => {
    if (!fromMainFrame(event)) return false
    setDesktopLyricsVisible(visible === true)
    return true
  })
  ipcMain.handle('lyrics:lock', (event, locked: unknown) => {
    if (!fromMainFrame(event)) return false
    setDesktopLyricsLocked(locked === true)
    return true
  })
  ipcMain.handle('lyrics:font', (event, size: unknown) => {
    if (!fromMainFrame(event)) return false
    const value =
      typeof size === 'number' && Number.isFinite(size)
        ? Math.min(96, Math.max(10, Math.round(size)))
        : 30
    setDesktopLyricsFont(value)
    return true
  })
  ipcMain.handle('lyrics:theme', (event, theme: unknown) => {
    if (!fromMainFrame(event)) return false
    const payload = theme && typeof theme === 'object' ? (theme as Record<string, unknown>) : {}
    const hex = (value: unknown, fallback: string): string =>
      typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback
    const bounded = (value: unknown, fallback: number, min: number, max: number): number =>
      typeof value === 'number' && Number.isFinite(value)
        ? Math.min(max, Math.max(min, Math.round(value)))
        : fallback
    setDesktopLyricsTheme({
      font: bounded(payload.font, 30, 10, 96),
      color: hex(payload.color, '#ffffff'),
      outline: payload.outline !== false,
      background: payload.background !== false,
      backgroundColor: hex(payload.backgroundColor, '#18181c'),
      backgroundOpacity: bounded(payload.backgroundOpacity, 42, 0, 100)
    })
    return true
  })
}
