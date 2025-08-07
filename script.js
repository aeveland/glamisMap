mapboxgl.accessToken = 'pk.eyJ1IjoiYWV2ZWxhbmQiLCJhIjoiY2o4b3IzeGF5MDcyZzMzcnNqcTR5bXd4OCJ9.5FnPH3C-4gGgjSLaluFA8Q';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/satellite-streets-v12',
  center: [-115.0, 33.0],
  zoom: 11
});

const popup = new mapboxgl.Popup({
  offset: 25,
  anchor: 'bottom',
  closeButton: false,
  closeOnClick: false
});

map.on('style.load', () => {
  map.addSource('mapbox-dem', {
    type: 'raster-dem',
    url: 'mapbox://mapbox.terrain-rgb'
  });
  map.setTerrain({ source: 'mapbox-dem', exaggeration: 1 });
});

map.on('load', () => {
  map.addSource('glamis-points', {
    type: 'vector',
    url: 'mapbox://aeveland.0agz43gz'
  });

  map.loadImage('./images/default.png', (error, image) => {
    if (error) throw error;
    if (!map.hasImage('custom-pin')) {
      map.addImage('custom-pin', image);
    }

    map.addLayer({
      id: 'glamis-points-layer',
      type: 'symbol',
      source: 'glamis-points',
      'source-layer': 'waypoints',
      layout: {
        'icon-image': 'custom-pin',
        'icon-size': 0.7,
        'icon-allow-overlap': true
      }
    });

    map.addLayer({
      id: 'glamis-labels-layer',
      type: 'symbol',
      source: 'glamis-points',
      'source-layer': 'waypoints',
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 12,
        'text-offset': [0, 1.2],
        'text-anchor': 'top',
        'text-allow-overlap': false
      },
      paint: {
        'text-color': '#fff',
        'text-halo-color': '#000',
        'text-halo-width': 1.2
      }
    });

    map.on('click', 'glamis-points-layer', (e) => {
      const coords = e.features[0].geometry.coordinates.slice();
      const props = e.features[0].properties;

      const images = props.images ? props.images.split(',') : [];
      const imageRow = images.map(url => `<img src="${url.trim()}" class="popup-image-thumb" />`).join('');
      const imageHTML = images.length > 0 ? `<div class="popup-image-row">${imageRow}</div>` : '';

      const elevation = map.queryTerrainElevation(coords, { exaggerated: false });
    props.elevation = elevation !== null ? Math.round(elevation * 3.28084) : props.elevation;

    const popupHTML = `
        <div class="glass-popup">
          <div class="glass-close-button" onclick="this.parentElement.parentElement.remove()"><span class="material-symbols-outlined">close</span></div>
          <div class="glass-title">${props.name}</div>
          ${imageHTML}
          <div class="glass-subtitle">Elevation</div>
          <div class="glass-body">${props.elevation || 'Unknown'} ft above sea level</div>
          <div class="glass-subtitle">Description</div>
          <div class="glass-body">${props.desc || 'No description available.'}</div>
        </div>
      `;

      popup.setLngLat(coords).setHTML(popupHTML).addTo(map);
    });
  });
});

// Map tools logic
const HOME_STATE = { center: map.getCenter(), zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() };

document.getElementById('zoom-in').addEventListener('click', () => {
  map.zoomIn();
});
document.getElementById('zoom-out').addEventListener('click', () => {
  map.zoomOut();
});
document.getElementById('recenter').addEventListener('click', () => {
  map.easeTo({ center: HOME_STATE.center, zoom: HOME_STATE.zoom, bearing: HOME_STATE.bearing, pitch: 0, duration: 800 });
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
  // Add sky layer if missing
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

document.getElementById('toggle-3d').addEventListener('click', () => {
  if (!is3D) {
    ensureTerrain();
    map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
    map.easeTo({ pitch: 60, bearing: map.getBearing() + 20, duration: 1000 });
    is3D = true;
    document.getElementById('toggle-3d').textContent = '2D';
  } else {
    map.setTerrain(null);
    // Remove sky if present
    if (map.getLayer('sky')) map.removeLayer('sky');
    map.easeTo({ pitch: 0, duration: 800 });
    is3D = false;
    document.getElementById('toggle-3d').textContent = '3D';
  }
});
\n
// Map tools logic with Material icons and 3D view pad
const HOME_STATE = { center: map.getCenter(), zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() };

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
    elToggle3D.querySelector('.material-symbols-outlined').textContent = 'crop_square'; // visually indicate 2D
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

// 3D view pad handlers
const ROT_STEP = 10; // degrees
const TILT_STEP = 8; // degrees
document.getElementById('rotate-left').addEventListener('click', () => {
  map.easeTo({ bearing: map.getBearing() - ROT_STEP, duration: 300 });
});
document.getElementById('rotate-right').addEventListener('click', () => {
  map.easeTo({ bearing: map.getBearing() + ROT_STEP, duration: 300 });
});
document.getElementById('tilt-up').addEventListener('click', () => {
  let p = Math.min(85, map.getPitch() + TILT_STEP);
  map.easeTo({ pitch: p, duration: 300 });
});
document.getElementById('tilt-down').addEventListener('click', () => {
  let p = Math.max(0, map.getPitch() - TILT_STEP);
  map.easeTo({ pitch: p, duration: 300 });
});
document.getElementById('reset-north').addEventListener('click', () => {
  map.easeTo({ bearing: 0, duration: 400 });
});
\n
