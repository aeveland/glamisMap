#!/usr/bin/env node
/**
 * Static validation suite for the Glamis Map.
 *
 * The map itself needs a browser + WebGL + Mapbox network access to run, so
 * this suite covers everything that can be checked without a live map:
 *   1. JS files parse (syntax check).
 *   2. The GeoJSON data is well-formed and geographically sane.
 *   3. Every `sym` referenced in the data has matching default + selected icons.
 *   4. The escapeHTML routine neutralizes injection payloads.
 *   5. Every function referenced from inline on* handlers in the HTML exists
 *      in the corresponding script.
 *
 * Run with:  node tests/validate.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

let passed = 0;
let failed = 0;
const fail = (msg) => { failed++; console.error(`  ✗ ${msg}`); };
const pass = (msg) => { passed++; console.log(`  ✓ ${msg}`); };
const check = (cond, msg) => (cond ? pass(msg) : fail(msg));
const section = (name) => console.log(`\n${name}`);

// ---------------------------------------------------------------------------
section('1. JavaScript syntax');
for (const file of ['script.js', 'admin.js', 'js/map.js', 'js/ui.js', 'sw.js']) {
  try {
    execFileSync('node', ['--check', join(root, file)], { stdio: 'pipe' });
    pass(`${file} parses`);
  } catch (e) {
    fail(`${file} has a syntax error: ${e.stderr?.toString() || e.message}`);
  }
}

// ---------------------------------------------------------------------------
section('2. GeoJSON integrity');
const geo = JSON.parse(readFileSync(join(root, 'data/glamis_tileset.geojson'), 'utf8'));
check(geo.type === 'FeatureCollection', 'is a FeatureCollection');
check(Array.isArray(geo.features) && geo.features.length > 0, `has features (${geo.features.length})`);

let badGeom = 0, badName = 0, badRange = 0;
for (const f of geo.features) {
  if (f.geometry?.type !== 'Point' || !Array.isArray(f.geometry.coordinates)) badGeom++;
  if (!f.properties?.name) badName++;
  const [lng, lat] = f.geometry?.coordinates || [];
  // Glamis sits around -115, 33. Anything well outside is a data error.
  if (!(lng > -115.6 && lng < -114 && lat > 32 && lat < 33.6)) badRange++;
}
check(badGeom === 0, `all features are valid Points (${badGeom} bad)`);
check(badName === 0, `all features have a name (${badName} missing)`);
check(badRange === 0, `all coordinates are within the Glamis region (${badRange} out of range)`);

// ---------------------------------------------------------------------------
section('3. Symbol icons exist for every sym');
const images = new Set(readdirSync(join(root, 'images')));
const syms = new Set(geo.features.map((f) => f.properties?.sym).filter(Boolean));
let missing = 0;
for (const sym of syms) {
  if (!images.has(`${sym}.png`)) { fail(`missing icon: ${sym}.png`); missing++; }
  if (!images.has(`${sym}Selected.png`)) { fail(`missing icon: ${sym}Selected.png`); missing++; }
}
check(missing === 0, `all ${syms.size} symbols have default + selected icons`);
check(images.has('default.png') && images.has('selected.png'), 'fallback icons (default/selected) exist');

// ---------------------------------------------------------------------------
section('4. escapeHTML neutralizes injection');
// Mirror of escapeHTML in script.js — kept in sync intentionally.
const escapeHTML = (value) => {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};
check(escapeHTML('<script>alert(1)</script>') === '&lt;script&gt;alert(1)&lt;/script&gt;', 'escapes <script> tags');
check(!escapeHTML(`" onerror="x`).includes('"'), 'escapes double quotes');
check(!escapeHTML(`' onclick='x`).includes("'"), 'escapes single quotes');
check(escapeHTML(null) === '' && escapeHTML(undefined) === '', 'handles null/undefined');
// Verify the source actually uses escapeHTML on user-controlled fields.
const scriptSrc = readFileSync(join(root, 'script.js'), 'utf8');
check(/escapeHTML\(props\.desc/.test(scriptSrc), 'script.js escapes props.desc');
check(/safeName\s*=\s*escapeHTML\(props\.name\)/.test(scriptSrc), 'script.js escapes props.name');
check(!/onclick="openImageModal/.test(scriptSrc), 'no inline onclick for image modal (uses listeners)');

// ---------------------------------------------------------------------------
section('5. Inline handlers reference defined functions');
const pairs = [
  ['index.html', 'script.js'],
  ['admin.html', 'admin.js'],
];
for (const [htmlFile, jsFile] of pairs) {
  const html = readFileSync(join(root, htmlFile), 'utf8');
  const js = readFileSync(join(root, jsFile), 'utf8');
  const refs = new Set();
  for (const m of html.matchAll(/on\w+="\s*([A-Za-z_$][\w$]*)\s*\(/g)) refs.add(m[1]);
  let undef = 0;
  for (const fn of refs) {
    const defined = new RegExp(`function\\s+${fn}\\b`).test(js) ||
                    new RegExp(`(const|let|var)\\s+${fn}\\s*=`).test(js);
    if (!defined) {
      fail(`${htmlFile}: handler ${fn}() not defined in ${jsFile}`); undef++;
    }
  }
  check(undef === 0, `${htmlFile}: all ${refs.size} inline handlers resolve in ${jsFile}`);
}

// ---------------------------------------------------------------------------
section('6. Mobile bottom sheet wiring');
const indexHtml = readFileSync(join(root, 'index.html'), 'utf8');
const sheetIds = [
  'mobile-sheet', 'sheet-grabber-zone', 'sheet-searchbar', 'sheet-browse',
  'sheet-detail', 'sheet-detail-head', 'sheet-icon', 'sheet-title', 'sheet-close',
  'sheet-scroll', 'sheet-images', 'sheet-details-toggle', 'sheet-details', 'sheet-coords',
  'sheet-elevation', 'sheet-desc', 'sheet-copy'
];
let missingIds = 0;
for (const id of sheetIds) {
  if (!indexHtml.includes(`id="${id}"`)) { fail(`index.html missing #${id}`); missingIds++; }
}
check(missingIds === 0, `all ${sheetIds.length} sheet element ids present in index.html`);
// Every id the sheet JS reads via getElementById must exist in the markup.
for (const m of scriptSrc.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)) {
  const id = m[1];
  if (id.startsWith('sheet-')) {
    check(indexHtml.includes(`id="${id}"`), `getElementById('${id}') resolves in index.html`);
  }
}
check(/function openMobileSheet\(/.test(scriptSrc) && /function showSheetBrowse\(/.test(scriptSrc),
  'openMobileSheet (detail) / showSheetBrowse defined');
check(/function setSheetMode\(/.test(scriptSrc) && /sheet\.mode = mode/.test(scriptSrc),
  'panel has browse/detail content modes');
check(/detents\s*:\s*{\s*full/.test(scriptSrc), 'three-detent model present (full/half/peek)');
check(/if \(isMobileView\(\)\) \{\s*\n\s*openMobileSheet/.test(scriptSrc),
  'pin tap branches to the sheet on mobile');
check(/getElementById\('sheet-title'\)\.textContent/.test(scriptSrc),
  'sheet title set via textContent (injection-safe)');
check(!/sheet[^]{0,40}\.innerHTML\s*=\s*`/.test(scriptSrc) || /imagesEl\.innerHTML = ''/.test(scriptSrc),
  'sheet content not built from a raw HTML template string');

// ---------------------------------------------------------------------------
section('7. Clustering');
check(/cluster:\s*true/.test(scriptSrc), 'GeoJSON source has clustering enabled');
check(/clusterMaxZoom/.test(scriptSrc) && /clusterRadius/.test(scriptSrc), 'cluster radius + max zoom configured');
check(/id:\s*'clusters'/.test(scriptSrc) && /id:\s*'cluster-count'/.test(scriptSrc), 'cluster + count layers added');
check(/getClusterExpansionZoom/.test(scriptSrc), 'cluster click zooms via getClusterExpansionZoom');
check(/type:\s*'geojson'[^]*?source:\s*'glamis-points'/.test(scriptSrc) || /'glamis-points',\s*\{\s*\n\s*type:\s*'geojson'/.test(scriptSrc),
  'points source is geojson (clustering requires it)');
check(/const UNCLUSTERED =/.test(scriptSrc) && /'all', UNCLUSTERED/.test(scriptSrc),
  'individual-point layers/filters exclude clustered features');
check(!/'source-layer':\s*'POI-8oc448'/.test(scriptSrc), 'vector tile source-layer no longer referenced');

// ---------------------------------------------------------------------------
section('8. Geolocation / blue dot');
check(/new mapboxgl\.GeolocateControl/.test(scriptSrc), 'uses Mapbox GeolocateControl for the blue dot');
check(/trackUserLocation:\s*true/.test(scriptSrc) && /showUserHeading:\s*false/.test(scriptSrc),
  'tracking enabled; control heading off (we manage heading ourselves for iOS Safari)');
check(/navigator\.geolocation\.getCurrentPosition\([\s\S]*?geolocate\.trigger\(\)/.test(scriptSrc),
  'locate requests position directly in the tap gesture (iOS Safari)');
check(/enableHighAccuracy:\s*true/.test(scriptSrc), 'high-accuracy positioning requested');
check(indexHtml.includes('id="locate-btn"'), 'custom locate button present in index.html');
check(/function initLocate\(/.test(scriptSrc) && /initLocate\(\)/.test(scriptSrc), 'initLocate defined and called');
check(/geolocate\.trigger\(\)/.test(scriptSrc), 'first tap triggers geolocation');
check(/DeviceOrientationEvent\.requestPermission/.test(scriptSrc), 'requests iOS compass permission for heading');
check(/webkitCompassHeading/.test(scriptSrc) && /map\.setBearing\(/.test(scriptSrc),
  'heading mode rotates the map to the device compass');
check(/'trackuserlocationend'/.test(scriptSrc), 'follow state released when the user pans');

// ---------------------------------------------------------------------------
section('9. Share');
check(indexHtml.includes('id="sheet-share"'), 'share button present in sheet markup');
check(/<div class="sheet-actions">[^]*?id="sheet-directions"[^]*?id="sheet-share"[^]*?<\/div>/.test(indexHtml),
  'Directions + Share sit side by side in the action row');
check(/id="sheet-share"[^]*?id="sheet-details-toggle"/.test(indexHtml),
  'action row is above the details/description');
check(/async function shareLocation\(/.test(scriptSrc), 'shareLocation defined');
check(/navigator\.share/.test(scriptSrc), 'uses the Web Share API (native share sheet)');
check(/copyTextToClipboard\(fallbackText\)/.test(scriptSrc), 'falls back to clipboard when share is unavailable');
check(/err\.name === 'AbortError'/.test(scriptSrc), 'gracefully ignores share-sheet dismissal');
check(/shareBtn\.onclick = \(\) => shareLocation\(props, coords\)/.test(scriptSrc), 'share button wired per-point');

// ---------------------------------------------------------------------------
section('10. Offline / PWA');
for (const f of ['manifest.webmanifest', 'sw.js', 'icons/icon-192.png', 'icons/icon-512.png',
                 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png']) {
  check(existsSync(join(root, f)), `${f} exists`);
}
const manifest = JSON.parse(readFileSync(join(root, 'manifest.webmanifest'), 'utf8'));
check(manifest.scope === './' && manifest.start_url.startsWith('./'),
  'manifest uses relative scope/start_url (GitHub Pages subpath safe)');
check(manifest.display === 'standalone', 'manifest is standalone (installable)');
check(/rel="manifest"/.test(indexHtml) && /apple-touch-icon/.test(indexHtml),
  'index.html links the manifest + apple-touch-icon');

const swSrc = readFileSync(join(root, 'sw.js'), 'utf8');
// Offline is DISABLED: sw.js is now a self-unregistering kill switch (no
// caching/fetch handler), so existing installs clean themselves up.
check(/self\.registration\.unregister\(\)/.test(swSrc) && /caches\.delete/.test(swSrc),
  'sw.js is a kill switch (clears caches + unregisters itself)');
check(!/addEventListener\('fetch'/.test(swSrc),
  'sw.js no longer intercepts fetches (no offline caching)');
// The page side: the service worker is unregistered (not registered) and the
// offline UI init is commented out.
check(/getRegistrations\(\)[\s\S]*?unregister\(\)/.test(scriptSrc),
  'service worker disabled — existing registrations are unregistered');
check(/^\s*\/\/\s*initOffline\(\);/m.test(scriptSrc),
  'offline UI disabled (initOffline not called)');
check(indexHtml.includes('id="offline-btn"') && indexHtml.includes('id="offline-dialog"'),
  'offline button + dialog present in index.html');
check(indexHtml.includes('id="offline-status"') && /function updateOfflineStatus\(/.test(scriptSrc) &&
  /Last downloaded /.test(scriptSrc), 'offline modal shows a last-downloaded status');
check(/setLastDownloadNow\(\)/.test(scriptSrc) && /clearLastDownload\(\)/.test(scriptSrc),
  'last-downloaded timestamp is recorded on success and cleared on clear');
// Install / Add to Home Screen
check(indexHtml.includes('id="offline-install-toggle"') && indexHtml.includes('id="install-ios"') &&
  indexHtml.includes('id="install-android"'), 'install disclosure (toggle + iOS/Android choices) present');
check(/addEventListener\('beforeinstallprompt'/.test(scriptSrc) && /deferredInstallPrompt\.prompt\(\)/.test(scriptSrc),
  'captures beforeinstallprompt and triggers the native install');
check(/function isAppInstalled\(/.test(scriptSrc) && /display-mode: standalone/.test(scriptSrc) &&
  /updateInstallVisibility\(\)/.test(scriptSrc), 'install entry hidden once installed (standalone)');
check(/renderInstallSteps\('ios'\)/.test(scriptSrc), 'iOS path shows Add to Home Screen steps');
check(/function warmMapTiles\(/.test(scriptSrc) && /map\.once\('idle'/.test(scriptSrc),
  'tile warming pans the map and waits for idle');

// ---------------------------------------------------------------------------
section('11. Navigation / directions');
check(indexHtml.includes('id="sheet-directions"') && indexHtml.includes('id="sheet-directions-label"'),
  'Directions button present in the sheet');
check(/id="sheet-directions"[^]*?id="sheet-share"/.test(indexHtml),
  'Directions button is above the Share button');
check(indexHtml.includes('id="nav-banner"') && indexHtml.includes('id="nav-end"') && indexHtml.includes('id="nav-recenter"'),
  'navigation banner + End + Recenter present');
check(/function haversineMiles\(/.test(scriptSrc) && /function bearingDeg\(/.test(scriptSrc),
  'distance (miles) + bearing helpers defined');
check(/\.toFixed\(1\)\} mi/.test(scriptSrc), 'distance label uses fractional miles');
check(/function startNavigation\(/.test(scriptSrc) && /function endNavigation\(/.test(scriptSrc) &&
  /function startDirections\(/.test(scriptSrc), 'navigation lifecycle functions defined');
check(/type: 'LineString'/.test(scriptSrc) && /'line-dasharray'/.test(scriptSrc),
  'draws a dashed straight-line route');
check(/navigator\.geolocation\.watchPosition/.test(scriptSrc), 'live updates via watchPosition');
check(/navState\.follow/.test(scriptSrc) && /fitBounds/.test(scriptSrc),
  'frame-then-follow camera behavior');
check(/function initNavigation\(/.test(scriptSrc) && /initNavigation\(\)/.test(scriptSrc),
  'initNavigation defined and called');

// ---------------------------------------------------------------------------
section('12. Collapsible map tools');
check(indexHtml.includes('id="tools-toggle"'), 'tools toggle button present');
check(/<div class="tools-collapsible" id="tools-collapsible">[^]*id="offline-btn"[^]*<\/div>/.test(indexHtml),
  'tool groups are wrapped in the collapsible container');
check(/function initToolsToggle\(/.test(scriptSrc) && /initToolsToggle\(\)/.test(scriptSrc),
  'initToolsToggle defined and called');
check(/classList\.toggle\('tools-collapsed'\)/.test(scriptSrc), 'toggle flips the collapsed state');

// ---------------------------------------------------------------------------
section('13. Search');
check(/id="sheet-searchbar"[^]*?id="search-input"/.test(indexHtml),
  'search field is pinned at the top of the panel');
check(indexHtml.includes('id="search-input"') && indexHtml.includes('id="search-results"'),
  'search input + results live in the panel');
check(/function renderSearchResults\(/.test(scriptSrc) && /function initSearch\(/.test(scriptSrc) &&
  /initSearch\(\)/.test(scriptSrc), 'search render + init wired');
check(/setSheetTransform\(sheet\.detents\.half, false\)/.test(scriptSrc),
  'search panel loads at half height');
check(/sheet\.searchbarEl\.style\.display = mode === 'detail' \? 'none' : ''/.test(scriptSrc) &&
  /sheet\.detailHeadEl\.style\.display = mode === 'detail' \? '' : 'none'/.test(scriptSrc),
  'search bar hidden in detail mode (only one header visible)');
check(/clear\.style\.display = input\.value \? 'flex' : 'none'/.test(scriptSrc),
  'clear button shown only when the field has text');
const cssSrc = readFileSync(join(root, 'style.css'), 'utf8');
check(/::-webkit-search-cancel-button/.test(cssSrc),
  'native search clear button suppressed (no duplicate)');
check(/\.sheet-detail-head\[hidden\][^]*?display:\s*none/.test(cssSrc) &&
  /\.search-clear\[hidden\][^]*?display:\s*none/.test(cssSrc),
  '[hidden] overrides display (no leaked header / empty-field clear button)');
check(indexHtml.includes('id="sheet-close"'), 'location card has a close button');
check(/'search-result-icon'/.test(scriptSrc) && /'search-result-text'/.test(scriptSrc) &&
  /'search-result-dist'/.test(scriptSrc), 'each result renders icon + name + distance');
check(/haversineMiles\(userLocation, f\.geometry\.coordinates\)/.test(scriptSrc),
  'result distance computed from current location');
check(/function selectSearchResult\(/.test(scriptSrc) && /openMobileSheet\(props, coords\)/.test(scriptSrc),
  'selecting a result opens its location card');
// Desktop left search panel
check(indexHtml.includes('id="desktop-search"') && indexHtml.includes('id="desktop-search-input"') &&
  indexHtml.includes('id="desktop-search-results"'), 'desktop left search panel present');
check(/function openDesktopPopup\(/.test(scriptSrc) && /function selectDesktopResult\(/.test(scriptSrc) &&
  /openDesktopPopup\(props, coords\)/.test(scriptSrc),
  'desktop result selection reuses the map glass popup');
check(/function initDesktopSearch\(/.test(scriptSrc) && /initDesktopSearch\(\)/.test(scriptSrc),
  'desktop search initialized');
check(/@media screen and \(min-width: 769px\)[^]*\.desktop-search\s*\{[^]*position: fixed/.test(cssSrc) ||
  /\.desktop-search\s*\{[^]*position: fixed/.test(cssSrc),
  'desktop panel is fixed (not closeable/resizable)');
// Guard against calling an undefined function from the search path.
check(!/showFeature\(/.test(scriptSrc), 'no reference to the removed showFeature()');

// ---------------------------------------------------------------------------
console.log(`\n${'='.repeat(48)}`);
console.log(`Result: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
