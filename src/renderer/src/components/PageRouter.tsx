import { AlbumPage } from '../pages/AlbumPage'
import { ArtistPage } from '../pages/ArtistPage'
import { CollectionPage } from '../pages/CollectionPage'
import { DailyPage } from '../pages/DailyPage'
import { DownloadsPage } from '../pages/DownloadsPage'
import { HistoryPage } from '../pages/HistoryPage'
import { Home } from '../pages/Home'
import { Library } from '../pages/Library'
import { MVPage } from '../pages/MVPage'
import { PlaylistPage } from '../pages/PlaylistPage'
import { RadioPage } from '../pages/RadioPage'
import { SearchPage } from '../pages/SearchPage'
import { SettingsPage } from '../pages/SettingsPage'
import { SquarePage } from '../pages/SquarePage'
import { ToplistPage } from '../pages/ToplistPage'
import { UserPage } from '../pages/UserPage'
import type { Route } from '../store/ui'

export function PageRouter({ route }: { route: Route }): React.JSX.Element {
  switch (route.page) {
    case 'library':
      return <Library />
    case 'playlist':
      return <PlaylistPage id={route.id} />
    case 'artist':
      return <ArtistPage id={route.id} title={route.title} />
    case 'album':
      return <AlbumPage id={route.id} title={route.title} />
    case 'mv':
      return (
        <MVPage
          id={route.id}
          title={route.title}
          cover={route.cover}
          artist={route.artist}
          artistId={route.artistId}
          subed={route.subed}
        />
      )
    case 'user':
      return <UserPage id={route.id} title={route.title} />
    case 'search':
      return <SearchPage initialKeyword={route.keyword} />
    case 'downloads':
      return <DownloadsPage />
    case 'daily':
      return <DailyPage />
    case 'radio':
      return <RadioPage />
    case 'toplist':
      return <ToplistPage />
    case 'square':
      return <SquarePage />
    case 'collection':
      return <CollectionPage />
    case 'history':
      return <HistoryPage />
    case 'settings':
      return <SettingsPage />
    default:
      return <Home />
  }
}
