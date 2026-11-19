/* The offline worker for 冰雪故事小导演. TEMPLATE stamped by art/build_page.py into sw.js. */
/* global self, caches, fetch, URL, Request, Response */
const ASSET_VERSION = "d13e9d3edef9";
const PAGE_HASH = "b901c90f6c0c";
const PRECACHE = [
  "story.html",
  "manifest.webmanifest",
  "game/icon-192.png",
  "game/icon-512.png",
  "game/icon-maskable-512.png",
  "game/apple-touch-icon.png",
  "game/font_zh.woff2?v=d13e9d3edef9",
  "game/subs.json?v=d13e9d3edef9",
  "game/anna_cheer.webp?v=d13e9d3edef9",
  "game/anna_idle.webp?v=d13e9d3edef9",
  "game/anna_speak.webp?v=d13e9d3edef9",
  "game/bg_cozy.webp?v=d13e9d3edef9",
  "game/bg_garden.webp?v=d13e9d3edef9",
  "game/bg_palace.webp?v=d13e9d3edef9",
  "game/card_act_castle.webp?v=d13e9d3edef9",
  "game/card_act_cocoa.webp?v=d13e9d3edef9",
  "game/card_act_rainbow.webp?v=d13e9d3edef9",
  "game/card_act_sing.webp?v=d13e9d3edef9",
  "game/card_bake_oven.webp?v=d13e9d3edef9",
  "game/card_beanie.webp?v=d13e9d3edef9",
  "game/card_campfire.webp?v=d13e9d3edef9",
  "game/card_cloak.webp?v=d13e9d3edef9",
  "game/card_cookie.webp?v=d13e9d3edef9",
  "game/card_icecream.webp?v=d13e9d3edef9",
  "game/card_kite.webp?v=d13e9d3edef9",
  "game/card_lantern.webp?v=d13e9d3edef9",
  "game/card_loc_castle.webp?v=d13e9d3edef9",
  "game/card_loc_garden.webp?v=d13e9d3edef9",
  "game/card_loc_hearth.webp?v=d13e9d3edef9",
  "game/card_melting.webp?v=d13e9d3edef9",
  "game/card_mittens.webp?v=d13e9d3edef9",
  "game/card_mix_batter.webp?v=d13e9d3edef9",
  "game/card_mood_happy.webp?v=d13e9d3edef9",
  "game/card_mood_surprise.webp?v=d13e9d3edef9",
  "game/card_mood_warm.webp?v=d13e9d3edef9",
  "game/card_olaf_born.webp?v=d13e9d3edef9",
  "game/card_party_flag.webp?v=d13e9d3edef9",
  "game/card_rollball.webp?v=d13e9d3edef9",
  "game/card_scarf.webp?v=d13e9d3edef9",
  "game/card_share_cake.webp?v=d13e9d3edef9",
  "game/card_shell.webp?v=d13e9d3edef9",
  "game/card_skates.webp?v=d13e9d3edef9",
  "game/card_sky_lanterns.webp?v=d13e9d3edef9",
  "game/card_snowfall.webp?v=d13e9d3edef9",
  "game/card_strawberry.webp?v=d13e9d3edef9",
  "game/card_sunhat.webp?v=d13e9d3edef9",
  "game/card_umbrella.webp?v=d13e9d3edef9",
  "game/card_wind_snow.webp?v=d13e9d3edef9",
  "game/elsa_cheer.webp?v=d13e9d3edef9",
  "game/elsa_idle.webp?v=d13e9d3edef9",
  "game/elsa_speak.webp?v=d13e9d3edef9",
  "game/key.webp?v=d13e9d3edef9",
  "game/olaf_cheer.webp?v=d13e9d3edef9",
  "game/olaf_idle.webp?v=d13e9d3edef9",
  "game/olaf_speak.webp?v=d13e9d3edef9",
  "game/portrait_anna.webp?v=d13e9d3edef9",
  "game/portrait_elsa.webp?v=d13e9d3edef9",
  "game/portrait_olaf.webp?v=d13e9d3edef9",
  "game/prop_mic.webp?v=d13e9d3edef9",
  "game/prop_star.webp?v=d13e9d3edef9"
];
const PAGE = 'story.html';
const CACHE = `story-${ASSET_VERSION}-${PAGE_HASH}`;

const absolute = path => new URL(path, self.registration.scope).href;
const scopePath = new URL(self.registration.scope).pathname;
const known = new Set(PRECACHE.map(absolute));

const unredirected = res => (res.redirected
  ? res.blob().then(body => new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers }))
  : res);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => Promise.all(PRECACHE.map(path => {
    const url = absolute(path);
    return fetch(new Request(url, { cache: 'reload' })).then(res => {
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return Promise.resolve(unredirected(res)).then(plain => cache.put(url, plain));
    });
  }))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('story-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const isPage = url => url.pathname === scopePath || url.pathname === `${scopePath}index.html` || url.pathname === `${scopePath}${PAGE}`;
const isAsset = url => known.has(url.origin + url.pathname + url.search) || url.pathname.startsWith(`${scopePath}game/`);

function fromCacheOrNetwork(request, key) {
  return caches.open(CACHE).then(cache => cache.match(key).then(hit => {
    if (hit) return hit;
    return fetch(request).then(res => {
      if (res.ok && res.status === 200 && res.type === 'basic' && !request.headers.has('range')) cache.put(key, res.clone()).catch(() => {});
      return res;
    });
  }));
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    if (url.searchParams.get('dev') === '1' || !isPage(url)) return;
    event.respondWith(fromCacheOrNetwork(request, absolute(PAGE)));
    return;
  }
  if (isAsset(url)) event.respondWith(fromCacheOrNetwork(request, request.url));
});
