'use client';

import { useMemo, useState } from 'react';
import type { Listing, SiteConfig } from '../config/types';

const filters = [
  { id: 'all', label: 'All screenings' },
  { id: 'on-film', label: 'On film' },
  { id: 'experimental', label: 'Experimental' },
  { id: 'local', label: 'Local work' },
];

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
  const [filter, setFilter] = useState('all');
  const enabledVenues = config.city.venues.filter((venue) => venue.enabled);
  const dayListings = useMemo(
    () => listings.filter((listing) => listing.date === date && (filter === 'all' || listing.tags?.includes(filter))),
    [date, filter, listings],
  );
  const dateLabel = new Intl.DateTimeFormat(config.city.locale, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));

  return (
    <>
      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">{`${config.name} — ${config.ticker} — ${config.name} — ${config.ticker} — ${config.name} — ${config.ticker} — `.toUpperCase()}</div>
      </div>
      <header className="mobile-head"><strong>{config.name}</strong><span className="eyebrow">{config.city.name}, {config.city.region}</span></header>
      <div className="shell">
        <aside className="left-rail">
          <p className="wordmark">{config.name.split(' ')[0]}<span>{config.name.split(' ').slice(1).join(' ')}</span></p>
          <p className="eyebrow" style={{ marginTop: 24 }}>{config.strapline}</p>
          <p className="rail-copy">{config.description} Updated daily for {config.city.name}.</p>
          <nav className="rail-nav" aria-label="Primary navigation">
            <a href="#listings"><span>Listings</span><span>01</span></a>
            <a href="#venues"><span>Venues</span><span>02</span></a>
            <a href="mailto:hello@ivison.id.au?subject=Puget%20Screen%20listing"><span>Submit</span><span>↗</span></a>
          </nav>
        </aside>
        <main className="main" id="listings">
          <section className="hero">
            <div className="hero-top">
              <div>
                <p className="eyebrow">Daily film listings · {config.city.name}, {config.city.region}</p>
                <h1>{config.headline} <em>{config.headlineEmphasis}</em></h1>
              </div>
              <span className="issue">Edition 001 · Est. {config.foundedYear}</span>
            </div>
          </section>
          <div className="date-row">
            <button className="date-button" aria-label="Previous day" onClick={() => setDate(shiftDate(date, -1))}>←</button>
            <time className="date-title" dateTime={date}>{dateLabel}</time>
            <button className="date-button" aria-label="Next day" onClick={() => setDate(shiftDate(date, 1))}>→</button>
          </div>
          <div className="filters" aria-label="Filter screenings">
            {filters.map((item) => (
              <button key={item.id} className="filter" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>
            ))}
          </div>
          <p className="eyebrow section-label">Screenings</p>
          {enabledVenues.map((venue) => {
            const venueListings = dayListings.filter((listing) => listing.venueId === venue.id);
            if (!venueListings.length) return null;
            return (
              <section className="venue" key={venue.id}>
                <div className="venue-header">
                  <h2>{venue.name}</h2>
                  <a href={venue.calendarUrl} target="_blank" rel="noreferrer">{venue.neighborhood} ↗</a>
                </div>
                <div className="show-grid">
                  {venueListings.map((show) => (
                    <article className="show" key={show.id}>
                      <div className="series">{show.series ?? show.tags?.join(' / ')}</div>
                      <h3><a href={show.url} target="_blank" rel="noreferrer">{show.title}</a></h3>
                      <p className="details">{[show.director, show.year, show.runtime && `${show.runtime} min`].filter(Boolean).join(', ')}</p>
                      <div className="show-footer">
                        <span className="times">{show.showtimes.join(' · ')}</span>
                        {show.format && <span className="format">{show.format}</span>}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
          {!dayListings.length && <p className="empty">Nothing listed for this date yet. Try the next reel →</p>}
        </main>
        <aside className="right-rail" id="venues">
          <section className="notice">
            <p className="eyebrow signal">Tonight&apos;s note</p>
            <h2>{config.noteTitle}</h2>
            <p>{config.noteBody}</p>
          </section>
          <section className="venue-list">
            <h3 className="eyebrow">Included venues</h3>
            {enabledVenues.map((venue) => <a href={venue.website} key={venue.id} target="_blank" rel="noreferrer">{venue.name} ↗</a>)}
          </section>
          <p className="right-bottom">Times change. Follow the ticket link before heading out.<br /><br />Independent film, every screen, one calendar.</p>
        </aside>
      </div>
    </>
  );
}
