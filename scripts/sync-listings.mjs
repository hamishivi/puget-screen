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

const synced = [];
for (const venue of city.venues.filter((item) => item.enabled && item.source.type !== 'manual')) {
  try {
    const response = await fetch(venue.source.url, { headers: { 'user-agent': 'PugetScreen/1.0 (+https://puget.ivison.id.au)' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (venue.source.type === 'ics') synced.push(...parseIcs(await response.text(), venue));
    if (venue.source.type === 'json') {
      if (venue.source.adapter !== 'normalized') throw new Error(`Unknown JSON adapter: ${venue.source.adapter}`);
      synced.push(...parseNormalizedJson(await response.json(), venue));
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
