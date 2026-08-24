# Puget Screen

An independent-film calendar for Seattle, designed to be moved to another city without rebuilding the interface.

## Change the city

1. Copy `src/config/cities/seattle.json` to a new city profile.
2. Replace the timezone, locale, coordinates, and venue array.
3. Import the new profile in `src/config/site.ts` and update the brand copy there.
4. Set `CITY_PROFILE` in the sync workflow if the filename is no longer `seattle`.

The UI reads the active city profile, so venue names, links, neighborhoods, timezone handling, and the sidebar all change together.

## Add or remove a venue

Each venue lives in the active city JSON file. Its optional `symbol` becomes the small venue emblem throughout the interface. Set `enabled` to `false` to hide it without deleting its configuration. Sources can be:

- `manual` — listings live in `content/listings/manual.json`.
- `ics` — set a public iCalendar URL; the scheduled sync imports it.
- `json` — set a normalized JSON URL and `"adapter": "normalized"`.

Venue-specific websites can later get their own small adapter in `scripts/sync-listings.mjs`. A failed source is skipped so one theater cannot take down the whole calendar.

## Listings format

Listings have a stable ID, venue ID, local `YYYY-MM-DD` date, title, ticket URL, showtimes, and optional director, year, runtime, format, language, subtitles, series, and tags. Set `subtitles` to a language name or `false` for an explicit “no subtitles” badge. Supported interface filters currently use `on-film`, `experimental`, and `local` tags.

## Development

Requires Node 22.13 or newer.

```sh
npm install
npm run dev
```

GitHub Actions rebuilds the static site every six hours and after every push to `main`.
