'use client';

import { useMemo, useState } from 'react';
import type { Listing, SiteConfig } from '../config/types';

function isoDate(date: Date) { return date.toISOString().slice(0, 10); }

function shiftDate(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return isoDate(date);
}

function todayIn(timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone,
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function VenueMark({ symbol }: { symbol?: string }) {
  return <span className="venue-mark" aria-hidden="true">{symbol ?? '•'}</span>;
}

function FormatMark({ format }: { format: NonNullable<Listing['format']> }) {
  const labels: Record<NonNullable<Listing['format']>, string> = {
    '16mm': '16',
    '35mm': '35',
    '70mm': '70',
    DCP: 'DCP',
    Digital: 'DIG',
    Other: '•',
  };

  return (
    <span className="format-mark" aria-label={`Presented in ${format}`} title={`Presented in ${format}`}>
      {labels[format]}
    </span>
  );
}

function languageCode(language: string) {
  const codes: Record<string, string> = {
    Arabic: 'AR',
    Cantonese: 'ZH',
    English: 'EN',
    French: 'FR',
    Japanese: 'JA',
    Korean: 'KO',
    Mandarin: 'ZH',
    Spanish: 'ES',
    Various: 'VAR',
  };

  return language
    .split(/\s*(?:,|&|\/)\s*/)
    .map((part) => codes[part] ?? part.slice(0, 3).toUpperCase())
    .join('/');
}

function LanguageMarks({ language, subtitles }: Pick<Listing, 'language' | 'subtitles'>) {
  if (!language && subtitles === undefined) return null;

  return (
    <span className="language-marks">
      {language && (
        <span className="language-mark" aria-label={`Language: ${language}`} title={`Language: ${language}`}>
          {languageCode(language)}
        </span>
      )}
      {subtitles !== undefined && (
        <span
          className={`subtitle-mark${subtitles === false ? ' no-subs' : ''}`}
          aria-label={subtitles === false ? 'No subtitles' : `${subtitles} subtitles`}
          title={subtitles === false ? 'No subtitles' : `${subtitles} subtitles`}
        >
          {subtitles === false ? 'NO SUB' : `SUB ${languageCode(subtitles)}`}
        </span>
      )}
    </span>
  );
}

export function ListingsApp({ config, listings }: { config: SiteConfig; listings: Listing[] }) {
  const [date, setDate] = useState(() => todayIn(config.city.timezone));
  const [onFilmOnly, setOnFilmOnly] = useState(false);
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const enabledVenues = config.city.venues.filter((venue) => venue.enabled);
  const visibleListings = useMemo(
    () => listings.filter((listing) => {
      const matchesDate = upcomingOnly ? listing.date > date : listing.date === date;
      const isOnFilm = listing.tags?.includes('on-film') || ['16mm', '35mm', '70mm'].includes(listing.format ?? '');
      return matchesDate && (!onFilmOnly || isOnFilm);
    }),
    [date, listings, onFilmOnly, upcomingOnly],
  );
  const dateLabel = new Intl.DateTimeFormat(config.city.locale, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));

  return (
    <>
      <header className="mobile-head">
        <strong>{config.name}</strong>
        <span>{config.city.name}</span>
      </header>

      <div className="site-frame">
        <aside className="left-column">
          <div className="identity" aria-label={config.name}>
            <span className="monogram" aria-hidden="true"><i>PS</i></span>
            <span className="identity-name">PUGET<br />SCREEN</span>
          </div>
          <p className="identity-strap">{config.strapline}</p>
          <p className="identity-copy">{config.description}</p>
        </aside>

        <main className="listings-column" id="listings">
          <div className="listings-topline">
            <span>Listings:</span>
            <span className="edition">Puget Screen No. 001</span>
          </div>

          <div className="date-control">
            <button aria-label="Previous day" onClick={() => setDate(shiftDate(date, -1))}>◀</button>
            <time dateTime={date}>{dateLabel}</time>
            <button aria-label="Next day" onClick={() => setDate(shiftDate(date, 1))}>▶</button>
          </div>

          <div className="filters" aria-label="Filter screenings">
            <label>
              <input type="checkbox" checked={onFilmOnly} onChange={(event) => setOnFilmOnly(event.target.checked)} />
              <span>On Film</span>
            </label>
            <label>
              <input type="checkbox" checked={upcomingOnly} onChange={(event) => setUpcomingOnly(event.target.checked)} />
              <span>Upcoming</span>
            </label>
          </div>

          <h1 className="screenings-title">Screenings</h1>

          {enabledVenues.map((venue) => {
            const venueListings = visibleListings.filter((listing) => listing.venueId === venue.id);
            if (!venueListings.length) return null;
            return (
              <section className="venue" key={venue.id}>
                <div className="venue-title">
                  <h2>
                    <a href={venue.calendarUrl} target="_blank" rel="noreferrer">
                      <VenueMark symbol={venue.symbol} />
                      <span>{venue.name}</span>
                    </a>
                  </h2>
                  <span>{venue.neighborhood}</span>
                </div>
                <div className="shows">
                  {venueListings.map((show) => (
                    <article className="show" key={show.id}>
                      <p className="series">{show.series ?? show.tags?.join(' / ')}</p>
                      <h3><a href={show.url} target="_blank" rel="noreferrer">{show.title}</a></h3>
                      <div className="film-details">
                        <span>{[show.director, show.year, show.runtime && `${show.runtime}m`].filter(Boolean).join(', ')}</span>
                        <span className="metadata-marks">
                          {show.format && <FormatMark format={show.format} />}
                          <LanguageMarks language={show.language} subtitles={show.subtitles} />
                        </span>
                      </div>
                      {upcomingOnly && (
                        <time className="screening-date" dateTime={show.date}>
                          {new Intl.DateTimeFormat(config.city.locale, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${show.date}T12:00:00Z`))}
                        </time>
                      )}
                      <p className="showtimes">{show.showtimes.join(', ')}</p>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}

          {!visibleListings.length && (
            <div className="empty">
              <strong>No screenings listed yet.</strong>
              <span>Try another date or follow a venue calendar.</span>
            </div>
          )}
        </main>

        <aside className="right-column">
          <section className="events-card">
            <h2>Events</h2>
            <div className="event-doodle" aria-hidden="true">
              <span className="event-copy">SEE SOMETHING<br />STRANGE<br />TONIGHT</span>
              <span className="camera">▰</span>
              <span className="tripod">╱│╲</span>
            </div>
            <p>{config.noteBody}</p>
          </section>

          <section className="venue-index">
            <h2>Venues</h2>
            {enabledVenues.map((venue) => (
              <a href={venue.website} key={venue.id} target="_blank" rel="noreferrer">
                <span className="venue-index-name"><VenueMark symbol={venue.symbol} />{venue.name}</span><span>↗</span>
              </a>
            ))}
          </section>
        </aside>
      </div>
    </>
  );
}
