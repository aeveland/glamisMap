mapboxgl.accessToken = 'pk.eyJ1IjoiYWV2ZWxhbmQiLCJhIjoiY2o4b3IzeGF5MDcyZzMzcnNqcTR5bXd4OCJ9.5FnPH3C-4gGgjSLaluFA8Q';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/satellite-streets-v12',
  center: [-115.0, 33.0],
  zoom: 11
});

const HOME_STATE = { center: [-115.0, 33.0], zoom: 11, bearing: 0, pitch: 0 };

map.on('load', async () => {
  // Marker images
  await new Promise((resolve, reject) => {
    map.loadImage('images/default.png', (err, img) => {
      if (err) return reject(err);
      if (!map.hasImage('pin-default')) map.addImage('pin-default', img, { sdf: false });
      map.loadImage('images/selected.png', (err2, img2) => {
        if (err2) return reject(err2);
        if (!map.hasImage('pin-selected')) map.addImage('pin-selected', img2, { sdf: false });
        resolve();
      });
    });
  });

  // Load GPX and convert to GeoJSON
  const fc = await loadGpxAsGeoJSON('data/POI.gpx');
  map.addSource('glamis-poi', { type: 'geojson', data: fc, generateId: true });

  
  // Symbol layer for pins with circle fallback
  const iconLayout = {
    'icon-image': ['case', ['boolean', ['feature-state', 'selected'], false], 'pin-selected', 'pin-default'],
    'icon-allow-overlap': true,
    'icon-anchor': 'bottom',
    'icon-size': 0.9,
    'text-field': ['get', 'name'],
    'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
    'text-offset': [0, 1.2],
    'text-anchor': 'top',
    'text-optional': true
  };

  // Add a circle fallback layer first so at worst we still see points
  map.addLayer({
    id: 'poi-circles',
    type: 'circle',
    source: 'glamis-poi',
    paint: {
      'circle-radius': ['case', ['boolean', ['feature-state', 'selected'], false], 6, 4],
      'circle-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#ff6a00', '#ffffff'],
      'circle-stroke-color': '#222',
      'circle-stroke-width': 1
    }
  });

  // Try adding symbol layer with icons; if images missing it will still render circles below
  map.addLayer({
    id: 'poi-pins',
    type: 'symbol',
    source: 'glamis-poi',
    layout: iconLayout,
    paint: {
      'text-halo-color': '#000',
      'text-halo-width': 0.5,
      'text-color': '#fff'
    }
  });
// Click handling for popup
  map.on('click', 'poi-pins', (e) => {
    const f = e.features[0];
    const coords = f.geometry.coordinates.slice();
    selectFeature(f);

    const props = f.properties || {};
    const name = props.name || 'Unnamed';
    const desc = props.desc || '';
    const ele = props.ele ? `${props.ele} ft above sea level` : '';

    const images = buildImageStrip(name);
    const html = `
      <div class="glass-popup">
        <div class="glass-header">
          <div class="glass-title">${escapeHtml(name)}</div>
          <button class="glass-close-button" aria-label="Close" onclick="this.closest('.mapboxgl-popup').remove()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        ${images}
        <div class="glass-body">
          ${ele ? `<div>${escapeHtml(ele)}</div>` : ''}
          ${desc ? `<div>${escapeHtml(desc)}</div>` : '<div>No description available.</div>'}
        </div>
      </div>
    `;

    new mapboxgl.Popup({ offset: 25, closeButton: false, closeOnClick: true })
      .setLngLat(coords)
      .setHTML(html)
      .addTo(map);
  });

  map.on('mouseenter', 'poi-pins', () => map.getCanvas().style.cursor = 'pointer');
  map.on('mouseleave', 'poi-pins', () => map.getCanvas().style.cursor = '');
  map.on('mouseenter', 'poi-circles', () => map.getCanvas().style.cursor = 'pointer');
  map.on('mouseleave', 'poi-circles', () => map.getCanvas().style.cursor = '');
  map.on('mouseenter', 'poi-circles', () => map.getCanvas().style.cursor = 'pointer');
  map.on('mouseleave', 'poi-circles', () => map.getCanvas().style.cursor = '');
});

function selectFeature(f) {
  const sourceId = 'glamis-poi';
  // Reset previous selected state
  const fc = map.getSource(sourceId)._data;
  for (let i = 0; i < fc.features.length; i++) {
    map.setFeatureState({ source: sourceId, id: fc.features[i].id }, { selected: false });
  }
  map.setFeatureState({ source: sourceId, id: f.id }, { selected: true });
}

async function loadGpxAsGeoJSON(url) {
  const text = await fetch(url).then(r => r.text());
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'application/xml');
  const wpts = Array.from(xml.getElementsByTagName('wpt'));
  const features = wpts.map((wpt, i) => {
    const lat = parseFloat(wpt.getAttribute('lat'));
    const lon = parseFloat(wpt.getAttribute('lon'));
    const name = (wpt.getElementsByTagName('name')[0] || {}).textContent || '';
    const desc = (wpt.getElementsByTagName('desc')[0] || {}).textContent || '';
    const ele = (wpt.getElementsByTagName('ele')[0] || {}).textContent || '';
    return {
      type: 'Feature',
      id: i,
      properties: { name, desc, ele },
      geometry: { type: 'Point', coordinates: [lon, lat] }
    };
  });
  return { type: 'FeatureCollection', features };
}

function buildImageStrip(name) {
  // Optional: try to map names to images in popupImages by a simple convention.
  // For now we will not auto-attach unknown images; this returns an empty strip.
  return `<div class="glass-image-strip"></div>`;
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[s]));
}

// -------------- Tools logic --------------
const elViewPad = document.getElementById('view-pad');
const elToggle3D = document.getElementById('toggle-3d');

document.getElementById('zoom-in').addEventListener('click', () => map.zoomIn());
document.getElementById('zoom-out').addEventListener('click', () => map.zoomOut());
document.getElementById('recenter').addEventListener('click', () => {
  map.easeTo({ center: HOME_STATE.center, zoom: HOME_STATE.zoom, bearing: 0, pitch: 0, duration: 800 });
});

let is3D = false;
function ensureTerrain() {
  if (!map.getSource('mapbox-dem')) {
    map.addSource('mapbox-dem', {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 14
    });
  }
  if (!map.getLayer('sky')) {
    map.addLayer({
      id: 'sky',
      type: 'sky',
      paint: {
        'sky-type': 'atmosphere',
        'sky-atmosphere-sun': [0.0, 0.0],
        'sky-atmosphere-sun-intensity': 15
      }
    });
  }
}

elToggle3D.addEventListener('click', () => {
  if (!is3D) {
    ensureTerrain();
    map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
    map.easeTo({ pitch: 60, bearing: map.getBearing() + 20, duration: 800 });
    is3D = true;
    elToggle3D.querySelector('.material-symbols-outlined').textContent = 'crop_square'; // indicates 2D
    elViewPad.hidden = false; elViewPad.style.display = 'flex';
  } else {
    map.setTerrain(null);
    if (map.getLayer('sky')) map.removeLayer('sky');
    map.easeTo({ pitch: 0, duration: 600 });
    is3D = false;
    elToggle3D.querySelector('.material-symbols-outlined').textContent = '3d_rotation';
    elViewPad.hidden = true; elViewPad.style.display = 'none';
  }
});

// View pad
const ROT_STEP = 10;
const TILT_STEP = 8;
document.getElementById('rotate-left').addEventListener('click', () => {
  map.easeTo({ bearing: map.getBearing() - ROT_STEP, duration: 250 });
});
document.getElementById('rotate-right').addEventListener('click', () => {
  map.easeTo({ bearing: map.getBearing() + ROT_STEP, duration: 250 });
});
document.getElementById('tilt-up').addEventListener('click', () => {
  let p = Math.min(85, map.getPitch() + TILT_STEP);
  map.easeTo({ pitch: p, duration: 250 });
});
document.getElementById('tilt-down').addEventListener('click', () => {
  let p = Math.max(0, map.getPitch() - TILT_STEP);
  map.easeTo({ pitch: p, duration: 250 });
});
document.getElementById('reset-north').addEventListener('click', () => {
  map.easeTo({ bearing: 0, duration: 300 });
});


// Ensure view pad is hidden on first paint when 2D
map.on('idle', () => {
  if (!is3D) elViewPad.hidden = true;
});


// Shared click handler
function onPoiClick(e) {
  const f = e.features && e.features[0];
  if (!f) return;
  const coords = f.geometry.coordinates.slice();
  selectFeature(f);

  const props = f.properties || {};
  const name = props.name || 'Unnamed';
  const desc = props.desc || '';
  const ele = props.ele ? `${props.ele} ft above sea level` : '';

  const images = buildImageStrip(name);
  const html = `
    <div class="glass-popup">
      <div class="glass-header">
        <div class="glass-title">${escapeHtml(name)}</div>
        <button class="glass-close-button" aria-label="Close" onclick="this.closest('.mapboxgl-popup').remove()">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      ${images}
      <div class="glass-body">
        ${ele ? `<div>${escapeHtml(ele)}</div>` : ''}
        ${desc ? `<div>${escapeHtml(desc)}</div>` : '<div>No description available.</div>'}
      </div>
    </div>
  `;

  new mapboxgl.Popup({ offset: 25, closeButton: false, closeOnClick: true })
    .setLngLat(coords)
    .setHTML(html)
    .addTo(map);
}
