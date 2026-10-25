// Time-of-day scene on the home page: Chennai's day in four quarters, each with
// its own ascii.rest scenes (by @bas3line, MIT), unless it's raining or there's
// a thunderstorm in Chennai right now (from Open-Meteo), which takes over with a
// scene of its own. Scenes in ./scenes/ are this site's own, drawn the same way. One scene is picked at random per visit, never the same one
// twice in a row; clicking shuffles to another from the same set, and the scene
// changes when the quarter or the weather does.
import { mount } from './vendor/ascii-rest/mount.js';

const QUARTERS = [
  { label: 'Night', when: 'tonight', scenes: ['night-coast', 'desert-night', 'aurora-fjord', 'amer-fort', 'gangaur-ghat', 'snow-train', 'volcano-night'] }, // 00–06
  { label: 'Morning', when: 'this morning', scenes: ['alpine-dawn', 'taj-dawn', 'misty-forest', 'jal-mahal', 'jungle-falls'] },                        // 06–12
  { label: 'Afternoon', when: 'this afternoon', scenes: ['deep-reef', 'earthrise', 'ocean-sunset', 'kite-festival'] },                                // 12–18
  { label: 'Evening', when: 'this evening', scenes: ['kyoto-dusk', 'varanasi-ghats', 'marine-drive', 'lantern-lake', 'lake-pichola', 'cloud-sea', 'night-highway'] }, // 18–24
];

// Chennai is sunny and humid most days, so only rain and thunder get scenes,
// one for the day (06–18, about sunrise to sunset) and one for the night.
const WEATHER = {
  rain: { label: 'Rain', day: ['marina-rain'], night: ['tokyo-rain'] },
  storm: { label: 'Thunderstorm', day: ['storm-plains'], night: ['green-storm'] },
};

const TITLES = {
  'night-coast': 'Night Coast', 'desert-night': 'Desert Night', 'aurora-fjord': 'Aurora Fjord',
  'amer-fort': 'Amer Fort', 'gangaur-ghat': 'Gangaur Ghat', 'snow-train': 'Snow Train', 'volcano-night': 'Volcano Night',
  'alpine-dawn': 'Alpine Dawn', 'taj-dawn': 'Taj Dawn', 'misty-forest': 'Misty Forest', 'jal-mahal': 'Jal Mahal', 'jungle-falls': 'Jungle Falls',
  'deep-reef': 'Deep Reef', 'earthrise': 'Earthrise', 'ocean-sunset': 'Ocean Sunset', 'kite-festival': 'Kite Festival',
  'kyoto-dusk': 'Kyoto Dusk', 'varanasi-ghats': 'Varanasi Ghats', 'marine-drive': 'Marine Drive', 'lantern-lake': 'Lantern Lake',
  'lake-pichola': 'Lake Pichola', 'cloud-sea': 'Cloud Sea', 'night-highway': 'Night Highway',
  'tokyo-rain': 'Tokyo Rain', 'marina-rain': 'Marina Lighthouse', 'storm-plains': 'Storm Plains', 'green-storm': 'Green Storm',
};

// This site's own scenes, which link to their source rather than to ascii.rest
const OWN = new Set(['marina-rain']);
const SOURCE_URL = 'https://github.com/k17n/portfolio-2026/blob/main/assets/scenes/';

const KEY = 'karthik-scene';
const WEATHER_KEY = 'karthik-weather';
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=13.08&longitude=80.27&current=weather_code&timezone=Asia%2FKolkata';
const WEATHER_TTL = 15 * 60 * 1000;

const fig = document.querySelector('[data-scene]');
const canvas = fig && fig.querySelector('canvas');
const shuffle = fig && fig.querySelector('.scene-art');
const when = fig && fig.querySelector('[data-scene-when]');
const link = fig && fig.querySelector('[data-scene-link]');
const by = fig && fig.querySelector('[data-scene-by]');

const hourInChennai = () =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));

const quarterNow = () => Math.floor(hourInChennai() / 6);

// WMO weather codes: drizzle, rain and showers are rain; 95–99 are thunderstorms
function weatherFor(code) {
  if (code >= 95) return 'storm';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  return '';
}

function readCache() {
  try {
    const c = JSON.parse(localStorage.getItem(WEATHER_KEY));
    if (c && Date.now() - c.at < WEATHER_TTL) return c;
  } catch (e) {}
  return null;
}

// The weather now, or '' when it's dry or Open-Meteo can't be reached
async function fetchWeather() {
  const cached = readCache();
  if (cached) return cached.weather;
  try {
    const res = await fetch(WEATHER_URL, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    const weather = weatherFor(data.current.weather_code);
    try { localStorage.setItem(WEATHER_KEY, JSON.stringify({ weather, at: Date.now() })); } catch (e) {}
    return weather;
  } catch (e) {
    return '';
  }
}

function pick(scenes, avoid) {
  const options = scenes.length > 1 ? scenes.filter((s) => s !== avoid) : scenes;
  return options[Math.floor(Math.random() * options.length)];
}

let quarter = -1, weather = '', mode = '', current = '', stop = null, token = 0;

const isDay = () => quarter === 1 || quarter === 2;

function scenesNow() {
  if (!weather) return QUARTERS[quarter].scenes;
  return WEATHER[weather][isDay() ? 'day' : 'night'];
}

function caption() {
  const q = QUARTERS[quarter];
  return weather ? `${WEATHER[weather].label} ${q.when} in Chennai` : `${q.label} in Chennai`;
}

async function show(slug) {
  const mine = ++token;
  fig.classList.add('is-changing');
  const own = OWN.has(slug);
  const piece = await import(own ? `./scenes/${slug}.js` : `./vendor/ascii-rest/pieces/${slug}.js`);
  if (mine !== token) return;
  // Let the old frame fade out before swapping, unless the page is just loading
  if (stop) await new Promise((r) => setTimeout(r, 220));
  if (stop) stop();
  stop = mount(canvas, piece);
  current = slug;
  try { localStorage.setItem(KEY, slug); } catch (e) {}
  const text = caption();
  when.textContent = text;
  link.href = own ? `${SOURCE_URL}${slug}.js` : `https://ascii.rest/${slug}/`;
  link.querySelector('.ext-t').textContent = TITLES[slug];
  link.setAttribute('aria-label', `${TITLES[slug]} ${own ? 'source on GitHub' : 'on ascii.rest'} (opens in new tab)`);
  by.hidden = own;
  const single = scenesNow().length < 2;
  fig.classList.toggle('is-single', single);
  shuffle.setAttribute('aria-label', `${TITLES[slug]}, an ascii scene for ${text[0].toLowerCase()}${text.slice(1)}.${single ? '' : ' Show another.'}`);
  requestAnimationFrame(() => fig.classList.remove('is-changing'));
}

// Re-pick only when the set of scenes changes: a new quarter, new weather, or day turning to night
function sync() {
  quarter = quarterNow();
  const next = weather ? `${weather}-${isDay() ? 'day' : 'night'}` : `q${quarter}`;
  if (next === mode) {
    if (current) when.textContent = caption();
    return;
  }
  mode = next;
  let last = '';
  try { last = localStorage.getItem(KEY) || ''; } catch (e) {}
  show(pick(scenesNow(), current || last));
}

async function checkWeather() {
  weather = await fetchWeather();
  sync();
}

if (fig && canvas) {
  // Give the weather a moment so a rainy first visit opens on rain rather than
  // swapping to it; past that, start on the time of day and let rain take over
  const pending = fetchWeather();
  const early = await Promise.race([pending, new Promise((r) => setTimeout(() => r(null), 800))]);
  if (early !== null) weather = early;
  sync();
  if (early === null) pending.then((w) => { weather = w; sync(); });
  setInterval(sync, 60 * 1000);
  setInterval(checkWeather, WEATHER_TTL);
  shuffle.addEventListener('click', () => {
    if (scenesNow().length > 1) show(pick(scenesNow(), current));
  });
}
