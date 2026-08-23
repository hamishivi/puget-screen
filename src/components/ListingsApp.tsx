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
      <div className="anniversary" aria-hidden="true">
        <div className="anniversary-track">{`${config.name} · Moving images around the Sound · ${config.name} · Moving images around the Sound · ${config.name} · Moving images around the Sound · `.toUpperCase()}</div>
      </div>

      <header className="mobile-head">
        <strong>{config.name}</strong>
        <span>{config.city.name}</span>
      </header>

      <div className="site-frame">
        <aside className="left-column">
          <a className="identity" href="#listings" aria-label={`${config.name} home`}>
            <span className="monogram" aria-hidden="true"><i>PS</i></span>
            <span className="identity-name">PUGET<br />SCREEN</span>
          </a>
          <p className="identity-strap">{config.strapline}<br />Est. {config.foundedYear}</p>
          <p className="identity-copy">{config.description}<br />Read more about us.</p>
          <nav className="left-nav" aria-label="Primary navigation">
            <a className="active" href="#listings">Listings</a>
            <a href="#venues">Venues</a>
            <a href="mailto:hello@ivison.id.au?subject=Puget%20Screen%20listing">Submit a Listing</a>
          </nav>
          <div className="left-social">
            <a href="https://www.instagram.com/" target="_blank" rel="noreferrer">Instagram</a>
            <a href="mailto:hello@ivison.id.au">Contact</a>
          </div>
        </aside>

        <main className="listings-column" id="listings">
          <div className="listings-topline">
            <span>Listings:</span>
            <span className="edition">Puget Screen No. 001</span>
          </div>

          <div className="region-tabs" aria-label="Region">
            <button className="selected" type="button">Seattle</button>
            <button type="button" disabled>Puget Sound — soon</button>
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
                  <h2><a href={venue.calendarUrl} target="_blank" rel="noreferrer">{venue.name}</a></h2>
                  <span>{venue.neighborhood}</span>
                </div>
                <div className="shows">
                  {venueListings.map((show) => (
                    <article className="show" key={show.id}>
                      <p className="series">{show.series ?? show.tags?.join(' / ')}</p>
                      <h3><a href={show.url} target="_blank" rel="noreferrer">{show.title}</a></h3>
                      <p className="film-details">{[show.director, show.year, show.runtime && `${show.runtime}m`, show.format].filter(Boolean).join(', ')}</p>
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

        <aside className="right-column" id="venues">
          <nav className="right-nav" aria-label="Secondary navigation">
            <a href="#listings">Search</a>
            <a href="#venues">Venues</a>
            <a href="mailto:hello@ivison.id.au?subject=Puget%20Screen%20listing">Submit</a>
          </nav>

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
                <span>{venue.name}</span><span>↗</span>
              </a>
            ))}
          </section>

          <section className="newsletter">
            <span>Sign up for the Newsletter:</span>
            <a href="mailto:hello@ivison.id.au?subject=Subscribe%20to%20Puget%20Screen">Subscribe</a>
          </section>
        </aside>
      </div>
    </>
  );
}
