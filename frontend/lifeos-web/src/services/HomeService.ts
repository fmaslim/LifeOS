import type { HomeData } from '../models/home'

/** Contract for Home data; a backend adapter can implement this when integrations are introduced. */
export interface HomeService { getHomeData(): HomeData }
