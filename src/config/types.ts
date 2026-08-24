export type VenueSource =
  | { type: 'manual' }
  | { type: 'ics'; url: string }
  | { type: 'json'; url: string; adapter: string }
  | { type: 'html'; url: string; adapter: 'beacon' | 'nwff' | 'siff' | 'veezi' };

export type VenueConfig = {
  id: string;
  name: string;
  symbol?: string;
  neighborhood: string;
  website: string;
  calendarUrl: string;
  source: VenueSource;
  enabled: boolean;
};

export type CityConfig = {
  id: string;
  name: string;
  region: string;
  timezone: string;
  locale: string;
  coordinates: { latitude: number; longitude: number };
  venues: VenueConfig[];
};

export type SiteConfig = {
  url: string;
  name: string;
  shortName: string;
  strapline: string;
  description: string;
  headline: string;
  headlineEmphasis: string;
  ticker: string;
  noteTitle: string;
  noteBody: string;
  foundedYear: number;
  city: CityConfig;
};

export type Listing = {
  id: string;
  venueId: string;
  date: string;
  title: string;
  series?: string;
  director?: string;
  year?: number;
  runtime?: number;
  country?: string;
  rating?: string;
  synopsis?: string;
  format?: '16mm' | '35mm' | '70mm' | 'DCP' | 'Digital' | 'Other';
  language?: string;
  subtitles?: string | false;
  showtimes: string[];
  url: string;
  tags?: string[];
};
