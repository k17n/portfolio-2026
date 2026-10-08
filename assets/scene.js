// Time-of-day scene on the home page: Chennai's day in four quarters, each with
// its own ascii.rest scenes (by @bas3line, MIT). One scene is picked at random
// per visit, never the same one twice in a row; clicking shuffles to another
// from the same quarter, and the scene changes when the quarter does.
import { mount } from './vendor/ascii-rest/mount.js';

const QUARTERS = [
  { label: 'Night', scenes: ['night-coast', 'desert-night', 'aurora-fjord'] },               // 00–06
  { label: 'Morning', scenes: ['alpine-dawn', 'taj-dawn', 'misty-forest'] },                 // 06–12
  { label: 'Afternoon', scenes: ['deep-reef', 'earthrise', 'ocean-sunset', 'storm-plains'] }, // 12–18
  { label: 'Evening', scenes: ['kyoto-dusk', 'varanasi-ghats', 'marine-drive'] },            // 18–24
];

const TITLES = {
  'night-coast': 'Night Coast', 'desert-night': 'Desert Night', 'aurora-fjord': 'Aurora Fjord',
  'alpine-dawn': 'Alpine Dawn', 'taj-dawn': 'Taj Dawn', 'misty-forest': 'Misty Forest',
  'deep-reef': 'Deep Reef', 'earthrise': 'Earthrise', 'ocean-sunset': 'Ocean Sunset', 'storm-plains': 'Storm Plains',
  'kyoto-dusk': 'Kyoto Dusk', 'varanasi-ghats': 'Varanasi Ghats', 'marine-drive': 'Marine Drive',
};

const KEY = 'karthik-scene';
const fig = document.querySelector('[data-scene]');
const canvas = fig && fig.querySelector('canvas');
const shuffle = fig && fig.querySelector('.scene-art');
const when = fig && fig.querySelector('[data-scene-when]');
const link = fig && fig.querySelector('[data-scene-link]');

const hourInChennai = () =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));

const quarterNow = () => Math.floor(hourInChennai() / 6);

function pick(scenes, avoid) {
  const options = scenes.length > 1 ? scenes.filter((s) => s !== avoid) : scenes;
  return options[Math.floor(Math.random() * options.length)];
}

let quarter = -1, current = '', stop = null, token = 0;

async function show(slug) {
  const mine = ++token;
  fig.classList.add('is-changing');
  const piece = await import(`./vendor/ascii-rest/pieces/${slug}.js`);
  if (mine !== token) return;
  // Let the old frame fade out before swapping, unless the page is just loading
  if (stop) await new Promise((r) => setTimeout(r, 220));
  if (stop) stop();
  stop = mount(canvas, piece);
  current = slug;
  try { localStorage.setItem(KEY, slug); } catch (e) {}
  when.textContent = `${QUARTERS[quarter].label} in Chennai`;
  link.href = `https://ascii.rest/${slug}/`;
  link.querySelector('.ext-t').textContent = TITLES[slug];
  link.setAttribute('aria-label', `${TITLES[slug]} on ascii.rest (opens in new tab)`);
  shuffle.setAttribute('aria-label', `${TITLES[slug]}, an ascii scene for ${QUARTERS[quarter].label.toLowerCase()} in Chennai. Show another.`);
  requestAnimationFrame(() => fig.classList.remove('is-changing'));
}

function sync() {
  const q = quarterNow();
  if (q === quarter) return;
  quarter = q;
  let last = '';
  try { last = localStorage.getItem(KEY) || ''; } catch (e) {}
  show(pick(QUARTERS[q].scenes, current || last));
}

if (fig && canvas) {
  sync();
  setInterval(sync, 60 * 1000);
  shuffle.addEventListener('click', () => show(pick(QUARTERS[quarter].scenes, current)));
}
