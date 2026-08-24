import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const profileName = process.env.CITY_PROFILE || 'seattle';
const profilePath = path.join(root, 'src', 'config', 'cities', `${profileName}.json`);
const outputPath = path.join(root, 'content', 'listings', 'synced.json');
const city = JSON.parse(await readFile(profilePath, 'utf8'));

function clean(value = '') {
  return value.replaceAll('\\n', ' ').replaceAll('\\,', ',').trim();
}

function icsValue(block, property) {
  const match = block.match(new RegExp(`^${property}(?:;[^:]*)?:(.*)$`, 'mi'));
  return clean(match?.[1]);
}

function parseIcsStart(value) {
  const compact = value.replace(/[^0-9TZ]/g, '');
  const datePart = compact.slice(0, 8);
  const date = `${datePart.slice(0, 4)}-${datePart.slice(4, 6)}-${datePart.slice(6, 8)}`;
  if (!compact.includes('T')) return { date, time: 'All day' };
  const timePart = compact.split('T')[1].replace('Z', '');
  const hour24 = Number(timePart.slice(0, 2));
  const minute = timePart.slice(2, 4) || '00';
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour = hour24 % 12 || 12;
  return { date, time: `${hour}:${minute} ${suffix}` };
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function parseIcs(text, venue) {
  const unfolded = text.replace(/\r?\n[ \t]/g, '');
  return unfolded.split('BEGIN:VEVENT').slice(1).map((block) => {
    const title = icsValue(block, 'SUMMARY');
    const start = parseIcsStart(icsValue(block, 'DTSTART'));
    const uid = icsValue(block, 'UID') || `${title}-${start.date}-${start.time}`;
    return {
      id: `${venue.id}-${slug(uid)}`,
      venueId: venue.id,
      date: start.date,
      title,
      showtimes: [start.time],
      url: icsValue(block, 'URL') || venue.calendarUrl,
      tags: [],
    };
  }).filter((event) => event.title && event.date.length === 10);
}

function parseNormalizedJson(payload, venue) {
  const records = Array.isArray(payload) ? payload : payload.events;
  if (!Array.isArray(records)) throw new Error('Normalized JSON feed must be an array or { events: [] }.');
  return records.map((record) => ({ ...record, venueId: venue.id }));
}

function stripHtml(value = '') {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&#39;', "'")
    .replaceAll('&quot;', '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function yearInCity() {
  return Number(new Intl.DateTimeFormat('en-US', {
    timeZone: city.timezone,
    year: 'numeric',
  }).format(new Date()));
}

function calendarDate(value) {
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const beaconMatch = value.match(/,\s*([A-Za-z]+)\s+(\d{1,2})/);
  const veeziMatch = value.match(/^[A-Za-z]+\s+(\d{1,2}),\s*([A-Za-z]+)/);
  const monthName = beaconMatch?.[1] ?? veeziMatch?.[2];
  const day = Number(beaconMatch?.[2] ?? veeziMatch?.[1]);
  const month = monthNames.indexOf(monthName?.toLowerCase());
  if (month < 0 || !day) return '';
  return `${yearInCity()}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function displayTitle(value) {
  if (value !== value.toUpperCase()) return value;
  return value.toLocaleLowerCase().replace(/(^|[\s:–—/-])(\p{L})/gu, (_, lead, letter) => `${lead}${letter.toLocaleUpperCase()}`);
}

function groupedListings(records) {
  const groups = new Map();
  for (const record of records) {
    const key = `${record.venueId}|${record.date}|${record.title}|${record.url}`;
    const existing = groups.get(key);
    if (existing) {
      if (!existing.showtimes.includes(record.showtimes[0])) existing.showtimes.push(record.showtimes[0]);
    } else {
      groups.set(key, record);
    }
  }
  return [...groups.values()];
}

function parseBeaconHtml(html, venue) {
  const records = [];
  const days = html.split(/<div class="cal-list-day"[^>]*>/i).slice(1);
  for (const day of days) {
    const dateLabel = day.match(/<p[^>]*class="cal-list-date"[^>]*>([^<]+)<\/p>/i)?.[1];
    const date = dateLabel ? calendarDate(stripHtml(dateLabel)) : '';
    if (!date) continue;
    const entryPattern = /<a href="([^"]+)" class="cal-list-movie"[^>]*>([^<]+)<\/a>\s*<span class="cal-list-time"[^>]*>([^<]+)<\/span>/gi;
    for (const match of day.matchAll(entryPattern)) {
      const title = stripHtml(match[2]);
      if (!title || title.toLowerCase().includes('rent the beacon')) continue;
      const href = new URL(match[1], venue.website).href;
      records.push({
        id: `${venue.id}-${slug(title)}-${date}`,
        venueId: venue.id,
        date,
        title: displayTitle(title),
        showtimes: [stripHtml(match[3])],
        url: href,
        tags: ['repertory'],
      });
    }
  }
  return groupedListings(records);
}

function parseVeeziHtml(html, venue) {
  const records = [];
  const films = html.split(/<div\s+class="film\s*"/i).slice(1);
  for (const film of films) {
    const title = stripHtml(film.match(/<h3 class="title">([\s\S]*?)<\/h3>/i)?.[1]);
    if (!title) continue;
    const dates = film.split(/<div class="date-container">/i).slice(1);
    for (const dateBlock of dates) {
      const dateLabel = stripHtml(dateBlock.match(/<h4 class="date">([^<]+)<\/h4>/i)?.[1]);
      const date = calendarDate(dateLabel);
      const showtimes = [...dateBlock.matchAll(/<time>([^<]+)<\/time>/gi)].map((match) => stripHtml(match[1]));
      if (!date || !showtimes.length) continue;
      const href = dateBlock.match(/<a href="(https:\/\/ticketing\.useast\.veezi\.com\/purchase\/[^"]+)"/i)?.[1] ?? venue.calendarUrl;
      records.push({
        id: `${venue.id}-${slug(title)}-${date}`,
        venueId: venue.id,
        date,
        title,
        showtimes,
        url: href.replaceAll('&amp;', '&'),
        tags: [],
      });
    }
  }
  return records;
}

function decodeAttribute(value) {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function localDateTime(timestamp) {
  const date = new Date(timestamp);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: city.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: new Intl.DateTimeFormat(city.locale, {
      timeZone: city.timezone,
      hour: 'numeric',
      minute: '2-digit',
    }).format(date),
  };
}

function siffVenueId(name) {
  if (name.startsWith('SIFF Cinema Uptown')) return 'siff-uptown';
  if (name.startsWith('SIFF Film Center')) return 'siff-film-center';
  if (name.startsWith('SIFF Cinema Downtown')) return 'siff-downtown';
  if (name.includes('PACCAR')) return 'siff-paccar-imax';
  if (name.includes('Paramount')) return 'siff-paramount';
  if (name.includes('Central Library')) return 'siff-central-library';
  return '';
}

function parseSiffHtml(html, calendarUrl) {
  const records = [];
  for (const match of html.matchAll(/data-screening="([^"]+)"/g)) {
    const screening = JSON.parse(decodeAttribute(match[1]));
    const timestamp = Number(screening.Showtime?.match(/\d+/)?.[0]);
    const venueId = siffVenueId(screening.VenueName ?? '');
    if (!timestamp || !venueId || !screening.EventName) continue;
    const when = localDateTime(timestamp);
    const declaredFormat = screening.EventName.match(/\((16mm|35mm|70mm)\)/i)?.[1]?.toLowerCase();
    const title = screening.EventName.replace(/\s*\((?:16mm|35mm|70mm)\)\s*$/i, '');
    const format = declaredFormat
      ?? (title.includes('Camp Miasma') ? '35mm' : undefined)
      ?? (title === 'The Odyssey' && venueId === 'siff-downtown' ? '70mm' : undefined);
    records.push({
      id: `${venueId}-${slug(title)}-${when.date}`,
      venueId,
      date: when.date,
      title,
      runtime: screening.LengthInMinutes || undefined,
      format,
      showtimes: [when.time],
      url: calendarUrl,
      tags: format ? ['on-film'] : [],
    });
  }
  return records;
}

async function fetchSiffWeek(source) {
  const pages = await Promise.all(Array.from({ length: 7 }, async (_, day) => {
    const url = `${source.url}?day=${day}`;
    const response = await fetch(url, { headers: { 'user-agent': 'PugetScreen/1.0 (+https://puget.ivison.id.au)' } });
    if (!response.ok) throw new Error(`HTTP ${response.status} for SIFF day ${day}`);
    return parseSiffHtml(await response.text(), url);
  }));
  return groupedListings(pages.flat());
}

const synced = [];
for (const venue of city.venues.filter((item) => item.enabled && item.source.type !== 'manual')) {
  try {
    if (venue.source.type === 'html' && venue.source.adapter === 'siff') {
      synced.push(...await fetchSiffWeek(venue.source));
      console.log('Synced SIFF cinema locations');
      continue;
    }
    const response = await fetch(venue.source.url, { headers: { 'user-agent': 'PugetScreen/1.0 (+https://puget.ivison.id.au)' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (venue.source.type === 'ics') synced.push(...parseIcs(await response.text(), venue));
    if (venue.source.type === 'json') {
      if (venue.source.adapter !== 'normalized') throw new Error(`Unknown JSON adapter: ${venue.source.adapter}`);
      synced.push(...parseNormalizedJson(await response.json(), venue));
    }
    if (venue.source.type === 'html') {
      const html = await response.text();
      if (venue.source.adapter === 'beacon') synced.push(...parseBeaconHtml(html, venue));
      if (venue.source.adapter === 'veezi') synced.push(...parseVeeziHtml(html, venue));
    }
    console.log(`Synced ${venue.name}`);
  } catch (error) {
    console.warn(`Skipped ${venue.name}: ${error.message}`);
  }
}

const unique = [...new Map(synced.map((listing) => [listing.id, listing])).values()]
  .sort((a, b) => `${a.date}${a.showtimes?.[0]}`.localeCompare(`${b.date}${b.showtimes?.[0]}`));
await writeFile(outputPath, `${JSON.stringify(unique, null, 2)}\n`);
console.log(`Wrote ${unique.length} synced listings for ${city.name}.`);
