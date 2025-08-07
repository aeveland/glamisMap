// Error overlay
(function(){
  const box = document.getElementById('err');
  function show(msg){ if(!box) return; box.hidden = false; box.textContent += msg + '\n'; }
  window.onerror = function(m, s, l){ show('[error] ' + m + ' @' + s + ':' + l); };
  window.onunhandledrejection = function(ev){ show('[promise] ' + (ev.reason && ev.reason.message ? ev.reason.message : String(ev.reason))); };
})();

mapboxgl.accessToken = 'pk.eyJ1IjoiYWV2ZWxhbmQiLCJhIjoiY2o4b3IzeGF5MDcyZzMzcnNqcTR5bXd4OCJ9.5FnPH3C-4gGgjSLaluFA8Q';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/satellite-streets-v12',
  center: [-115.0, 33.0],
  zoom: 11
});

const POPUP_IMAGES = {
  "china-wall": ["popupImages/IMG_3065.jpeg"]
};

function slugifyName(n){
  return String(n || "").toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
}

const HOME_STATE = { center: [-115.0, 33.0], zoom: 11, bearing: 0, pitch: 0 };

map.on('load', async () => {
  try {
    const fc = await loadGpxAsGeoJSON('data/POI.gpx');
    map.addSource('glamis-poi', { type: 'geojson', data: fc });

    map.addLayer({
      id: 'poi-circles',
      type: 'circle',
      source: 'glamis-poi',
      paint: {
        'circle-radius': ['case', ['boolean', ['feature-state', 'selected'], false], 7, 5],
        'circle-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#ff6a00', '#ffffff'],
        'circle-stroke-color': '#222',
        'circle-stroke-width': 1,
        'circle-opacity': 1,
        'circle-stroke-opacity': 1
      }
    });

    map.addLayer({
      id: 'poi-pins',
      type: 'symbol',
      source: 'glamis-poi',
      layout: {
        'icon-image': 'pin-default',
        'icon-allow-overlap': true,
        'icon-anchor': 'bottom',
        'icon-size': 0.9,
        'text-field': ['coalesce', ['get', 'name'], ''],
        'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
        'text-offset': [0, 1.2],
        'text-size': 12,
        'text-anchor': 'top',
        'text-optional': true
      },
      paint: {
        'text-halo-color': '#000',
        'text-halo-width': 0.8,
        'text-color': '#fff'
      }
    });

    if (map.getLayer('poi-circles') && map.getLayer('poi-pins')) {
      try { map.moveLayer('poi-circles', 'poi-pins'); } catch(e) {}
    }

    map.on('click', 'poi-pins', onPoiClick);
    map.on('click', 'poi-circles', onPoiClick);
    map.on('mouseenter', 'poi-pins', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'poi-pins', () => map.getCanvas().style.cursor = '');
    map.on('mouseenter', 'poi-circles', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'poi-circles', () => map.getCanvas().style.cursor = '');

    addIcon('pin-default', 'images/default.png');
    addIcon('pin-selected', 'images/selected.png');
  } catch (e) {
    const box = document.getElementById('err'); if (box) { box.hidden = false; box.textContent += '[load] ' + e.message + '\n'; }
  }
});

let iconsReady = 0;
function addIcon(name, url) {
  map.loadImage(url, (err, img) => {
    if (err || !img) { const box = document.getElementById('err'); if (box) { box.hidden = false; box.textContent += '[icon] ' + name + ' ' + url + ' failed\n'; } return; }
    if (!map.hasImage(name)) map.addImage(name, img, { sdf: false });
    iconsReady++;
    if (iconsReady >= 2 && map.getLayer('poi-circles')) {
      map.setPaintProperty('poi-circles', 'circle-opacity', 0);
      map.setPaintProperty('poi-circles', 'circle-stroke-opacity', 0);
    }
  });
}

function onPoiClick(e) {
  const f = e.features && e.features[0];
  if (!f) return;
  const coords = f.geometry.coordinates.slice();
  const props = f.properties || {};
  const name = props.name || 'Unnamed';
  const desc = props.desc || '';
  const ele = props.ele ? `${props.ele} ft above sea level` : '';

  const imgs = (POPUP_IMAGES[slugifyName(name)] || []).map(src => `<img src="${src}" alt="">`).join('');
  const imagesBlock = imgs ? `<div class="image-grid">${imgs}</div>` : '';
  const elevBlock = ele ? `<div class="section-title">Elevation</div><div>${escapeHtml(ele)}</div>` : '';
  const descBlock = desc ? `<div class="section-title">Description</div><div>${escapeHtml(desc)}</div>` : '';

  const html = `
    <div class="glass-popup">
      <div class="glass-header">
        <div class="glass-title">${escapeHtml(name)}</div>
        <button class="glass-close-button" aria-label="Close" onclick="this.closest('.mapboxgl-popup').remove()">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      ${imagesBlock}
      <div class="glass-body">
        ${elevBlock}
        ${descBlock || '<div class="section-title">Description</div><div>No description available.</div>'}
      </div>
    </div>`;

  new mapboxgl.Popup({ offset: 25, closeButton: false, closeOnClick: true }).setLngLat(coords).setHTML(html).addTo(map);
}

function escapeHtml(str) { return String(str).replace(/[&<>"']/g, s => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[s])); }

async function loadGpxAsGeoJSON(url) {
  const text = await fetch(url).then(r => r.text());
  const xml = new DOMParser().parseFromString(text, 'application/xml');
  const wpts = Array.from(xml.getElementsByTagName('wpt'));
  const features = wpts.map((wpt, i) => {
    const lat = parseFloat(wpt.getAttribute('lat'));
    const lon = parseFloat(wpt.getAttribute('lon'));
    const name = (wpt.getElementsByTagName('name')[0] || {}).textContent || '';
    const desc = (wpt.getElementsByTagName('desc')[0] || {}).textContent || '';
    const ele = (wpt.getElementsByTagName('ele')[0] || {}).textContent || '';
    return { type: 'Feature', id: i, properties: { name, desc, ele }, geometry: { type: 'Point', coordinates: [lon, lat] } };
  });
  return { type: 'FeatureCollection', features };
}

// Tools
const elViewPad = document.getElementById('view-pad');
const elToggle3D = document.getElementById('toggle-3d');

document.getElementById('zoom-in').addEventListener('click', () => map.zoomIn());
document.getElementById('zoom-out').addEventListener('click', () => map.zoomOut());
document.getElementById('recenter').addEventListener('click', () => map.easeTo({ center: HOME_STATE.center, zoom: HOME_STATE.zoom, bearing: 0, pitch: 0, duration: 800 }));

let is3D = false;
function ensureTerrain() {
  if (!map.getSource('mapbox-dem')) {
    map.addSource('mapbox-dem', { type: 'raster-dem', url: 'mapbox://mapbox.mapbox-terrain-dem-v1', tileSize: 512, maxzoom: 14 });
  }
  if (!map.getLayer('sky')) {
    map.addLayer({ id: 'sky', type: 'sky', paint: { 'sky-type': 'atmosphere', 'sky-atmosphere-sun': [0.0, 0.0], 'sky-atmosphere-sun-intensity': 15 } });
  }
}

elToggle3D.addEventListener('click', () => {
  if (!is3D) {
    ensureTerrain();
    map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
    map.easeTo({ pitch: 60, bearing: map.getBearing() + 20, duration: 800 });
    is3D = true;
    elToggle3D.querySelector('.material-symbols-outlined').textContent = 'crop_square';
    elViewPad.hidden = false;
  } else {
    map.setTerrain(null);
    if (map.getLayer('sky')) map.removeLayer('sky');
    map.easeTo({ pitch: 0, duration: 600 });
    is3D = false;
    elToggle3D.querySelector('.material-symbols-outlined').textContent = '3d_rotation';
    elViewPad.hidden = true;
  }
});

const ROT_STEP = 10, TILT_STEP = 8;
document.getElementById('rotate-left').addEventListener('click', () => map.easeTo({ bearing: map.getBearing() - ROT_STEP, duration: 250 }));
document.getElementById('rotate-right').addEventListener('click', () => map.easeTo({ bearing: map.getBearing() + ROT_STEP, duration: 250 }));
document.getElementById('tilt-up').addEventListener('click', () => map.easeTo({ pitch: Math.min(85, map.getPitch() + TILT_STEP), duration: 250 }));
document.getElementById('tilt-down').addEventListener('click', () => map.easeTo({ pitch: Math.max(0, map.getPitch() - TILT_STEP), duration: 250 }));
document.getElementById('reset-north').addEventListener('click', () => map.easeTo({ bearing: 0, duration: 300 }));
