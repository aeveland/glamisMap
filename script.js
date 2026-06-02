mapboxgl.accessToken = 'pk.eyJ1IjoiYWV2ZWxhbmQiLCJhIjoiY2o4b3IzeGF5MDcyZzMzcnNqcTR5bXd4OCJ9.5FnPH3C-4gGgjSLaluFA8Q';

// Debug: Test tileset access
console.log('🔑 Using Mapbox token:', mapboxgl.accessToken.substring(0, 20) + '...');
console.log('🗺️ Tileset ID: aeveland.0agz43gz');

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/satellite-streets-v12',
  center: [-115.08, 32.93],
  zoom: 11,
  maxZoom: 17, // Limit zoom to keep locations tappable at ~300ft scale
  // Mobile-friendly map options
  touchZoomRotate: true,
  touchPitch: false, // Disable pitch on mobile for better UX
  dragRotate: true, // Enable rotation for compass functionality
  keyboard: false // Disable keyboard navigation on mobile
});

// Compass functionality
function updateCompass() {
  const bearing = map.getBearing();
  const compassInner = document.getElementById('compass-inner');
  if (compassInner) {
    compassInner.style.transform = `rotate(${bearing}deg)`;
  }
}

function resetMapNorth() {
  map.easeTo({
    bearing: 0,
    duration: 500
  });
}

// Initialize compass
function initCompass() {
  const compassWidget = document.getElementById('compass-widget');
  if (!compassWidget) return;

  let isDragging = false;
  let startAngle = 0;
  let startBearing = 0;

  // Get angle from center of compass to mouse/touch position
  function getAngle(event, rect) {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const clientX = event.clientX || (event.touches && event.touches[0].clientX);
    const clientY = event.clientY || (event.touches && event.touches[0].clientY);
    
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    
    return Math.atan2(deltaX, -deltaY) * (180 / Math.PI);
  }

  // Mouse events
  compassWidget.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isDragging = true;
    const rect = compassWidget.getBoundingClientRect();
    startAngle = getAngle(e, rect);
    startBearing = map.getBearing();
    document.body.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const rect = compassWidget.getBoundingClientRect();
    const currentAngle = getAngle(e, rect);
    const angleDiff = currentAngle - startAngle;
    const newBearing = startBearing + angleDiff;
    
    map.setBearing(newBearing);
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      document.body.style.cursor = '';
    }
  });

  // Touch events for mobile
  compassWidget.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isDragging = true;
    const rect = compassWidget.getBoundingClientRect();
    startAngle = getAngle(e, rect);
    startBearing = map.getBearing();
  });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const rect = compassWidget.getBoundingClientRect();
    const currentAngle = getAngle(e, rect);
    const angleDiff = currentAngle - startAngle;
    const newBearing = startBearing + angleDiff;
    
    map.setBearing(newBearing);
  });

  document.addEventListener('touchend', () => {
    if (isDragging) {
      isDragging = false;
    }
  });

  // Double-click/tap to reset to north
  let clickCount = 0;
  compassWidget.addEventListener('click', (e) => {
    if (isDragging) return;
    
    clickCount++;
    setTimeout(() => {
      if (clickCount === 2) {
        resetMapNorth();
      }
      clickCount = 0;
    }, 300);
  });
  
  // Update compass on map rotation
  map.on('rotate', updateCompass);
  map.on('load', updateCompass);
}

// Add scale control to bottom left
map.addControl(new mapboxgl.ScaleControl({
  maxWidth: 100,
  unit: 'imperial'
}), 'bottom-left');

// Geolocation: Mapbox's GeolocateControl provides the "blue dot" experience
// (live position dot, accuracy circle, heading beam). We drive it from our own
// glass control button (see initLocate), so its default button is hidden in CSS.
const geolocate = new mapboxgl.GeolocateControl({
  positionOptions: { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
  trackUserLocation: true,
  // We manage device heading ourselves (see startHeadingTracking). Letting the
  // control also manage it triggers an iOS motion-permission prompt that can
  // break the location flow in Safari, so keep it off here.
  showUserHeading: false,
  showAccuracyCircle: true
});
map.addControl(geolocate);

// Responsive popup configuration
const popup = new mapboxgl.Popup({
  offset: {
    'top': [0, 0],
    'top-left': [0, 0],
    'top-right': [0, 0],
    'bottom': [0, -45],
    'bottom-left': [0, -45],
    'bottom-right': [0, -45],
    'left': [25, 0],
    'right': [-25, 0]
  },
  anchor: 'bottom',
  closeButton: false,
  closeOnClick: false,
  maxWidth: 'none' // Allow CSS to control width
});

map.on('style.load', () => {
  map.addSource('mapbox-dem', {
    type: 'raster-dem',
    url: 'mapbox://mapbox.terrain-rgb'
  });
  map.setTerrain({ source: 'mapbox-dem', exaggeration: 1 });
});

// Escape a value for safe insertion into HTML. Point names/descriptions come
// from editable tileset data, so they must never be injected raw.
function escapeHTML(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Track selected pin
let selectedPinId = null;

// Cache of unique symbol names and the parsed GeoJSON so we don't refetch the
// data every time the basemap (style) changes. The GeoJSON also feeds the
// clustered source in addPointsLayers().
let cachedSymbols = null;
let cachedGeoJSON = null;

// Load a single image with a graceful fallback. mapboxgl.Map.loadImage's
// callback signature is (error, image). The image is registered under imageId.
function loadImageWithFallback(file, fallbackFile, imageId) {
  return new Promise((resolve) => {
    map.loadImage(`./images/${file}.png`, (error, image) => {
      if (error || !image) {
        console.warn(`Could not load ${file}.png, using ${fallbackFile}.png`);
        map.loadImage(`./images/${fallbackFile}.png`, (fbError, fbImage) => {
          if (!fbError && fbImage && !map.hasImage(imageId)) {
            map.addImage(imageId, fbImage);
          }
          resolve();
        });
      } else {
        if (!map.hasImage(imageId)) {
          map.addImage(imageId, image);
        }
        resolve();
      }
    });
  });
}

// Ensure every symbol icon (default + selected variants) is registered on the
// current style. Map images are cleared whenever setStyle() runs, so this must
// be re-run on every 'style.load', not just the initial 'load'.
function loadSymbolImages() {
  const ensureSymbols = cachedSymbols
    ? Promise.resolve(cachedSymbols)
    : fetch('./data/glamis_tileset.geojson')
        .then((response) => response.json())
        .then((data) => {
          cachedGeoJSON = data;
          const symbols = new Set();
          data.features.forEach((feature) => {
            if (feature.properties.sym) {
              symbols.add(feature.properties.sym);
            }
          });
          cachedSymbols = symbols;
          return symbols;
        });

  return ensureSymbols.then((symbols) => {
    console.log('📍 Loading symbols:', Array.from(symbols));
    const imagePromises = [];
    symbols.forEach((symbol) => {
      imagePromises.push(loadImageWithFallback(symbol, 'default', symbol));
      imagePromises.push(
        loadImageWithFallback(`${symbol}Selected`, 'selected', `${symbol}-selected`)
      );
    });
    return Promise.all(imagePromises);
  });
}

map.on('load', () => {
  console.log('🚀 Map loaded, initializing points...');

  loadSymbolImages()
    .then(() => {
      console.log('✅ All symbol images loaded');
      addPointsLayers();
      // Populate the search lists now that data is available.
      if (typeof sheet !== 'undefined' && sheet.mode === 'browse') {
        renderSearchResults(getSearchQuery());
      }
      renderDesktopResults('');
    })
    .catch((error) => {
      console.error('Error loading tileset data:', error);
      // Best-effort fallback so the map still shows something.
      Promise.all([
        loadImageWithFallback('default', 'default', 'default'),
        loadImageWithFallback('selected', 'selected', 'selected')
      ]).then(addPointsLayers);
    });
});

// Function to update pin appearance. Every filter keeps the UNCLUSTERED guard
// so a selected/deselected point never leaks out of its cluster.
function updatePinSelection(newSelectedId) {
  selectedPinId = newSelectedId;

  if (!map.getLayer('glamis-points-layer')) return; // layers not added yet

  if (selectedPinId !== null) {
    map.setFilter('glamis-points-selected', ['all', UNCLUSTERED, ['==', ['get', 'name'], selectedPinId]]);
    map.setFilter('glamis-points-layer',   ['all', UNCLUSTERED, ['!=', ['get', 'name'], selectedPinId]]);
    map.setFilter('glamis-labels-selected', ['all', UNCLUSTERED, ['==', ['get', 'name'], selectedPinId]]);
    map.setFilter('glamis-labels-default',  ['all', UNCLUSTERED, ['!=', ['get', 'name'], selectedPinId]]);
  } else {
    map.setFilter('glamis-points-selected', ['all', UNCLUSTERED, ['==', ['get', 'name'], '']]);
    map.setFilter('glamis-points-layer',    UNCLUSTERED);
    map.setFilter('glamis-labels-selected', ['all', UNCLUSTERED, ['==', ['get', 'name'], '']]);
    map.setFilter('glamis-labels-default',  UNCLUSTERED);
  }
}

// Build + show the desktop glass popup for a feature. Extracted so that
// desktop search-result taps can open the same popover as a pin tap.
function openDesktopPopup(props, coords) {
    // Desktop: pan map to center the clicked location with offset for popup
    const mapContainer = map.getContainer();
    const mapHeight = mapContainer.offsetHeight;
    const offsetY = mapHeight * 0.15; // Offset to account for popup height

    map.easeTo({
      center: coords,
      offset: [0, offsetY], // Shift center down to prevent popup cutoff
      duration: 800,
      essential: true
    });

    const lat = coords[1].toFixed(6);
    const lng = coords[0].toFixed(6);

    const coordsText = `${lat}, ${lng}`;
    
    const safeName = escapeHTML(props.name);
    const safeCoords = `${coords[1].toFixed(6)}, ${coords[0].toFixed(6)}`;

    const popupHTML = `
      <div class="glass-popup">
        <div class="glass-header">
          <div class="glass-title">
            ${safeName}
          </div>
          <button class="popup-close-btn" onclick="closePopup()" aria-label="Close popup"></button>
        </div>

        <div class="glass-section">
          <div class="glass-subtitle">
            <span class="material-icons subtitle-icon">place</span>
            Latitude / Longitude
          </div>
          <div class="glass-body">
            <div class="coords-container">
              <span class="coords-text">${safeCoords}</span>
              <button class="copy-chip" onclick="copyCoordinates('${safeCoords}', event)">copy</button>
            </div>
          </div>
        </div>

        <div class="glass-section">
          <div class="glass-subtitle">
            <span class="material-icons subtitle-icon">terrain</span>
            Elevation
          </div>
          <div class="glass-body">${escapeHTML(props.elevation || '322')} ft above sea level</div>
        </div>

        ${props.images ? `
          <div class="glass-section">
            <div class="popup-image-row">
              ${props.images.split(',').map(img => `
                <img src="${escapeHTML(img.trim())}" class="popup-image-thumb" alt="${safeName}">
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div class="glass-section">
          <div class="glass-subtitle">
            <span class="material-icons subtitle-icon">info</span>
            Description
          </div>
          <div class="glass-body">${escapeHTML(props.desc || 'No description available.')}</div>
        </div>

        ${props.image ? `
          <div class="glass-section">
            <div class="glass-image-container">
              <img src="${escapeHTML(props.image)}" alt="${safeName}" class="glass-image">
            </div>
          </div>
        ` : ''}
      </div>
    `;

    popup.setLngLat(coords).setHTML(popupHTML).addTo(map);

    // Wire image clicks via listeners (reading the resolved src) instead of
    // inline onclick handlers, so image URLs can't break out into script.
    const popupEl = popup.getElement();
    if (popupEl) {
      popupEl.querySelectorAll('.popup-image-thumb, .glass-image').forEach((img) => {
        img.addEventListener('click', () => openImageModal(img.src));
      });
    }
    
    // In 3D mode, pan map to ensure popup stays within viewport
    if (map.getPitch() > 0) {
      setTimeout(() => {
        const popupElement = popup.getElement();
        if (popupElement) {
          const popupRect = popupElement.getBoundingClientRect();
          const mapContainer = map.getContainer();
          const mapRect = mapContainer.getBoundingClientRect();
          
          // Check if popup is outside viewport bounds
          const isOutsideLeft = popupRect.left < mapRect.left + 20;
          const isOutsideRight = popupRect.right > mapRect.right - 20;
          const isOutsideTop = popupRect.top < mapRect.top + 20;
          const isOutsideBottom = popupRect.bottom > mapRect.bottom - 20;
          
          if (isOutsideLeft || isOutsideRight || isOutsideTop || isOutsideBottom) {
            // Calculate center point of viewport
            const viewportCenterX = mapRect.width / 2;
            const viewportCenterY = mapRect.height / 2;
            
            // Get current popup position relative to map
            const popupCenterX = popupRect.left - mapRect.left + popupRect.width / 2;
            const popupCenterY = popupRect.top - mapRect.top + popupRect.height / 2;
            
            // Calculate offset needed to center popup
            const offsetX = viewportCenterX - popupCenterX;
            const offsetY = viewportCenterY - popupCenterY;
            
            // Convert pixel offset to map coordinates
            const currentCenter = map.getCenter();
            const targetPoint = map.project(currentCenter);
            targetPoint.x -= offsetX;
            targetPoint.y -= offsetY;
            const targetCenter = map.unproject(targetPoint);
            
            // Smoothly pan to new center
            map.easeTo({
              center: targetCenter,
              duration: 500,
              easing: (t) => t * (2 - t) // ease-out
            });
          }
        }
      }, 100); // Small delay to ensure popup is rendered
    }
}

// Function to setup map interactions
let interactionsInitialized = false;
function setupMapInteractions() {
  // Mapbox dispatches click/mouse events by layer id, so these handlers keep
  // working after the layers are re-created on a basemap change. Registering
  // them more than once would fire the popup/easeTo logic multiple times per
  // click, so guard against that.
  if (interactionsInitialized) return;
  interactionsInitialized = true;

  // Click a cluster → zoom to the level where it breaks apart, centered on it.
  map.on('click', 'clusters', function(e) {
    const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
    if (!features.length) return;
    const clusterId = features[0].properties.cluster_id;
    const source = map.getSource('glamis-points');
    source.getClusterExpansionZoom(clusterId, (err, zoom) => {
      if (err) return;
      const prefersReducedMotion =
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      map.easeTo({
        center: features[0].geometry.coordinates,
        zoom: zoom + 0.25,
        duration: prefersReducedMotion ? 0 : 600,
        essential: true
      });
    });
  });

  // Pointer cursor over clusters.
  map.on('mouseenter', 'clusters', function() {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', 'clusters', function() {
    map.getCanvas().style.cursor = '';
  });

  // Click event for points
  map.on('click', 'glamis-points-layer', function(e) {
    const coords = e.features[0].geometry.coordinates.slice();
    const props = e.features[0].properties;
    
    // Update pin selection
    console.log('Clicked pin properties:', props);
    updatePinSelection(props.name);
    
    // Ensure that if the map is zoomed out such that multiple
    // copies of the feature are visible, the popup appears
    // over the copy being pointed to.
    while (Math.abs(e.lngLat.lng - coords[0]) > 180) {
      coords[0] += e.lngLat.lng > coords[0] ? 360 : -360;
    }
    
    const elevation = map.queryTerrainElevation(coords, { exaggerated: false });
    props.elevation = elevation !== null ? Math.round(elevation * 3.28084) : props.elevation;

    // On phones, present an Apple Maps-style bottom sheet instead of the
    // floating glass popup. The sheet frames the map camera itself.
    if (isMobileView()) {
      openMobileSheet(props, coords);
      return;
    }

    openDesktopPopup(props, coords);
  });
  
  // Change the cursor to a pointer when the mouse is over the points layer.
  map.on('mouseenter', 'glamis-points-layer', function() {
    map.getCanvas().style.cursor = 'pointer';
  });
  
  // Change it back to a pointer when it leaves.
  map.on('mouseleave', 'glamis-points-layer', function() {
    map.getCanvas().style.cursor = '';
  });
}


// Global function to close popup (mobile-friendly)
function closePopup() {
  popup.remove();
  // Reset pin selection when popup is closed
  updatePinSelection(null);
}


// Copy text to clipboard, with a fallback for non-secure contexts
// (the async Clipboard API is only available over HTTPS / localhost).
async function copyTextToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Legacy fallback: copy via a temporary, off-screen textarea.
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

// Desktop popup copy chip
async function copyCoordinates(coordsText, event) {
  event.stopPropagation();
  const chip = event.target.parentElement.querySelector('.copy-chip');
  try {
    await copyTextToClipboard(coordsText);
    if (chip) {
      chip.textContent = 'copied!';
      chip.classList.add('copied');
      setTimeout(() => {
        chip.textContent = 'copy';
        chip.classList.remove('copied');
      }, 2000);
    }
  } catch (err) {
    console.error('Failed to copy coordinates: ', err);
  }
}

// Image modal functions
function openImageModal(imageUrl) {
  const modal = document.getElementById('image-modal');
  const modalImage = document.getElementById('modal-image');
  modalImage.src = imageUrl;
  modal.classList.add('active');
  
  // Prevent body scrolling when modal is open
  document.body.style.overflow = 'hidden';
}

function closeImageModal() {
  const modal = document.getElementById('image-modal');
  modal.classList.remove('active');
  
  // Restore body scrolling
  document.body.style.overflow = '';
}

// Basemap configurations
const basemaps = [
  {
    name: 'Satellite',
    style: 'mapbox://styles/mapbox/satellite-streets-v12',
    icon: 'satellite'
  },
  {
    name: 'Streets',
    style: 'mapbox://styles/mapbox/streets-v12',
    icon: 'map'
  },
  {
    name: 'Outdoors',
    style: 'mapbox://styles/mapbox/outdoors-v12',
    icon: 'terrain'
  }
];

let currentBasemapIndex = 0;

// Initialize map controls
const initMapControls = () => {
  // Zoom controls
  document.getElementById('zoom-in').addEventListener('click', () => {
    map.zoomIn();
  });
  
  document.getElementById('zoom-out').addEventListener('click', () => {
    map.zoomOut();
  });
  
  // 3D toggle
  const toggle3D = document.getElementById('toggle-3d');
  let is3D = false;
  
  toggle3D.addEventListener('click', () => {
    is3D = !is3D;
    
    // Set different zoom limits for 2D vs 3D mode
    if (is3D) {
      map.setMaxZoom(16); // ~500ft scale for 3D mode
    } else {
      map.setMaxZoom(17); // ~300ft scale for 2D mode
    }
    
    map.easeTo({
      pitch: is3D ? 60 : 0,
      duration: 1000
    });
    toggle3D.textContent = is3D ? '2D' : '3D';
  });
  
  // Basemap selector
  const basemapToggle = document.getElementById('basemap-toggle');
  const basemapDropdown = document.getElementById('basemap-dropdown');
  const basemapOptions = document.querySelectorAll('.basemap-option');
  
  // Toggle dropdown
  basemapToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    basemapDropdown.classList.toggle('show');
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!basemapToggle.contains(e.target) && !basemapDropdown.contains(e.target)) {
      basemapDropdown.classList.remove('show');
    }
  });
  
  // Handle basemap selection
  basemapOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      const value = parseInt(e.currentTarget.getAttribute('data-value'));
      currentBasemapIndex = value;
      const newBasemap = basemaps[currentBasemapIndex];
      
      // Update active state
      basemapOptions.forEach(opt => opt.classList.remove('active'));
      e.currentTarget.classList.add('active');
      
      // Update button icon
      const buttonIcon = basemapToggle.querySelector('.material-icons');
      buttonIcon.textContent = newBasemap.icon;
      
      // Close dropdown
      basemapDropdown.classList.remove('show');
      
      // Change map style
      map.setStyle(newBasemap.style);
      
      // Re-add custom layers after style change. setStyle() wipes all sources,
      // layers, and images, so the per-symbol icons must be reloaded here too —
      // otherwise the pins render blank after switching basemaps.
      map.once('style.load', () => {
        // Re-add terrain
        if (!map.getSource('mapbox-dem')) {
          map.addSource('mapbox-dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.terrain-rgb'
          });
        }
        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1 });

        // Reload all symbol images, then re-add the points layers.
        loadSymbolImages()
          .then(addPointsLayers)
          .catch((error) => {
            console.error('Error reloading symbols after basemap change:', error);
            addPointsLayers();
          });
      });
    });
  });
  
  // Set initial active state
  basemapOptions[currentBasemapIndex].classList.add('active');
};

// Only render an individual feature when it is NOT part of a cluster.
const UNCLUSTERED = ['!', ['has', 'point_count']];

// Function to add points layers (clustered GeoJSON source)
function addPointsLayers() {
  // Remove existing layers/source if they exist
  ['glamis-labels-selected', 'glamis-labels-default', 'glamis-points-selected',
   'glamis-points-layer', 'cluster-count', 'clusters'].forEach((id) => {
    if (map.getLayer(id)) map.removeLayer(id);
  });
  if (map.getSource('glamis-points')) {
    map.removeSource('glamis-points');
  }

  // Clustered GeoJSON source. Native Mapbox clustering only works with a
  // GeoJSON source (not vector tiles), so we feed it the cached tileset data.
  map.addSource('glamis-points', {
    type: 'geojson',
    data: cachedGeoJSON || './data/glamis_tileset.geojson',
    cluster: true,
    clusterMaxZoom: 14, // stop clustering past this zoom — show every pin
    clusterRadius: 55   // px radius within which points merge
  });

  // --- Cluster circles ---------------------------------------------------
  // A clean, legible badge that reads well over satellite imagery: solid iOS
  // blue with a white ring, growing in steps with the number of points.
  map.addLayer({
    id: 'clusters',
    type: 'circle',
    source: 'glamis-points',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#007AFF',
      'circle-opacity': 0.95,
      'circle-radius': ['step', ['get', 'point_count'], 17, 10, 21, 25, 27],
      'circle-stroke-width': 3,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-opacity': 0.9
    }
  });

  // --- Cluster counts ----------------------------------------------------
  map.addLayer({
    id: 'cluster-count',
    type: 'symbol',
    source: 'glamis-points',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
      'text-size': ['step', ['get', 'point_count'], 13, 10, 14, 25, 15],
      'text-allow-overlap': true
    },
    paint: {
      'text-color': '#ffffff'
    }
  });

  // --- Individual (unclustered) points -----------------------------------
  map.addLayer({
    id: 'glamis-points-layer',
    type: 'symbol',
    source: 'glamis-points',
    layout: {
      'icon-image': ['get', 'sym'],
      'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.35, 17, 0.6],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'icon-pitch-alignment': 'viewport'
    },
    paint: {
      'icon-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.8, 17, 1.0]
    },
    // Hide the selected location's default symbol; never show clustered points.
    filter: ['all', UNCLUSTERED, ['!=', ['get', 'name'], selectedPinId]]
  });

  // Selected point (initially hidden)
  map.addLayer({
    id: 'glamis-points-selected',
    type: 'symbol',
    source: 'glamis-points',
    layout: {
      'icon-image': ['concat', ['get', 'sym'], '-selected'],
      'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.47, 17, 0.81],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'icon-pitch-alignment': 'viewport'
    },
    paint: {
      'icon-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.8, 17, 1.0]
    },
    filter: ['all', UNCLUSTERED, ['==', ['get', 'name'], '']]
  });

  // Default labels (closer to pin)
  map.addLayer({
    id: 'glamis-labels-default',
    type: 'symbol',
    source: 'glamis-points',
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
      'text-offset': [0, 1.25],
      'text-anchor': 'top',
      'text-size': 12
    },
    paint: {
      'text-color': '#000',
      'text-halo-color': '#fff',
      'text-halo-width': 2
    },
    filter: UNCLUSTERED
  });

  // Selected label (further from pin, initially hidden)
  map.addLayer({
    id: 'glamis-labels-selected',
    type: 'symbol',
    source: 'glamis-points',
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
      'text-offset': [0, 2.5],
      'text-anchor': 'top',
      'text-size': 12
    },
    paint: {
      'text-color': '#000',
      'text-halo-color': '#fff',
      'text-halo-width': 2
    },
    filter: ['all', UNCLUSTERED, ['==', ['get', 'name'], '']]
  });

  // Keep the selected pin above the labels.
  map.moveLayer('glamis-points-selected');

  // setStyle() wipes the navigation route too — re-add it if navigating.
  if (typeof navState !== 'undefined' && navState.active) {
    drawNavRoute();
  }

  setupMapInteractions();
}

// Dark mode functionality
const initDarkMode = () => {
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  const body = document.body;
  
  // Check for saved dark mode preference
  const isDarkMode = localStorage.getItem('darkMode') === 'true';
  if (isDarkMode) {
    body.classList.add('dark-mode');
    darkModeToggle.querySelector('.material-icons').textContent = 'light_mode';
  }
  
  darkModeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const isNowDark = body.classList.contains('dark-mode');
    
    // Update icon
    darkModeToggle.querySelector('.material-icons').textContent = 
      isNowDark ? 'light_mode' : 'dark_mode';
    
    // Save preference
    localStorage.setItem('darkMode', isNowDark);
  });
};


// Mobile-specific optimizations
document.addEventListener('DOMContentLoaded', () => {
  // Initialize all components
  initMapControls();
  initToolsToggle();
  initDarkMode();
  initCompass();
  initMobileSheet();
  initLocate();
  initServiceWorker();
  // initOffline();  // Offline capabilities hidden — see initServiceWorker()
  initNavigation();
  initSearch();
  initDesktopSearch();

  // Prevent zoom on double-tap for better mobile UX
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (event) => {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);

  // Handle orientation changes
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      map.resize();
    }, 100);
  });

  // Tap on the map background (not a pin) dismisses the open popup or sheet.
  map.on('click', (e) => {
    if (e.defaultPrevented) return;
    const features = map.queryRenderedFeatures(e.point, {
      layers: ['glamis-points-layer']
    });
    if (features.length > 0) return; // the pin's own handler will take over
    if (popup.isOpen()) {
      popup.remove();
      updatePinSelection(null);
    }
    // On mobile, tapping the map backs the panel out of a location card to the
    // search/browse view (the panel itself stays — it's persistent).
    if (isMobileView() && sheet.mode === 'detail') {
      showSheetBrowse('half');
    }
  });

  // Close modal when clicking outside the image
  document.getElementById('image-modal').addEventListener('click', (e) => {
    if (e.target.id === 'image-modal') {
      closeImageModal();
    }
  });
});


// ===========================================================================
// Apple Maps-style mobile bottom sheet
// A draggable place card with three detents (peek / half / full). Only used on
// phone-sized viewports; desktop keeps the floating glass popup.
// ===========================================================================
const MOBILE_BREAKPOINT = 768;

function isMobileView() {
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
}

const sheet = {
  el: null,
  scrollEl: null,
  grabberEl: null,
  searchbarEl: null,
  detailHeadEl: null,
  height: 0,
  detents: { full: 0, half: 0, peek: 0 },
  activeDetent: 'peek',
  current: 0,
  mode: 'browse',   // 'browse' (search results) | 'detail' (location card)
  hidden: false,    // temporarily slid away (during navigation)
  coords: null,
  // drag state
  dragging: false,
  startPointerY: 0,
  startTransform: 0,
  lastPointerY: 0,
  velocity: 0,
  initialized: false
};

// The persistent panel is "open" for purposes of the map-background tap when a
// location card is showing.
function isMobileSheetOpen() {
  return sheet.mode === 'detail';
}

// Measure the three snap positions (expressed as translateY in px, where 0 is
// fully open). Peek shows the grabber + the persistent search bar.
function computeDetents() {
  if (!sheet.el) return;
  sheet.height = sheet.el.offsetHeight;
  const vh = window.innerHeight;
  // Peek shows the grabber + whichever header is active for the current mode.
  const header = sheet.mode === 'detail' ? sheet.detailHeadEl : sheet.searchbarEl;
  const peekVisible = sheet.grabberEl.offsetHeight + (header ? header.offsetHeight : 0);
  sheet.detents.full = 0;
  sheet.detents.half = Math.max(0, Math.round(sheet.height - vh * 0.5));
  sheet.detents.peek = Math.max(0, Math.round(sheet.height - peekVisible));
}

function setSheetTransform(y, animate) {
  sheet.current = y;
  sheet.el.classList.toggle('is-animating', !!animate);
  sheet.el.style.transform = `translateY(${y}px)`;
}

function snapToDetent(name, animate = true) {
  const y = sheet.detents[name];
  if (y == null) return;
  setSheetTransform(y, animate);
  sheet.activeDetent = name;
  frameMapForDetent(name);
}

// Pick the closest detent to the current position, biased by drag velocity so
// a flick continues in its direction.
function nearestDetent(y, velocity) {
  const projected = y + velocity * 8;
  const points = [
    ['full', sheet.detents.full],
    ['half', sheet.detents.half],
    ['peek', sheet.detents.peek]
  ];
  let best = points[0];
  let bestDist = Infinity;
  for (const p of points) {
    const d = Math.abs(projected - p[1]);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best[0];
}

// Keep the selected pin visible above the sheet by padding the map's bottom.
function frameMapForDetent(detent) {
  if (!sheet.coords) return;
  if (detent === 'full') return; // map is essentially hidden, nothing to frame
  const visible = sheet.height - sheet.detents[detent];
  map.easeTo({
    center: sheet.coords,
    padding: { top: 0, right: 0, bottom: visible, left: 0 },
    duration: 400,
    essential: true
  });
}

function onSheetPointerDown(e) {
  sheet.dragging = true;
  sheet.startPointerY = e.clientY;
  sheet.startTransform = sheet.current;
  sheet.lastPointerY = e.clientY;
  sheet.velocity = 0;
  sheet.el.classList.remove('is-animating');
}

function onSheetPointerMove(e) {
  if (!sheet.dragging) return;
  const dy = e.clientY - sheet.startPointerY;
  let y = sheet.startTransform + dy;
  if (y < 0) y *= 0.35;              // rubber-band past the full detent
  if (y > sheet.height) y = sheet.height;
  sheet.velocity = e.clientY - sheet.lastPointerY;
  sheet.lastPointerY = e.clientY;
  setSheetTransform(y, false);
}

function onSheetPointerUp() {
  if (!sheet.dragging) return;
  sheet.dragging = false;
  // The panel is persistent — it never dismisses; peek is the lowest detent.
  snapToDetent(nearestDetent(sheet.current, sheet.velocity), true);
}

function populateSheet(props, coords) {
  // Header icon: use the same symbol image the map renders for this point,
  // falling back to the default pin if that symbol's image is missing.
  const iconImg = sheet.el.querySelector('#sheet-icon img');
  const sym = props.sym || 'default';
  iconImg.onerror = () => {
    iconImg.onerror = null;
    iconImg.src = './images/default.png';
  };
  iconImg.src = `./images/${encodeURIComponent(sym)}.png`;

  // textContent is inherently injection-safe.
  document.getElementById('sheet-title').textContent = props.name || 'Location';
  const coordText = `${coords[1].toFixed(6)}, ${coords[0].toFixed(6)}`;
  document.getElementById('sheet-coords').textContent = coordText;
  document.getElementById('sheet-elevation').textContent =
    `${props.elevation || '322'} ft above sea level`;
  document.getElementById('sheet-desc').textContent =
    props.desc || 'No description available.';

  // Image carousel
  const imagesEl = document.getElementById('sheet-images');
  imagesEl.innerHTML = '';
  const urls = [];
  if (props.images) {
    props.images.split(',').forEach((u) => {
      const t = u.trim();
      if (t) urls.push(t);
    });
  }
  if (props.image) {
    const t = String(props.image).trim();
    if (t && !urls.includes(t)) urls.push(t);
  }
  urls.forEach((url) => {
    const img = document.createElement('img');
    img.src = url;
    img.alt = props.name || '';
    img.loading = 'lazy';
    img.addEventListener('click', () => openImageModal(img.src));
    imagesEl.appendChild(img);
  });

  // Copy button bound to this point's coordinates
  const copyBtn = document.getElementById('sheet-copy');
  copyBtn.onclick = async () => {
    try {
      await copyTextToClipboard(coordText);
      copyBtn.textContent = 'Copied';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
        copyBtn.classList.remove('copied');
      }, 2000);
    } catch (err) {
      console.error('Failed to copy coordinates: ', err);
    }
  };

  // Share button bound to this point
  const shareBtn = document.getElementById('sheet-share');
  shareBtn.onclick = () => shareLocation(props, coords);

  // Directions button bound to this point; label shows live distance.
  sheetTarget = { name: props.name || 'Location', coords: coords.slice() };
  const dirBtn = document.getElementById('sheet-directions');
  dirBtn.onclick = () => startDirections(sheetTarget);
  updateDirectionsLabel();
  // If we already have geolocation permission, fetch a one-shot position so the
  // distance shows immediately (no prompt unless already granted).
  primeUserLocation();
}

// Share a location via the native share sheet (Web Share API), falling back to
// copying the details when navigator.share is unavailable. The shared link is a
// universal maps URL so any recipient can open the exact spot.
async function shareLocation(props, coords) {
  const name = props.name || 'Location';
  const lat = coords[1].toFixed(6);
  const lng = coords[0].toFixed(6);
  const coordText = `${lat}, ${lng}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const description = props.desc ? `\n\n${props.desc}` : '';
  const fallbackText = `${name}\n${coordText}\n${mapsUrl}`;

  try {
    if (navigator.share) {
      await navigator.share({
        title: `${name} — Glamis Map`,
        text: `${name}\n${coordText}${description}`,
        url: mapsUrl
      });
    } else {
      await copyTextToClipboard(fallbackText);
      showMapToast('Location copied to clipboard');
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return; // user dismissed the share sheet
    try {
      await copyTextToClipboard(fallbackText);
      showMapToast('Location copied to clipboard');
    } catch (_) {
      showMapToast('Unable to share this location');
    }
  }
}

// Swap the panel's content between the search results and the location card.
// The search bar is the header in browse mode; the location header is the
// header in detail mode — only one is ever visible.
function setSheetMode(mode) {
  sheet.mode = mode;
  const browse = document.getElementById('sheet-browse');
  const detail = document.getElementById('sheet-detail');
  if (browse) browse.hidden = mode !== 'browse';
  if (detail) detail.hidden = mode !== 'detail';
  // Drive the two headers with inline display so they can't be overridden by a
  // stale or higher-specificity stylesheet rule (search bar in browse mode,
  // location header in detail mode — never both).
  if (sheet.searchbarEl) sheet.searchbarEl.style.display = mode === 'detail' ? 'none' : '';
  if (sheet.detailHeadEl) sheet.detailHeadEl.style.display = mode === 'detail' ? '' : 'none';
  if (sheet.scrollEl) sheet.scrollEl.scrollTop = 0;
}

// Show a location's card in the panel (panel is always present).
function openMobileSheet(props, coords) {
  if (!sheet.el) return;
  sheet.hidden = false;
  sheet.el.classList.add('is-visible');
  sheet.coords = coords.slice();
  setSheetMode('detail');
  populateSheet(props, coords);
  computeDetents();
  snapToDetent('half', true);
}

// Return the panel to its default search/browse state (does NOT dismiss it).
function showSheetBrowse(snap = 'half') {
  if (!sheet.el) return;
  sheet.hidden = false;
  sheet.el.classList.add('is-visible');
  sheet.coords = null;
  setSheetMode('browse');
  renderSearchResults(getSearchQuery());
  updatePinSelection(null);
  map.easeTo({ padding: { top: 0, right: 0, bottom: 0, left: 0 }, duration: 400 });
  computeDetents();
  snapToDetent(snap, true);
}

// Slide the panel away during turn-by-turn navigation (the nav banner takes
// over the bottom of the screen), then restore it afterwards.
function hideSheetForNav() {
  if (!sheet.el) return;
  sheet.hidden = true;
  setSheetTransform(sheet.height, true);
}

function restoreSheetFromNav() {
  if (!sheet.el || !sheet.hidden) return;
  sheet.hidden = false;
  showSheetBrowse('half');
}

function initSheetDetailsToggle() {
  const toggle = document.getElementById('sheet-details-toggle');
  const group = document.getElementById('sheet-details');
  if (!toggle || !group) return;
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    group.classList.toggle('is-collapsed', expanded);
  });
}

function initMobileSheet() {
  if (sheet.initialized) return;
  const el = document.getElementById('mobile-sheet');
  if (!el) return;
  sheet.initialized = true;

  sheet.el = el;
  sheet.scrollEl = document.getElementById('sheet-scroll');
  sheet.grabberEl = document.getElementById('sheet-grabber-zone');
  sheet.searchbarEl = document.getElementById('sheet-searchbar');
  sheet.detailHeadEl = document.getElementById('sheet-detail-head');

  // The location card's close button returns to the search/browse view.
  document.getElementById('sheet-close').addEventListener('click', (e) => {
    e.stopPropagation();
    showSheetBrowse('half');
  });

  initSheetDetailsToggle();

  // Drag from the grabber + active header (but not the input or close button).
  const startDrag = (e) => {
    if (e.target.closest('.search-field') || e.target.closest('.sheet-close')) return;
    onSheetPointerDown(e);
  };
  [sheet.grabberEl, sheet.searchbarEl, sheet.detailHeadEl].forEach((h) => {
    if (h) h.addEventListener('pointerdown', startDrag);
  });
  window.addEventListener('pointermove', onSheetPointerMove);
  window.addEventListener('pointerup', onSheetPointerUp);
  window.addEventListener('pointercancel', onSheetPointerUp);

  window.addEventListener('resize', () => {
    if (sheet.hidden) return;
    computeDetents();
    snapToDetent(sheet.activeDetent, false);
  });

  // Show the search panel at half height on load.
  el.classList.add('is-visible');
  setSheetMode('browse');
  computeDetents();
  setSheetTransform(sheet.detents.half, false);
  sheet.activeDetent = 'half';
  renderSearchResults(getSearchQuery());
}


// ===========================================================================
// Locate me / device heading (Apple Maps-style)
//   • Tap once  → center on the blue dot and follow it (north-up).
//   • Tap again → "compass" mode: rotate the map to the device's heading.
//   • Tap again → back to north-up follow.
//   • Panning the map drops out of follow (handled by GeolocateControl).
// The blue dot, accuracy circle, and heading beam are rendered by Mapbox's
// GeolocateControl; this just drives it from the custom glass button.
// ===========================================================================
let orientationHandler = null;

// Lightweight transient toast for permission / availability messages.
let toastTimer = null;
function showMapToast(message) {
  let el = document.getElementById('map-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'map-toast';
    el.className = 'map-toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

function stopHeadingTracking() {
  if (!orientationHandler) return;
  window.removeEventListener('deviceorientationabsolute', orientationHandler);
  window.removeEventListener('deviceorientation', orientationHandler);
  orientationHandler = null;
}

// Begin rotating the map to match the device compass heading. Returns a promise
// that resolves true once listening has started (false if unavailable/denied).
async function startHeadingTracking() {
  // iOS 13+ requires explicit permission, requested from a user gesture.
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      const result = await DeviceOrientationEvent.requestPermission();
      if (result !== 'granted') {
        showMapToast('Compass access denied.');
        return false;
      }
    }
  } catch (err) {
    showMapToast('Compass not available on this device.');
    return false;
  }

  let lastBearing = null;
  orientationHandler = (event) => {
    let heading = null;
    if (typeof event.webkitCompassHeading === 'number') {
      heading = event.webkitCompassHeading;           // iOS: degrees CW from north
    } else if (typeof event.alpha === 'number') {
      heading = 360 - event.alpha;                    // most Android browsers
    }
    if (heading == null || isNaN(heading)) return;
    // Ignore tiny changes to avoid jitter.
    if (lastBearing !== null && Math.abs(heading - lastBearing) < 1.5) return;
    lastBearing = heading;
    map.setBearing(heading); // programmatic → does not drop GeolocateControl follow
  };

  if ('ondeviceorientationabsolute' in window) {
    window.addEventListener('deviceorientationabsolute', orientationHandler);
  } else {
    window.addEventListener('deviceorientation', orientationHandler);
  }
  return true;
}

function initLocate() {
  const locateBtn = document.getElementById('locate-btn');
  if (!locateBtn) return;
  const icon = locateBtn.querySelector('.material-icons');

  // 'off' → 'active' (follow, north-up) → 'heading' (follow + compass rotate)
  let locateState = 'off';

  const setState = (state) => {
    locateState = state;
    if (state === 'off') {
      locateBtn.classList.remove('locating');
      icon.textContent = 'near_me';
      locateBtn.title = 'Show my location';
    } else if (state === 'active') {
      locateBtn.classList.add('locating');
      icon.textContent = 'near_me';
      locateBtn.title = 'Tracking — tap for compass heading';
    } else if (state === 'heading') {
      locateBtn.classList.add('locating');
      icon.textContent = 'navigation';
      locateBtn.title = 'Compass heading — tap for north up';
    }
  };

  // GeolocateControl drives the dot + follow state; mirror it on the button.
  // Keep the global userLocation fresh whenever the blue dot updates, so the
  // sheet's Directions distance and live navigation can use it.
  geolocate.on('geolocate', (pos) => {
    userLocation = [pos.coords.longitude, pos.coords.latitude];
    onUserLocationUpdate();
  });

  geolocate.on('trackuserlocationstart', () => {
    if (locateState === 'off') setState('active');
  });
  geolocate.on('trackuserlocationend', () => {
    stopHeadingTracking();
    setState('off');
  });
  geolocate.on('error', (e) => {
    stopHeadingTracking();
    setState('off');
    const denied = e && e.code === 1; // PERMISSION_DENIED
    showMapToast(denied
      ? 'Location access denied. Enable it in your browser settings.'
      : 'Unable to determine your location.');
  });

  locateBtn.addEventListener('click', async () => {
    if (locateState === 'off') {
      // iOS Safari only grants geolocation when the request comes directly from
      // the tap (not routed through the control). Request a position here in the
      // gesture; once granted, let the control take over the dot + follow.
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            userLocation = [pos.coords.longitude, pos.coords.latitude];
            onUserLocationUpdate();
            geolocate.trigger();
          },
          (err) => {
            const denied = err && err.code === 1;
            showMapToast(denied
              ? 'Location denied. In Safari: tap “aA” in the address bar → Website Settings → Location → Allow, and check Settings ▸ Privacy ▸ Location Services ▸ Safari.'
              : 'Couldn’t get your location — make sure the site is opened over https, then try again.');
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
        );
      } else {
        geolocate.trigger();
      }
    } else if (locateState === 'active') {
      const started = await startHeadingTracking();
      if (started) setState('heading');
    } else {
      // heading → back to north-up follow
      stopHeadingTracking();
      map.easeTo({ bearing: 0, duration: 300 });
      setState('active');
    }
  });
}


// ===========================================================================
// Offline support (PWA service worker + "Download for offline" button)
// ===========================================================================

// Bounding box of all points (with a small margin), warmed for offline imagery.
const OFFLINE_BBOX = [-115.20, 32.70, -114.82, 33.01]; // [west, south, east, north]
const OFFLINE_MIN_ZOOM = 11;
const OFFLINE_MAX_ZOOM = 14;

let offlineCancel = false;

// Register the service worker (relative path → scope = app directory, which
// works both locally and under a GitHub Pages project subpath).
function initServiceWorker() {
  // ---------------------------------------------------------------------------
  // Offline capabilities are currently DISABLED.
  // Instead of registering the service worker, we actively remove any that was
  // previously installed (and its caches) so visitors are no longer served
  // stale, cached content.
  //
  // To RE-ENABLE offline: replace the body below with
  //     navigator.serviceWorker.register('sw.js');
  // and also un-comment `initOffline();` in DOMContentLoaded and the offline
  // control button (see style.css ".control-group:has(#offline-btn)").
  // ---------------------------------------------------------------------------
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => {});
  }
  if ('caches' in window) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
  }
}

function sendToServiceWorker(message) {
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(message);
  }
}

// Wait for the map to finish rendering the current view (or a timeout, so a
// slow/blank step can't stall the whole download).
function waitForMapIdle(timeoutMs) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      map.off('idle', finish);
      resolve();
    };
    map.once('idle', finish);
    setTimeout(finish, timeoutMs);
  });
}

// Compute the camera steps needed to cover OFFLINE_BBOX at each zoom, then pan
// through them so Mapbox requests (and the service worker caches) every tile.
async function warmMapTiles(onProgress) {
  const [w, s, e, n] = OFFLINE_BBOX;
  const cx = (w + e) / 2;
  const cy = (s + n) / 2;

  // Flatten orientation for predictable viewport bounds; restore afterwards.
  map.jumpTo({ bearing: 0, pitch: 0 });

  // First pass (synchronous): how many steps per zoom?
  const plan = [];
  let total = 0;
  for (let z = OFFLINE_MIN_ZOOM; z <= OFFLINE_MAX_ZOOM; z++) {
    map.jumpTo({ center: [cx, cy], zoom: z });
    const b = map.getBounds();
    const vLng = (b.getEast() - b.getWest()) * 0.9;  // 10% overlap
    const vLat = (b.getNorth() - b.getSouth()) * 0.9;
    const cols = Math.max(1, Math.ceil((e - w) / vLng));
    const rows = Math.max(1, Math.ceil((n - s) / vLat));
    plan.push({ z, cols, rows });
    total += cols * rows;
  }

  // Second pass: actually pan + let tiles load.
  let done = 0;
  for (const { z, cols, rows } of plan) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (offlineCancel) return { done, total, cancelled: true };
        const lng = w + (e - w) * ((c + 0.5) / cols);
        const lat = s + (n - s) * ((r + 0.5) / rows);
        map.jumpTo({ center: [lng, lat], zoom: z });
        await waitForMapIdle(5000);
        done++;
        if (onProgress) onProgress(done, total, 'Map imagery');
      }
    }
  }
  return { done, total, cancelled: false };
}

// Collect every photo URL referenced by the point data (mirrors the parsing in
// populateSheet) and fetch them so the service worker caches them.
function collectPhotoUrls() {
  const urls = new Set();
  const features = (cachedGeoJSON && cachedGeoJSON.features) || [];
  features.forEach((f) => {
    const p = f.properties || {};
    if (p.images) {
      p.images.split(',').forEach((u) => {
        const t = u.trim();
        if (t) urls.add(t);
      });
    }
    if (p.image) {
      const t = String(p.image).trim();
      if (t) urls.add(t);
    }
  });
  return Array.from(urls);
}

async function warmPhotos(onProgress) {
  const urls = collectPhotoUrls();
  const total = urls.length;
  let done = 0;
  const CONCURRENCY = 6;
  let index = 0;

  async function worker() {
    while (index < urls.length) {
      if (offlineCancel) return;
      const url = urls[index++];
      try {
        await fetch(url, { cache: 'reload' });
      } catch (_) {
        /* skip unreachable photos */
      }
      done++;
      if (onProgress) onProgress(done, total, 'Photos');
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return { done, total };
}

async function updateStorageEstimate(el) {
  if (!el) return;
  if (!navigator.storage || !navigator.storage.estimate) {
    el.textContent = '';
    return;
  }
  try {
    const { usage } = await navigator.storage.estimate();
    const mb = (usage || 0) / (1024 * 1024);
    el.textContent = `Currently using ${mb.toFixed(1)} MB of offline storage.`;
  } catch (_) {
    el.textContent = '';
  }
}

// Remembers when the user last completed an offline download.
const OFFLINE_LAST_KEY = 'glamisLastDownload';

function setLastDownloadNow() {
  try {
    localStorage.setItem(OFFLINE_LAST_KEY, new Date().toISOString());
  } catch (_) {
    /* localStorage unavailable (private mode) — status just won't persist */
  }
}

function clearLastDownload() {
  try {
    localStorage.removeItem(OFFLINE_LAST_KEY);
  } catch (_) {}
}

function updateOfflineStatus(el) {
  if (!el) return;
  let ts = null;
  try {
    ts = localStorage.getItem(OFFLINE_LAST_KEY);
  } catch (_) {}
  if (ts) {
    const d = new Date(ts);
    let when;
    try {
      when = d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    } catch (_) {
      when = d.toLocaleString();
    }
    el.textContent = `Last downloaded ${when}`;
    el.classList.add('is-downloaded');
  } else {
    el.textContent = 'Not downloaded for offline yet';
    el.classList.remove('is-downloaded');
  }
}

// --- Install app / Add to Home Screen ------------------------------------
// Android/Chromium fire beforeinstallprompt — capture it for a one-tap install.
// iOS has no install API, so that path just shows Share → Add to Home Screen.
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
});
window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  const section = document.getElementById('offline-install');
  if (section) section.style.display = 'none';
});

function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
}

// Build the platform-specific instructions (static text + a Material glyph).
function renderInstallSteps(platform) {
  const steps = document.getElementById('offline-install-steps');
  if (!steps) return;
  steps.innerHTML = '';
  steps.style.display = 'block';

  const makeStep = (parts) => {
    const row = document.createElement('div');
    row.className = 'offline-step';
    parts.forEach((p) => {
      if (typeof p === 'string') {
        row.appendChild(document.createTextNode(p));
      } else {
        const icon = document.createElement('span');
        icon.className = 'material-icons';
        icon.textContent = p.icon;
        row.appendChild(icon);
      }
    });
    return row;
  };

  if (platform === 'ios') {
    steps.appendChild(makeStep(['1. Tap the Share button ', { icon: 'ios_share' }, ' in Safari.']));
    steps.appendChild(makeStep(['2. Choose “Add to Home Screen” ', { icon: 'add_box' }, '.']));
  } else {
    steps.appendChild(makeStep(['1. Open the browser menu ', { icon: 'more_vert' }, '.']));
    steps.appendChild(makeStep(['2. Tap “Install app” or “Add to Home screen.”']));
  }
}

function initInstall() {
  const toggle = document.getElementById('offline-install-toggle');
  const body = document.getElementById('offline-install-body');
  const iosBtn = document.getElementById('install-ios');
  const androidBtn = document.getElementById('install-android');
  const steps = document.getElementById('offline-install-steps');
  if (!toggle || !body) return;

  toggle.addEventListener('click', () => {
    const open = body.style.display !== 'none';
    body.style.display = open ? 'none' : 'block';
    toggle.setAttribute('aria-expanded', String(!open));
    toggle.classList.toggle('expanded', !open);
  });

  if (iosBtn) iosBtn.addEventListener('click', () => renderInstallSteps('ios'));

  if (androidBtn) {
    androidBtn.addEventListener('click', async () => {
      if (deferredInstallPrompt) {
        if (steps) steps.style.display = 'none';
        deferredInstallPrompt.prompt();
        try { await deferredInstallPrompt.userChoice; } catch (_) {}
        deferredInstallPrompt = null;
      } else {
        renderInstallSteps('android');
      }
    });
  }
}

// Hide the whole install entry once installed; otherwise reset it to collapsed.
function updateInstallVisibility() {
  const section = document.getElementById('offline-install');
  const body = document.getElementById('offline-install-body');
  const steps = document.getElementById('offline-install-steps');
  const toggle = document.getElementById('offline-install-toggle');
  if (!section) return;
  section.style.display = isAppInstalled() ? 'none' : '';
  if (body) body.style.display = 'none';
  if (steps) { steps.style.display = 'none'; steps.innerHTML = ''; }
  if (toggle) { toggle.setAttribute('aria-expanded', 'false'); toggle.classList.remove('expanded'); }
}

function initOffline() {
  const btn = document.getElementById('offline-btn');
  const dialog = document.getElementById('offline-dialog');
  if (!btn || !dialog) return;

  initInstall();

  const startBtn = document.getElementById('offline-start');
  const clearBtn = document.getElementById('offline-clear');
  const closeBtn = document.getElementById('offline-close');
  const photosCheck = document.getElementById('offline-photos');
  const progress = document.getElementById('offline-progress');
  const progressFill = document.getElementById('offline-progress-fill');
  const progressLabel = document.getElementById('offline-progress-label');
  const storageEl = document.getElementById('offline-storage');
  const statusEl = document.getElementById('offline-status');

  const openDialog = () => {
    dialog.classList.add('show');
    dialog.setAttribute('aria-hidden', 'false');
    updateOfflineStatus(statusEl);
    updateStorageEstimate(storageEl);
    updateInstallVisibility();
  };
  const closeDialog = () => {
    if (startBtn.disabled) return; // don't close mid-download
    dialog.classList.remove('show');
    dialog.setAttribute('aria-hidden', 'true');
  };

  btn.addEventListener('click', openDialog);
  closeBtn.addEventListener('click', closeDialog);
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) closeDialog();
  });

  clearBtn.addEventListener('click', async () => {
    sendToServiceWorker({ type: 'CLEAR_TILES' });
    clearLastDownload();
    updateOfflineStatus(statusEl);
    showMapToast('Offline map data cleared');
    setTimeout(() => updateStorageEstimate(storageEl), 400);
  });

  startBtn.addEventListener('click', async () => {
    offlineCancel = false;
    const saved = {
      center: map.getCenter(),
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: map.getPitch()
    };

    startBtn.disabled = true;
    startBtn.textContent = 'Cancel';
    progress.hidden = false;
    btn.classList.add('downloading');

    // Clicking again cancels.
    const cancelHandler = () => { offlineCancel = true; };
    startBtn.addEventListener('click', cancelHandler);

    const setProgress = (done, total, label) => {
      const pct = total ? Math.round((done / total) * 100) : 0;
      progressFill.style.width = `${pct}%`;
      progressLabel.textContent = `${label}: ${done} / ${total}`;
    };

    try {
      // Ensure the app shell is cached even if install hasn't completed.
      sendToServiceWorker({ type: 'ENSURE_SHELL' });

      const tiles = await warmMapTiles(setProgress);
      if (!tiles.cancelled && photosCheck.checked) {
        await warmPhotos(setProgress);
      }

      map.jumpTo(saved); // restore the user's view

      if (offlineCancel) {
        showMapToast('Download cancelled');
      } else {
        setLastDownloadNow();
        updateOfflineStatus(statusEl);
        showMapToast('Saved for offline use ✓');
      }
    } catch (err) {
      console.error('Offline download failed:', err);
      map.jumpTo(saved);
      showMapToast('Download failed — please try again');
    } finally {
      startBtn.removeEventListener('click', cancelHandler);
      startBtn.disabled = false;
      startBtn.textContent = 'Download';
      progress.hidden = true;
      progressFill.style.width = '0%';
      btn.classList.remove('downloading');
      updateStorageEstimate(storageEl);
    }
  });

  initOfflineIndicator();
}

// Persistent "Offline" pill + a one-time nudge when panning outside the saved
// area while offline.
function initOfflineIndicator() {
  let pill = document.getElementById('offline-pill');
  if (!pill) {
    pill = document.createElement('div');
    pill.id = 'offline-pill';
    pill.className = 'offline-pill';
    pill.innerHTML = '<span class="material-icons">cloud_off</span> Offline — showing saved data';
    document.body.appendChild(pill);
  }

  const sync = () => {
    pill.classList.toggle('show', !navigator.onLine);
  };
  window.addEventListener('online', sync);
  window.addEventListener('offline', sync);
  sync();

  let warnedOutside = false;
  window.addEventListener('online', () => { warnedOutside = false; });
  map.on('moveend', () => {
    if (navigator.onLine || warnedOutside) return;
    const c = map.getCenter();
    const [w, s, e, n] = OFFLINE_BBOX;
    const outside = c.lng < w || c.lng > e || c.lat < s || c.lat > n;
    if (outside) {
      warnedOutside = true;
      showMapToast('You’ve left the downloaded area — imagery may be blank until you reconnect.');
    }
  });
}


// ===========================================================================
// Navigation (straight-line directions to a location, Apple Maps-style)
//   • Directions button in the sheet shows live straight-line distance.
//   • Tapping it draws a dashed route line from your location to the target,
//     frames the route, then follows you with live distance + heading.
// Straight-line (geodesic) is intentional: it works offline and reaches the
// off-road dune points that road routing can't.
// ===========================================================================

// Latest known user position [lng, lat]; updated by the GeolocateControl and
// by the navigation watch.
let userLocation = null;

// Target currently shown in the sheet (for the Directions label/button).
let sheetTarget = null;

const navState = {
  active: false,
  target: null,     // { name, coords:[lng,lat] }
  watchId: null,
  follow: true,
  arrived: false
};

let navUserMarker = null;
let primedLocation = false;

// --- geo helpers -----------------------------------------------------------
function haversineMiles(a, b) {
  const R = 3958.8; // Earth radius in miles
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function bearingDeg(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const dLng = toRad(b[0] - a[0]);
  const y = Math.sin(dLng) * Math.cos(toRad(b[1]));
  const x =
    Math.cos(toRad(a[1])) * Math.sin(toRad(b[1])) -
    Math.sin(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function cardinal(deg) {
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8];
}

function formatMiles(mi) {
  if (mi < 0.1) return `${Math.round(mi * 5280)} ft`;
  return `${mi.toFixed(1)} mi`;
}

// --- sheet Directions label ------------------------------------------------
function updateDirectionsLabel() {
  const label = document.getElementById('sheet-directions-label');
  if (!label || !sheetTarget) return;
  if (userLocation) {
    label.textContent = formatMiles(haversineMiles(userLocation, sheetTarget.coords));
  } else {
    label.textContent = ''; // icon-only until we know your location
  }
}

// Called whenever userLocation changes.
function onUserLocationUpdate() {
  if (!navState.active) updateDirectionsLabel();
  if (sheet.mode === 'browse') renderSearchResults(getSearchQuery());
  if (!isMobileView()) {
    const di = document.getElementById('desktop-search-input');
    renderDesktopResults(di ? di.value.trim() : '');
  }
}

// Fetch a one-shot position only if permission is already granted, so the
// Directions distance can show without a fresh prompt.
function primeUserLocation() {
  if (userLocation || primedLocation || !navigator.geolocation) return;
  primedLocation = true;
  const grab = () =>
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLocation = [pos.coords.longitude, pos.coords.latitude];
        onUserLocationUpdate();
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
    );
  if (navigator.permissions && navigator.permissions.query) {
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => { if (status.state === 'granted') grab(); })
      .catch(() => {});
  }
}

// --- route line ------------------------------------------------------------
function drawNavRoute() {
  if (!navState.active || !userLocation || !navState.target) return;
  const data = {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: [userLocation, navState.target.coords] },
    properties: {}
  };
  if (!map.getSource('nav-route')) {
    map.addSource('nav-route', { type: 'geojson', data });
    // Insert beneath the point symbols so pins stay on top.
    const beforeId = map.getLayer('clusters') ? 'clusters' : undefined;
    map.addLayer({
      id: 'nav-route-casing',
      type: 'line',
      source: 'nav-route',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#ffffff', 'line-width': 9, 'line-opacity': 0.7 }
    }, beforeId);
    map.addLayer({
      id: 'nav-route-line',
      type: 'line',
      source: 'nav-route',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#007aff',
        'line-width': 5,
        'line-dasharray': [0.2, 1.6] // round-capped dots → "direct line"
      }
    }, beforeId);
  } else {
    map.getSource('nav-route').setData(data);
  }
}

function setNavUserMarker(coords) {
  if (!navUserMarker) {
    const el = document.createElement('div');
    el.className = 'nav-user-dot';
    navUserMarker = new mapboxgl.Marker({ element: el }).setLngLat(coords).addTo(map);
  } else {
    navUserMarker.setLngLat(coords);
  }
}

// --- device heading (so the banner arrow points the way to go) -------------
// During navigation we keep the device's compass heading so the banner arrow
// shows the bearing to the destination relative to the direction you're facing
// (like Apple Maps), not just relative to north.
let navHeading = null;
let navOrientationHandler = null;

async function startNavHeading() {
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      const res = await DeviceOrientationEvent.requestPermission(); // iOS 13+
      if (res !== 'granted') return;
    }
  } catch (_) {
    return; // not in a gesture / unsupported — arrow falls back to north-up
  }
  navOrientationHandler = (event) => {
    let heading = null;
    if (typeof event.webkitCompassHeading === 'number') {
      heading = event.webkitCompassHeading;     // iOS: degrees CW from north
    } else if (typeof event.alpha === 'number') {
      heading = 360 - event.alpha;              // most other browsers
    }
    if (heading == null || isNaN(heading)) return;
    navHeading = heading;
    updateNavArrow();
  };
  if ('ondeviceorientationabsolute' in window) {
    window.addEventListener('deviceorientationabsolute', navOrientationHandler);
  } else {
    window.addEventListener('deviceorientation', navOrientationHandler);
  }
}

function stopNavHeading() {
  if (navOrientationHandler) {
    window.removeEventListener('deviceorientationabsolute', navOrientationHandler);
    window.removeEventListener('deviceorientation', navOrientationHandler);
    navOrientationHandler = null;
  }
  navHeading = null;
}

// Rotate the banner arrow toward the destination, relative to the device
// heading when available (falls back to the map bearing otherwise).
function updateNavArrow() {
  const arrowEl = document.getElementById('nav-arrow');
  if (!arrowEl || !navState.active || !userLocation || !navState.target) return;
  const brg = bearingDeg(userLocation, navState.target.coords);
  const ref = navHeading != null ? navHeading : map.getBearing();
  arrowEl.style.transform = `rotate(${brg - ref}deg)`;
}

// --- live stats / banner ---------------------------------------------------
function updateNavStats() {
  if (!navState.active || !userLocation || !navState.target) return;
  const distEl = document.getElementById('nav-distance');
  const cardEl = document.getElementById('nav-cardinal');

  const d = haversineMiles(userLocation, navState.target.coords);
  const brg = bearingDeg(userLocation, navState.target.coords);

  if (d < 0.03) {
    if (!navState.arrived) {
      navState.arrived = true;
      showMapToast('You have arrived');
    }
    distEl.textContent = 'Arrived';
  } else {
    navState.arrived = false;
    distEl.textContent = formatMiles(d);
  }
  cardEl.textContent = cardinal(brg);
  updateNavArrow();
}

// --- camera ----------------------------------------------------------------
function onNavPosition(coords) {
  userLocation = coords;
  setNavUserMarker(coords);
  drawNavRoute();
  updateNavStats();
  if (navState.follow) {
    map.easeTo({ center: coords, duration: 700, essential: true });
  }
}

function setRecenterVisible(visible) {
  const btn = document.getElementById('nav-recenter');
  if (!btn) return;
  btn.classList.toggle('show', visible);
  btn.setAttribute('aria-hidden', visible ? 'false' : 'true');
}

function frameRoute() {
  if (!userLocation || !navState.target) return;
  const b = new mapboxgl.LngLatBounds(userLocation, userLocation);
  b.extend(navState.target.coords);
  navState.follow = false; // overview first
  map.fitBounds(b, {
    padding: { top: 90, bottom: 220, left: 60, right: 60 },
    maxZoom: 16,
    duration: 900
  });
  // After the overview settles, start following the user.
  map.once('moveend', () => {
    if (navState.active) {
      navState.follow = true;
      setRecenterVisible(false);
    }
  });
}

function startNavigation(target) {
  navState.active = true;
  navState.target = target;
  navState.follow = true;
  navState.arrived = false;

  startNavHeading(); // device compass → heading-aware banner arrow

  hideSheetForNav();
  document.body.classList.add('navigating');
  document.getElementById('nav-name').textContent = target.name;
  const banner = document.getElementById('nav-banner');
  banner.classList.add('show');
  banner.setAttribute('aria-hidden', 'false');

  drawNavRoute();
  if (userLocation) {
    setNavUserMarker(userLocation);
    updateNavStats();
    frameRoute();
  }

  // Continuous position updates drive the live distance/heading + follow camera.
  if (navState.watchId == null && navigator.geolocation) {
    navState.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const first = !userLocation;
        onNavPosition([pos.coords.longitude, pos.coords.latitude]);
        if (first) frameRoute(); // got our first fix after starting
      },
      () => showMapToast('Location unavailable for navigation'),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 }
    );
  }
}

function startDirections(target) {
  if (!target) return;
  if (userLocation) {
    startNavigation(target);
  } else if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLocation = [pos.coords.longitude, pos.coords.latitude];
        startNavigation(target);
      },
      () => showMapToast('Enable location access to get directions'),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  } else {
    showMapToast('Location is not available on this device');
  }
}

function endNavigation() {
  navState.active = false;
  navState.target = null;
  navState.arrived = false;
  stopNavHeading();
  if (navState.watchId != null) {
    navigator.geolocation.clearWatch(navState.watchId);
    navState.watchId = null;
  }
  if (navUserMarker) {
    navUserMarker.remove();
    navUserMarker = null;
  }
  ['nav-route-line', 'nav-route-casing'].forEach((id) => {
    if (map.getLayer(id)) map.removeLayer(id);
  });
  if (map.getSource('nav-route')) map.removeSource('nav-route');

  const banner = document.getElementById('nav-banner');
  banner.classList.remove('show');
  banner.setAttribute('aria-hidden', 'true');
  setRecenterVisible(false);
  document.body.classList.remove('navigating');

  // Bring the persistent panel back.
  restoreSheetFromNav();
}

function initNavigation() {
  const endBtn = document.getElementById('nav-end');
  const recenterBtn = document.getElementById('nav-recenter');
  if (endBtn) endBtn.addEventListener('click', endNavigation);
  if (recenterBtn) {
    recenterBtn.addEventListener('click', () => {
      navState.follow = true;
      setRecenterVisible(false);
      if (userLocation) map.easeTo({ center: userLocation, duration: 600 });
    });
  }

  // A manual drag/zoom during navigation suspends follow and offers recenter.
  const suspendFollow = (e) => {
    if (navState.active && navState.follow && e.originalEvent) {
      navState.follow = false;
      setRecenterVisible(true);
    }
  };
  map.on('dragstart', suspendFollow);
  map.on('rotatestart', suspendFollow);

  // Keep the heading arrow correct when the map rotates.
  map.on('rotate', () => { if (navState.active) updateNavStats(); });
}


// ===========================================================================
// Collapsible map tools — one button expands/collapses the whole tool stack.
// Defaults to expanded (all tools shown).
// ===========================================================================
function initToolsToggle() {
  const controls = document.getElementById('map-controls');
  const toggle = document.getElementById('tools-toggle');
  if (!controls || !toggle) return;

  toggle.addEventListener('click', () => {
    const collapsed = controls.classList.toggle('tools-collapsed');
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.setAttribute('aria-label', collapsed ? 'Show map tools' : 'Hide map tools');
    toggle.title = collapsed ? 'Show tools' : 'Hide tools';
    // Tidy up any open basemap dropdown when collapsing.
    if (collapsed) {
      const dropdown = document.getElementById('basemap-dropdown');
      if (dropdown) dropdown.classList.remove('show');
    }
  });
}


// ===========================================================================
// Search — filter the points by name; results render in the persistent panel
// with each location's icon, name, and live distance from the current location.
// ===========================================================================
function getSearchQuery() {
  const input = document.getElementById('search-input');
  return input ? input.value.trim() : '';
}

// Build the sorted, filtered list of locations for a query (shared by the
// mobile sheet and the desktop side panel).
function buildSearchItems(query) {
  const features = (cachedGeoJSON && cachedGeoJSON.features) || [];
  const q = query.toLowerCase();
  const items = features
    .map((f) => ({
      name: f.properties.name || 'Unnamed location',
      sym: f.properties.sym || 'default',
      coords: f.geometry.coordinates,
      props: f.properties,
      dist: userLocation ? haversineMiles(userLocation, f.geometry.coordinates) : null
    }))
    .filter((i) => !q || i.name.toLowerCase().includes(q));
  // Nearest first when we know the user's location, otherwise alphabetical.
  items.sort((a, b) => (userLocation ? a.dist - b.dist : a.name.localeCompare(b.name)));
  return items;
}

// A single result row: icon + name + distance.
function makeResultRow(item, onSelect) {
  const row = document.createElement('button');
  row.className = 'search-result';

  const img = document.createElement('img');
  img.className = 'search-result-icon';
  img.alt = '';
  img.loading = 'lazy';
  img.onerror = () => {
    img.onerror = null;
    img.src = './images/default.png';
  };
  img.src = `./images/${encodeURIComponent(item.sym)}.png`;

  const name = document.createElement('div');
  name.className = 'search-result-text';
  name.textContent = item.name;

  const dist = document.createElement('div');
  dist.className = 'search-result-dist';
  dist.textContent = item.dist != null ? formatMiles(item.dist) : '—';

  row.append(img, name, dist);
  row.addEventListener('click', () => onSelect(item));
  return row;
}

// Render results into a container with a given selection handler.
function renderResultsInto(container, query, onSelect) {
  if (!container) return;
  container.innerHTML = '';
  const features = (cachedGeoJSON && cachedGeoJSON.features) || [];
  if (!features.length) {
    const msg = document.createElement('div');
    msg.className = 'search-empty';
    msg.textContent = 'Locations are still loading…';
    container.appendChild(msg);
    return;
  }
  const items = buildSearchItems(query);
  if (!items.length) {
    const msg = document.createElement('div');
    msg.className = 'search-empty';
    msg.textContent = 'No matching locations';
    container.appendChild(msg);
    return;
  }
  items.forEach((item) => container.appendChild(makeResultRow(item, onSelect)));
}

// Mobile: results in the bottom sheet; selection opens the detail card.
function renderSearchResults(query) {
  renderResultsInto(document.getElementById('search-results'), query, selectSearchResult);
}

// Desktop: results in the left side panel; selection opens the map popup.
function renderDesktopResults(query) {
  renderResultsInto(document.getElementById('desktop-search-results'), query, selectDesktopResult);
}

// Desktop: tapping a result shows the same glass popover a pin tap would.
function selectDesktopResult(item) {
  const coords = item.coords.slice();
  const props = { ...item.props };
  updatePinSelection(props.name);
  const elevation = map.queryTerrainElevation(coords, { exaggerated: false });
  props.elevation = elevation !== null ? Math.round(elevation * 3.28084) : props.elevation;
  openDesktopPopup(props, coords);
}

function initDesktopSearch() {
  const input = document.getElementById('desktop-search-input');
  const clear = document.getElementById('desktop-search-clear');
  if (!input) return;
  const updateClear = () => {
    if (clear) clear.style.display = input.value ? 'flex' : 'none';
  };
  input.addEventListener('focus', () => primeUserLocation());
  input.addEventListener('input', () => {
    updateClear();
    renderDesktopResults(input.value.trim());
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.value = '';
      updateClear();
      renderDesktopResults('');
    }
  });
  if (clear) {
    clear.addEventListener('click', () => {
      input.value = '';
      updateClear();
      renderDesktopResults('');
      input.focus();
    });
  }
  renderDesktopResults('');
}

function selectSearchResult(item) {
  const input = document.getElementById('search-input');
  if (input) input.blur(); // dismiss the keyboard

  const coords = item.coords.slice();
  const props = { ...item.props };

  // Open the location card right away (panel reduces to mid height). This
  // mirrors what the pin-tap handler does.
  updatePinSelection(props.name);
  const elevation = map.queryTerrainElevation(coords, { exaggerated: false });
  props.elevation = elevation !== null ? Math.round(elevation * 3.28084) : props.elevation;
  openMobileSheet(props, coords);

  // Zoom in so the point sits unclustered, and pad the bottom by the panel's
  // visible height (at the mid detent) so the pin clears the panel.
  const bottomPad = Math.max(0, sheet.height - sheet.detents.half);
  map.flyTo({
    center: coords,
    zoom: Math.max(map.getZoom(), 15),
    padding: { top: 0, right: 0, bottom: bottomPad, left: 0 },
    duration: 800,
    essential: true
  });
}

function updateSearchClear() {
  const input = document.getElementById('search-input');
  const clear = document.getElementById('search-clear');
  // Inline display so it shows only when there's text, regardless of CSS.
  if (clear && input) clear.style.display = input.value ? 'flex' : 'none';
}

function initSearch() {
  const input = document.getElementById('search-input');
  const clear = document.getElementById('search-clear');
  if (!input) return;

  // Focusing the field reveals results and expands the panel to full height.
  input.addEventListener('focus', () => {
    primeUserLocation();
    showSheetBrowse('full');
    updateSearchClear();
    renderSearchResults(getSearchQuery());
  });

  input.addEventListener('input', () => {
    updateSearchClear();
    renderSearchResults(getSearchQuery());
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.value = '';
      updateSearchClear();
      renderSearchResults('');
      input.blur();
    }
  });

  if (clear) {
    clear.addEventListener('click', () => {
      input.value = '';
      updateSearchClear();
      renderSearchResults('');
      input.focus();
    });
  }
}
