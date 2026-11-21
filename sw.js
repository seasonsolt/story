/* The offline worker for 冰雪故事小导演. TEMPLATE stamped by art/build_page.py into sw.js. */
/* global self, caches, fetch, URL, Request, Response */
const ASSET_VERSION = "f225d91a937d";
const PAGE_HASH = "af198a667448";
const PRECACHE = [
  "story.html",
  "manifest.webmanifest",
  "game/icon-192.png",
  "game/icon-512.png",
  "game/icon-maskable-512.png",
  "game/apple-touch-icon.png",
  "game/font_zh.woff2?v=f225d91a937d",
  "game/subs.json?v=f225d91a937d",
  "game/anna_cheer.webp?v=f225d91a937d",
  "game/anna_idle.webp?v=f225d91a937d",
  "game/anna_speak.webp?v=f225d91a937d",
  "game/bg_cozy.webp?v=f225d91a937d",
  "game/bg_garden.webp?v=f225d91a937d",
  "game/bg_palace.webp?v=f225d91a937d",
  "game/card_act_castle.webp?v=f225d91a937d",
  "game/card_act_cocoa.webp?v=f225d91a937d",
  "game/card_act_rainbow.webp?v=f225d91a937d",
  "game/card_act_sing.webp?v=f225d91a937d",
  "game/card_aurora_crown.webp?v=f225d91a937d",
  "game/card_bake_oven.webp?v=f225d91a937d",
  "game/card_beanie.webp?v=f225d91a937d",
  "game/card_bunny_hug.webp?v=f225d91a937d",
  "game/card_campfire.webp?v=f225d91a937d",
  "game/card_cloak.webp?v=f225d91a937d",
  "game/card_cookie.webp?v=f225d91a937d",
  "game/card_crystal_show.webp?v=f225d91a937d",
  "game/card_dark_sky.webp?v=f225d91a937d",
  "game/card_feel_brave.webp?v=f225d91a937d",
  "game/card_feel_worried.webp?v=f225d91a937d",
  "game/card_frost_dome.webp?v=f225d91a937d",
  "game/card_gust_blow.webp?v=f225d91a937d",
  "game/card_ice_swan.webp?v=f225d91a937d",
  "game/card_icecream.webp?v=f225d91a937d",
  "game/card_kite.webp?v=f225d91a937d",
  "game/card_lantern.webp?v=f225d91a937d",
  "game/card_loc_castle.webp?v=f225d91a937d",
  "game/card_loc_garden.webp?v=f225d91a937d",
  "game/card_loc_hearth.webp?v=f225d91a937d",
  "game/card_magic_wand.webp?v=f225d91a937d",
  "game/card_melting.webp?v=f225d91a937d",
  "game/card_mittens.webp?v=f225d91a937d",
  "game/card_mix_batter.webp?v=f225d91a937d",
  "game/card_mood_happy.webp?v=f225d91a937d",
  "game/card_mood_surprise.webp?v=f225d91a937d",
  "game/card_mood_warm.webp?v=f225d91a937d",
  "game/card_olaf_born.webp?v=f225d91a937d",
  "game/card_party_flag.webp?v=f225d91a937d",
  "game/card_picnic_blanket.webp?v=f225d91a937d",
  "game/card_picnic_feast.webp?v=f225d91a937d",
  "game/card_pin_stones.webp?v=f225d91a937d",
  "game/card_rollball.webp?v=f225d91a937d",
  "game/card_scarf.webp?v=f225d91a937d",
  "game/card_share_cake.webp?v=f225d91a937d",
  "game/card_shell.webp?v=f225d91a937d",
  "game/card_skates.webp?v=f225d91a937d",
  "game/card_sky_lanterns.webp?v=f225d91a937d",
  "game/card_snow_bunny.webp?v=f225d91a937d",
  "game/card_snowfall.webp?v=f225d91a937d",
  "game/card_star_footprints.webp?v=f225d91a937d",
  "game/card_strawberry.webp?v=f225d91a937d",
  "game/card_sunhat.webp?v=f225d91a937d",
  "game/card_topic_bedtime.webp?v=f225d91a937d",
  "game/card_topic_food.webp?v=f225d91a937d",
  "game/card_topic_oops.webp?v=f225d91a937d",
  "game/card_topic_play.webp?v=f225d91a937d",
  "game/card_umbrella.webp?v=f225d91a937d",
  "game/card_warm_sun.webp?v=f225d91a937d",
  "game/card_wind_snow.webp?v=f225d91a937d",
  "game/elsa_cheer.webp?v=f225d91a937d",
  "game/elsa_idle.webp?v=f225d91a937d",
  "game/elsa_speak.webp?v=f225d91a937d",
  "game/key.webp?v=f225d91a937d",
  "game/olaf_cheer.webp?v=f225d91a937d",
  "game/olaf_idle.webp?v=f225d91a937d",
  "game/olaf_speak.webp?v=f225d91a937d",
  "game/portrait_anna.webp?v=f225d91a937d",
  "game/portrait_elsa.webp?v=f225d91a937d",
  "game/portrait_olaf.webp?v=f225d91a937d",
  "game/prop_mic.webp?v=f225d91a937d",
  "game/prop_star.webp?v=f225d91a937d"
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
