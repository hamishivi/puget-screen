import manualListings from '../../content/listings/manual.json';
import syncedListings from '../../content/listings/synced.json';
import type { Listing } from '../config/types';

export const listings = [...manualListings, ...syncedListings] as Listing[];
