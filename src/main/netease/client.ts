import crypto from 'node:crypto'
import { clearCookies, loadCookies, saveCookies } from '../store'
import type {
  AlbumPageData,
  ArtistAlbumsData,
  ArtistIntroData,
  ArtistMvsData,
  ArtistPageData,
  HighQualityData,
  HighQualityParams,
  MVListData,
  MVQuery,
  SearchType
} from '../../shared/api'
import type {
  AlbumDetail,
  ArtistDetail,
  Comment,
  CommentFloorPage,
  CommentPage,
  CommentSort,
  LyricResult,
  MV,
  MvUrlResult,
  Playlist,
  PlaylistCatalogue,
  Profile,
  Quality,
  Song,
  SongUrlResult,
  ToplistGroup,
  UserProfile
} from '../../shared/types'
import { encodeWeapi } from './crypto'

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const DEVICE_ID_KEY = '3go8&$8*3*3h0k(2)2'

function createDeviceId(): string {
  return crypto.randomBytes(26).toString('hex').toUpperCase()
}

function anonymousUsername(deviceId: string): string {
  const xored = [...deviceId]
    .map((char, index) =>
      String.fromCharCode(char.charCodeAt(0) ^ DEVICE_ID_KEY.charCodeAt(index % DEVICE_ID_KEY.length))
    )
    .join('')
  const digest = crypto.createHash('md5').update(Buffer.from(xored, 'utf8')).digest('base64')
  return Buffer.from(`${deviceId} ${digest}`, 'utf8').toString('base64')
}

type Json = Record<string, any>

class NeteaseClient {
  private cookies = new Map<string, string>()
  private loaded = false
  private dirty = false
  private anonymousTask: Promise<void> | null = null

  private ensure(): void {
    if (this.loaded) return
    this.loaded = true
    for (const [key, value] of Object.entries(loadCookies())) this.cookies.set(key, value)
    if (!this.cookies.has('deviceId')) this.cookies.set('deviceId', createDeviceId())
    if (!this.cookies.has('_ntes_nuid')) {
      this.cookies.set('_ntes_nuid', crypto.randomBytes(16).toString('hex'))
    }
    if (!this.cookies.has('_ntes_nnid')) {
      this.cookies.set('_ntes_nnid', `${this.cookies.get('_ntes_nuid')},${Date.now()}`)
    }
    if (!this.cookies.has('WNMCID')) {
      this.cookies.set('WNMCID', `${crypto.randomBytes(3).toString('hex')}.${Date.now()}.01.0`)
    }
    this.cookies.set('__remember_me', 'true')
    this.cookies.set('ntes_kaola_ad', '1')
    this.dirty = true
  }

  isLoggedIn(): boolean {
    this.ensure()
    return this.cookies.has('MUSIC_U')
  }

  private cookieHeader(): string {
    this.ensure()
    const parts = new Map(this.cookies)
    if (!parts.has('os')) parts.set('os', 'pc')
    if (!parts.has('appver')) parts.set('appver', '8.10.40')
    return [...parts].map(([key, value]) => `${key}=${value}`).join('; ')
  }

  private async ensureAnonymous(): Promise<void> {
    this.ensure()
    if (this.cookies.has('MUSIC_A') || this.cookies.has('MUSIC_U')) return
    this.anonymousTask ??= this.registerAnonymous().finally(() => {
      this.anonymousTask = null
    })
    await this.anonymousTask
  }

  private async registerAnonymous(): Promise<void> {
    let deviceId = this.cookies.get('deviceId')
    if (!deviceId) {
      deviceId = createDeviceId()
      this.cookies.set('deviceId', deviceId)
      this.dirty = true
      this.persist()
    }
    try {
      await this.request('register/anonimous', { username: anonymousUsername(deviceId) })
    } catch {
      // 匿名会话只用于降低风控概率，建立失败时仍按普通请求继续
    }
  }

  private absorb(response: Response): void {
    const list = response.headers.getSetCookie?.() ?? []
    for (const line of list) {
      const pair = line.split(';')[0]
      const index = pair.indexOf('=')
      if (index <= 0) continue
      const key = pair.slice(0, index).trim()
      const value = pair.slice(index + 1).trim()
      if (value) this.cookies.set(key, value)
      else this.cookies.delete(key)
      this.dirty = true
    }
  }

  private absorbCookieString(raw: string): void {
    for (const piece of raw.split(';')) {
      const pair = piece.trim()
      const index = pair.indexOf('=')
      if (index <= 0) continue
      this.cookies.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim())
      this.dirty = true
    }
  }

  private persist(): void {
    if (!this.dirty) return
    this.dirty = false
    saveCookies(Object.fromEntries(this.cookies))
  }

  private assertOk(result: Json, fallback: string): void {
    if (typeof result.code === 'number' && result.code !== 200) {
      throw new Error(result.message ?? result.msg ?? fallback)
    }
  }

  private csrfToken(): string {
    return this.cookies.get('__csrf') ?? ''
  }

  private async request<T = Json>(path: string, payload: Json = {}): Promise<T> {
    this.ensure()
    const response = await fetch(`https://music.163.com/weapi/${path}`, {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: 'https://music.163.com',
        Origin: 'https://music.163.com',
        Cookie: this.cookieHeader()
      },
      body: encodeWeapi(payload)
    })
    this.absorb(response)
    this.persist()
    const text = await response.text()
    try {
      return JSON.parse(text) as T
    } catch {
      throw new Error(`接口返回异常 (${response.status})`)
    }
  }

  async qrCreate(): Promise<{ key: string }> {
    await this.ensureAnonymous()
    const result = await this.request('login/qrcode/unikey', { type: 1 })
    const key = (result.unikey ?? result.data?.unikey) as string | undefined
    if (!key) throw new Error(result.message ?? '无法获取登录二维码')
    return { key }
  }

  async qrCheck(key: string): Promise<{ code: number; message?: string }> {
    const result = await this.request('login/qrcode/client/login', { key, type: 1 })
    if (result.code === 803) {
      if (typeof result.cookie === 'string') this.absorbCookieString(result.cookie)
      this.persist()
    }
    return { code: result.code, message: result.message }
  }

  async captchaSend(phone: string, countryCode = '86'): Promise<{ code: number; message?: string }> {
    await this.ensureAnonymous()
    const result = await this.request('sms/captcha/sent', {
      cellphone: phone,
      ctcode: countryCode,
      secrete: 'music_middleuser_pclogin',
      csrf_token: this.csrfToken()
    })
    return { code: result.code ?? 0, message: result.message ?? result.msg }
  }

  async phoneLogin(
    phone: string,
    captcha: string,
    countryCode = '86'
  ): Promise<{ code: number; message?: string }> {
    await this.ensureAnonymous()
    const result = await this.request('w/login/cellphone', {
      type: '1',
      https: 'true',
      phone,
      countrycode: countryCode,
      captcha,
      remember: 'true',
      secureCaptcha: '',
      csrf_token: this.csrfToken()
    })
    if (result.code === 200) {
      if (typeof result.cookie === 'string') this.absorbCookieString(result.cookie)
      this.persist()
    }
    return { code: result.code ?? 0, message: result.message ?? result.msg }
  }

  async account(): Promise<{ profile: Profile | null; account: Json | null }> {
    if (!this.isLoggedIn()) return { profile: null, account: null }
    const result = await this.request('w/nuser/account/get', {})
    return { profile: (result.profile as Profile) ?? null, account: result.account ?? null }
  }

  logout(): void {
    this.cookies.clear()
    this.loaded = false
    this.dirty = false
    clearCookies()
  }

  async userPlaylists(uid: number): Promise<Playlist[]> {
    const result = await this.request('user/playlist', {
      uid,
      limit: 1000,
      offset: 0,
      includeVideo: true
    })
    return (result.playlist as Playlist[]) ?? []
  }

  async songDetail(ids: number[]): Promise<Song[]> {
    if (!ids.length) return []
    const result = await this.request('v3/song/detail', {
      c: JSON.stringify(ids.map((id) => ({ id })))
    })
    return (result.songs as Song[]) ?? []
  }

  async playlistDetail(id: number): Promise<Playlist | null> {
    const result = await this.request('v6/playlist/detail', { id, n: 1000, s: 8 })
    const playlist = result.playlist as Playlist | undefined
    if (!playlist) return null
    const order: number[] = ((playlist as Json).trackIds ?? []).map((item: Json) => item.id as number)
    const tracks = playlist.tracks ?? []
    if (!order.length) return playlist
    if (order.length === tracks.length && tracks.every((track, index) => track.id === order[index])) {
      return playlist
    }
    const known = new Map(tracks.map((track) => [track.id, track]))
    const missing = order.filter((trackId) => !known.has(trackId))
    for (let index = 0; index < missing.length; index += 500) {
      const batch = await this.songDetail(missing.slice(index, index + 500))
      for (const song of batch) known.set(song.id, song)
    }
    playlist.tracks = order.map((trackId) => known.get(trackId)).filter((song): song is Song => !!song)
    return playlist
  }

  async userDetail(uid: number): Promise<UserProfile> {
    const result = await this.request(`v1/user/detail/${uid}`, {})
    this.assertOk(result, '用户信息加载失败')
    const profile = (result.profile as UserProfile) ?? null
    if (!profile) throw new Error('用户不存在')
    return {
      ...profile,
      level: result.level ?? profile.level,
      listenSongs: result.listenSongs ?? profile.listenSongs
    }
  }

  async userFollows(
    uid: number,
    offset = 0,
    limit = 30
  ): Promise<{ users: UserProfile[]; more: boolean }> {
    const result = await this.request(`user/getfollows/${uid}`, { offset, limit, order: true })
    this.assertOk(result, '关注列表加载失败')
    const list = (result.follow as UserProfile[]) ?? []
    return { users: list, more: !!result.more }
  }

  async userFollowers(
    uid: number,
    offset = 0,
    limit = 30
  ): Promise<{ users: UserProfile[]; more: boolean }> {
    const result = await this.request(`user/getfolloweds/${uid}`, {
      userId: uid,
      offset,
      limit,
      time: -1,
      scene: 'user'
    })
    this.assertOk(result, '粉丝列表加载失败')
    return {
      users: (result.followeds as UserProfile[]) ?? [],
      more: !!result.more
    }
  }

  async userPlayRecord(uid: number, type: 0 | 1 = 1): Promise<Song[]> {
    const result = await this.request('v1/play/record', { uid, type })
    this.assertOk(result, '听歌排行加载失败')
    const list = (result.allData ?? result.weekData ?? []) as Json[]
    return list
      .map((item) => (item.song as Song) ?? null)
      .filter((song): song is Song => !!song?.id)
  }

  async userRecent(limit = 100): Promise<Song[]> {
    const result = await this.request('pc/recent/listen/list', { limit, total: true })
    this.assertOk(result, '最近播放加载失败')
    const resources = (result.data?.resources as Json[]) ?? []
    return resources
      .map((item) => ((item.song ?? item.resource ?? item) as Song) ?? null)
      .filter((song): song is Song => !!song?.id)
  }

  async artistDetail(id: number): Promise<ArtistPageData> {
    const result = await this.request(`v1/artist/${id}`, {})
    this.assertOk(result, '歌手信息加载失败')
    const artist = (result.artist as ArtistDetail) ?? null
    if (!artist) throw new Error('歌手不存在')
    return {
      artist,
      hotSongs: (result.hotSongs as Song[]) ?? [],
      more: !!result.more
    }
  }

  async artistAlbums(id: number, offset = 0, limit = 30): Promise<ArtistAlbumsData> {
    const result = await this.request(`artist/albums/${id}`, { offset, limit, total: true })
    this.assertOk(result, '歌手专辑加载失败')
    return {
      artist: (result.artist as ArtistDetail) ?? null,
      hotAlbums: (result.hotAlbums as AlbumDetail[]) ?? [],
      more: !!result.more
    }
  }

  async artistMvs(id: number, offset = 0, limit = 20): Promise<ArtistMvsData> {
    const result = await this.request('artist/mvs', { artistId: id, offset, limit, total: true })
    this.assertOk(result, '歌手 MV 加载失败')
    return { mvs: (result.mvs as MV[]) ?? [], hasMore: !!result.hasMore }
  }

  async artistIntroduction(id: number): Promise<ArtistIntroData> {
    const result = await this.request('artist/introduction', { id })
    this.assertOk(result, '歌手简介加载失败')
    return {
      briefDesc: (result.briefDesc as string) ?? '',
      introduction: (result.introduction as ArtistIntroData['introduction']) ?? []
    }
  }

  async artistSubscribe(id: number, subscribed: boolean): Promise<void> {
    this.ensure()
    const result = await this.request(subscribed ? 'artist/sub' : 'artist/unsub', {
      artistId: id,
      artistIds: `[${id}]`,
      csrf_token: this.csrfToken()
    })
    this.assertOk(result, subscribed ? '关注歌手失败' : '取消关注失败')
  }

  async artistSublist(
    offset = 0,
    limit = 50
  ): Promise<{ data: ArtistDetail[]; hasMore: boolean; count: number }> {
    const result = await this.request('artist/sublist', { offset, limit })
    this.assertOk(result, '收藏歌手加载失败')
    return {
      data: (result.data as ArtistDetail[]) ?? [],
      hasMore: !!result.hasMore,
      count: (result.count as number) ?? 0
    }
  }

  async artistSimilar(id: number): Promise<ArtistDetail[]> {
    const result = await this.request('discovery/simiArtist', { artistid: id })
    this.assertOk(result, '相似歌手加载失败')
    return (result.artists as ArtistDetail[]) ?? []
  }

  async albumDetail(id: number): Promise<AlbumPageData> {
    const result = await this.request(`v1/album/${id}`, {})
    this.assertOk(result, '专辑信息加载失败')
    const album = (result.album as AlbumDetail) ?? null
    if (!album) throw new Error('专辑不存在')
    const songs = (result.songs as Song[]) ?? album.songs ?? []
    return { album, songs }
  }

  async albumSubscribe(id: number, subscribed: boolean): Promise<void> {
    this.ensure()
    const result = await this.request(subscribed ? 'album/sub' : 'album/unsub', {
      id,
      csrf_token: this.csrfToken()
    })
    this.assertOk(result, subscribed ? '收藏专辑失败' : '取消收藏失败')
  }

  async albumSublist(
    offset = 0,
    limit = 50
  ): Promise<{ data: AlbumDetail[]; hasMore: boolean }> {
    const result = await this.request('album/sublist', { offset, limit, total: true })
    this.assertOk(result, '收藏专辑加载失败')
    return {
      data: (result.data as AlbumDetail[]) ?? [],
      hasMore: !!result.hasMore
    }
  }

  async mvAll(query: MVQuery = {}): Promise<MVListData> {
    const result = await this.request('mv/all', {
      area: query.area ?? '全部',
      type: query.type ?? '全部',
      order: query.order ?? '上升最快',
      limit: query.limit ?? 30,
      offset: query.offset ?? 0
    })
    this.assertOk(result, 'MV 列表加载失败')
    return {
      data: (result.data as MV[]) ?? [],
      hasMore: !!result.hasMore,
      count: result.count as number | undefined
    }
  }

  async mvExclusive(limit = 20, offset = 0): Promise<MV[]> {
    const result = await this.request('mv/exclusive/rcmd', { limit, offset })
    this.assertOk(result, 'MV 推荐加载失败')
    return (result.data as MV[]) ?? []
  }

  async mvUrl(id: number, resolution = 1080): Promise<MvUrlResult> {
    const result = await this.request('song/enhance/play/mv/url', { id, r: resolution })
    const data = (result.data as Record<string, unknown> | undefined) ?? {}
    return {
      id,
      url: (data.url as string) ?? null,
      r: data.r as number | undefined,
      size: data.size as number | undefined,
      fee: data.fee as number | undefined,
      mvFee: data.mvFee as number | undefined,
      code: result.code as number | undefined
    }
  }

  async mvSubscribe(id: number, subscribed: boolean): Promise<void> {
    this.ensure()
    const result = await this.request(subscribed ? 'mv/sub' : 'mv/unsub', {
      mvid: id,
      csrf_token: this.csrfToken()
    })
    this.assertOk(result, subscribed ? '收藏 MV 失败' : '取消收藏失败')
  }

  async mvSublist(offset = 0, limit = 50): Promise<MV[]> {
    const result = await this.request('mv/sublist', { offset, limit })
    this.assertOk(result, '收藏 MV 加载失败')
    return (result.data as MV[]) ?? []
  }

  async radioNext(): Promise<Song[]> {
    const result = await this.request('v1/radio/get', {})
    this.assertOk(result, '私人漫游加载失败')
    return (result.data as Song[]) ?? []
  }

  async radioTrash(songId: number, time = 0): Promise<Song[]> {
    this.ensure()
    const result = await this.request('v1/radio/skip', {
      songId,
      time,
      csrf_token: this.csrfToken()
    })
    this.assertOk(result, '操作失败')
    return (result.songs as Song[]) ?? []
  }

  async toplistGroups(): Promise<ToplistGroup[]> {
    const result = await this.request('toplist/detail/v2', {})
    this.assertOk(result, '排行榜加载失败')
    const groups = (result.data as Json[]) ?? []
    return groups.map((group) => ({
      name: (group.name as string) ?? '',
      categoryCode: group.categoryCode as string | undefined,
      list: ((group.list as Json[]) ?? []).map((item) => ({
        id: item.id as number,
        name: (item.name as string) ?? '',
        updateFrequency: item.updateFrequency as string | undefined,
        coverUrl: (item.coverUrl ?? item.coverImgUrl) as string | undefined,
        coverImgUrl: item.coverImgUrl as string | undefined,
        tracks: ((item.tracks as Json[]) ?? []).map((track) => ({
          first: track.first as string | undefined,
          second: track.second as string | undefined
        })),
        toplistCode: item.toplistCode as string | undefined,
        category: item.category as string | undefined,
        canPlay: item.canPlay as boolean | undefined
      }))
    }))
  }

  async playlistCatalogue(): Promise<PlaylistCatalogue> {
    const result = await this.request('playlist/catalogue', {})
    this.assertOk(result, '歌单分类加载失败')
    return {
      all: result.all as PlaylistCatalogue['all'],
      sub: (result.sub as PlaylistCatalogue['sub']) ?? [],
      categories: (result.categories as Record<string, string[]>) ?? {}
    }
  }

  async playlistHighQuality(params: HighQualityParams = {}): Promise<HighQualityData> {
    const result = await this.request('playlist/highquality/list', {
      cat: params.cat ?? '全部',
      limit: params.limit ?? 30,
      lasttime: params.lasttime ?? 0,
      offset: params.offset ?? 0,
      total: params.total ?? true
    })
    this.assertOk(result, '精品歌单加载失败')
    return {
      playlists: (result.playlists as Playlist[]) ?? [],
      more: !!result.more,
      lasttime: result.lasttime as number | undefined,
      total: result.total as number | undefined
    }
  }

  async playlistSubscribe(id: number, subscribed: boolean): Promise<void> {
    this.ensure()
    const result = await this.request(subscribed ? 'playlist/subscribe' : 'playlist/unsubscribe', {
      id,
      csrf_token: this.csrfToken()
    })
    this.assertOk(result, subscribed ? '收藏歌单失败' : '取消收藏失败')
  }

  async playlistCreate(name: string): Promise<Playlist | null> {
    this.ensure()
    const result = await this.request('playlist/create', {
      name,
      csrf_token: this.csrfToken()
    })
    this.assertOk(result, '创建歌单失败')
    return (result.playlist as Playlist) ?? null
  }

  async playlistRename(id: number, name: string): Promise<void> {
    this.ensure()
    const result = await this.request('playlist/update/name', {
      id,
      name,
      csrf_token: this.csrfToken()
    })
    this.assertOk(result, '歌单改名失败')
  }

  async playlistUpdateDesc(id: number, description: string): Promise<void> {
    this.ensure()
    const result = await this.request('playlist/desc/update', {
      id,
      desc: description,
      csrf_token: this.csrfToken()
    })
    this.assertOk(result, '歌单简介更新失败')
  }

  async playlistUpdateTags(id: number, tags: string): Promise<void> {
    this.ensure()
    const result = await this.request('playlist/tags/update', {
      id,
      tags,
      csrf_token: this.csrfToken()
    })
    this.assertOk(result, '歌单标签更新失败')
  }

  async playlistAddTracks(id: number, trackIds: number[]): Promise<void> {
    this.ensure()
    if (!trackIds.length) return
    const result = await this.request('playlist/manipulate/tracks', {
      pid: id,
      trackIds: JSON.stringify(trackIds),
      op: 'add',
      csrf_token: this.csrfToken()
    })
    this.assertOk(result, '添加歌曲失败')
  }

  async playlistRemoveTracks(id: number, trackIds: number[]): Promise<void> {
    this.ensure()
    if (!trackIds.length) return
    const result = await this.request('playlist/manipulate/tracks', {
      pid: id,
      trackIds: JSON.stringify(trackIds),
      op: 'del',
      csrf_token: this.csrfToken()
    })
    this.assertOk(result, '删除歌曲失败')
  }

  async songUrl(id: number, preferred: Quality): Promise<SongUrlResult> {
    const chain: Quality[] =
      preferred === 'lossless' || preferred === 'hires' ? [preferred, 'exhigh'] : [preferred]
    let trial: SongUrlResult | null = null
    for (const level of chain) {
      const result = await this.request('song/enhance/player/url/v1', {
        ids: JSON.stringify([id]),
        level,
        encodeType: 'flac'
      })
      const item = result.data?.[0]
      if (!item?.url) continue
      const candidate: SongUrlResult = {
        id,
        url: item.url,
        upstream: item.url,
        level,
        br: item.br ?? 0,
        size: item.size ?? 0,
        trial: !!item.freeTrialInfo,
        type: item.type ?? ''
      }
      if (!candidate.trial) return candidate
      trial ??= candidate
    }
    if (trial) return trial
    return { id, url: null, upstream: null, level: preferred, br: 0, size: 0, trial: false, type: '' }
  }

  async like(id: number, like: boolean): Promise<void> {
    this.ensure()
    const result = await this.request('radio/like', {
      alg: 'itembased',
      trackId: id,
      like,
      time: '3',
      csrf_token: this.csrfToken()
    })
    this.assertOk(result, like ? '喜欢失败，请稍后重试' : '取消喜欢失败，请稍后重试')
  }

  async comments(songId: number, offset = 0, limit = 20): Promise<CommentPage> {
    const result = await this.request(`v1/resource/comments/R_SO_4_${songId}`, {
      rid: songId,
      limit,
      offset,
      beforeTime: 0
    })
    this.assertOk(result, '评论加载失败')
    return {
      total: (result.total as number) ?? 0,
      hasMore: !!result.more,
      hotComments: (result.hotComments as Comment[]) ?? [],
      comments: (result.comments as Comment[]) ?? []
    }
  }

  async sortedComments(
    songId: number,
    sort: CommentSort,
    pageNo = 1,
    limit = 20,
    cursor = ''
  ): Promise<CommentPage> {
    const position = Math.max(0, pageNo - 1) * limit
    const cursorValue = sort === 99 ? String(position) : sort === 2 ? `normalHot#${position}` : cursor || '0'
    const result = await this.request('v2/resource/comments', {
      threadId: `R_SO_4_${songId}`,
      pageNo,
      showInner: true,
      pageSize: limit,
      cursor: cursorValue,
      sortType: sort
    })
    this.assertOk(result, '评论加载失败')
    const data = (result.data as Json) ?? {}
    return {
      total: (data.totalCount as number) ?? 0,
      hasMore: !!data.hasMore,
      hotComments: [],
      comments: (data.comments as Comment[]) ?? [],
      cursor: (data.cursor as string) ?? cursorValue
    }
  }

  async commentFloor(songId: number, parentCommentId: number, limit = 50): Promise<CommentFloorPage> {
    const result = await this.request('resource/comment/floor/get', {
      parentCommentId,
      threadId: `R_SO_4_${songId}`,
      time: -1,
      limit
    })
    this.assertOk(result, '回复加载失败')
    const data = (result.data as Json) ?? {}
    return {
      total: (data.totalCount as number) ?? 0,
      hasMore: !!data.hasMore,
      comments: (data.comments as Comment[]) ?? []
    }
  }

  async commentLike(songId: number, commentId: number, like: boolean): Promise<void> {
    this.ensure()
    const result = await this.request(`v1/comment/${like ? 'like' : 'unlike'}`, {
      threadId: `R_SO_4_${songId}`,
      commentId,
      csrf_token: this.csrfToken()
    })
    this.assertOk(result, like ? '点赞失败' : '取消点赞失败')
  }

  async addComment(songId: number, content: string, replyTo?: number): Promise<Comment | null> {
    this.ensure()
    const result = await this.request(`resource/comments/${replyTo ? 'reply' : 'add'}`, {
      threadId: `R_SO_4_${songId}`,
      content,
      ...(replyTo ? { commentId: replyTo } : {}),
      csrf_token: this.csrfToken()
    })
    this.assertOk(result, '评论失败，请稍后重试')
    return (result.comment as Comment) ?? null
  }

  async deleteComment(songId: number, commentId: number): Promise<void> {
    this.ensure()
    const result = await this.request('resource/comments/delete', {
      threadId: `R_SO_4_${songId}`,
      commentId,
      csrf_token: this.csrfToken()
    })
    this.assertOk(result, '删除评论失败')
  }

  async lyric(id: number): Promise<LyricResult> {
    const result = await this.request('song/lyric/v1', {
      id,
      cp: true,
      tv: 1,
      lv: 1,
      rv: 1,
      kv: 1
    })
    return {
      lrc: (result.lrc?.lyric as string) ?? '',
      tlyric: (result.tlyric?.lyric as string) ?? '',
      yrc: (result.yrc?.lyric as string) ?? '',
      ytlyric: (result.ytlyric?.lyric as string) ?? '',
      klyric: (result.klyric?.lyric as string) ?? '',
      romalrc: (result.romalrc?.lyric as string) ?? ''
    }
  }

  async search(
    keywords: string,
    type: SearchType,
    offset = 0,
    limit = 30
  ): Promise<Json> {
    const result = await this.request('cloudsearch/pc', {
      s: keywords,
      type,
      offset,
      limit,
      total: true
    })
    return (result.result as Json) ?? {}
  }

  async searchSuggest(keyword: string): Promise<string[]> {
    const result = await this.request('search/suggest/web', { s: keyword })
    const data = (result.result as Json) ?? {}
    const names: string[] = []
    const push = (value: unknown): void => {
      if (typeof value === 'string' && value.trim() && !names.includes(value)) names.push(value)
    }
    for (const song of (data.songs as Json[]) ?? []) push(song.name)
    for (const album of (data.albums as Json[]) ?? []) push(album.name)
    for (const artist of (data.artists as Json[]) ?? []) push(artist.name)
    for (const playlist of (data.playlists as Json[]) ?? []) push(playlist.name)
    return names.slice(0, 10)
  }

  async searchHot(): Promise<string[]> {
    const result = await this.request('search/default/keyword/get', {})
    const keywords = (result.data?.keywords as Json[]) ?? []
    return keywords
      .map((item) => (item.realkeyword ?? item.showKeyword) as string)
      .filter((item): item is string => !!item)
      .slice(0, 12)
  }

  async dailySongs(): Promise<Song[]> {
    const result = await this.request('v3/discovery/recommend/songs', {})
    return (result.data?.dailySongs as Song[]) ?? []
  }

  async recommendPlaylists(): Promise<Playlist[]> {
    const result = await this.request('personalized/playlist', { limit: 12, total: true, n: 1000 })
    return (result.result as Playlist[]) ?? []
  }

  async newSongs(): Promise<Song[]> {
    const result = await this.request('personalized/newsong', { type: 'recommend' })
    return ((result.result as Json[]) ?? [])
      .map((item) => (item.song as Song) ?? (item as unknown as Song))
      .filter((song) => !!song?.id)
  }

  async toplists(): Promise<Playlist[]> {
    const result = await this.request('toplist/detail', {})
    const list = (result.list as Json[]) ?? []
    return list.map((item) => {
      const tracks = ((item.tracks as Json[]) ?? []).map((track, index) => {
        const artist = (track.second as string) ?? ''
        return {
          id: Number(track.id ?? item.topTrackIds?.[index] ?? index + 1),
          name: (track.name as string) ?? (track.first as string) ?? '',
          ar: (track.ar as Song['ar']) ?? (artist ? [{ id: 0, name: artist }] : []),
          al: (track.al as Song['al']) ?? undefined,
          dt: track.dt as number | undefined
        } as Song
      })
      return { ...(item as unknown as Playlist), tracks }
    })
  }
}

export const netease = new NeteaseClient()
