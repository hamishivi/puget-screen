import seattleProfile from './cities/seattle.json';
import type { CityConfig, SiteConfig } from './types';

// To move Puget Screen, add another city profile beside seattle.ts and swap this import.
export const siteConfig: SiteConfig = {
  url: 'https://puget.ivison.id.au',
  name: 'Puget Screen',
  shortName: 'PS',
  strapline: 'Moving images around the Sound',
  description: 'A daily guide to independent, repertory, experimental, and artist-made film.',
  headline: "What's showing",
  headlineEmphasis: 'around the Sound?',
  ticker: 'Independent film around the Sound · 16mm / 35mm / 70mm / digital',
  noteTitle: 'See something strange.',
  noteBody: 'One calendar for microcinemas, artist-made work, repertory runs, and the formats worth leaving home for.',
  foundedYear: 2026,
  city: seattleProfile as CityConfig,
};
