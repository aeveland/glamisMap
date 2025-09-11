mapboxgl.accessToken = 'pk.eyJ1IjoiYWV2ZWxhbmQiLCJhIjoiY2o4b3IzeGF5MDcyZzMzcnNqcTR5bXd4OCJ9.5FnPH3C-4gGgjSLaluFA8Q';

// Debug: Test tileset access
console.log('🔑 Using Mapbox token:', mapboxgl.accessToken.substring(0, 20) + '...');
console.log('🗺️ Tileset ID: aeveland.0agz43gz');

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/satellite-streets-v12',
  center: [-115.08, 32.93],
  zoom: 11,
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

// Track selected pin
let selectedPinId = null;

map.on('load', () => {
  console.log('🚀 Map loaded, initializing points...');
  
  // Load both pin images
  map.loadImage('./images/default.png', (error, defaultImage) => {
    if (error) throw error;
    if (!map.hasImage('custom-pin')) {
      map.addImage('custom-pin', defaultImage);
    }
    
    map.loadImage('./images/selected.png', (error, selectedImage) => {
      if (error) throw error;
      if (!map.hasImage('selected-pin')) {
        map.addImage('selected-pin', selectedImage);
      }
      addPointsLayers();
    });
  });
});

// Function to update pin appearance
function updatePinSelection(newSelectedId) {
  console.log('Updating pin selection to:', newSelectedId);
  
  // Reset previous selected pin and labels
  if (selectedPinId !== null) {
    map.setFilter('glamis-points-selected', ['==', ['get', 'name'], '']);
    map.setFilter('glamis-labels-selected', ['==', ['get', 'name'], '']);
    map.setFilter('glamis-labels-default', ['!=', ['get', 'name'], selectedPinId]);
  }
  
  // Update selected pin and labels
  selectedPinId = newSelectedId;
  if (selectedPinId !== null) {
    map.setFilter('glamis-points-selected', ['==', ['get', 'name'], selectedPinId]);
    map.setFilter('glamis-labels-selected', ['==', ['get', 'name'], selectedPinId]);
    map.setFilter('glamis-labels-default', ['!=', ['get', 'name'], selectedPinId]);
    console.log('Set filter for selected pin:', selectedPinId);
  } else {
    // Show all default labels when no pin is selected
    map.setFilter('glamis-labels-default', null);
  }
}

// Function to setup map interactions
function setupMapInteractions() {
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
    
    // Pan map to center the clicked location with offset for popup
    const mapContainer = map.getContainer();
    const mapHeight = mapContainer.offsetHeight;
    const offsetY = mapHeight * 0.15; // Offset to account for popup height
    
    map.easeTo({
      center: coords,
      offset: [0, offsetY], // Shift center down to prevent popup cutoff
      duration: 800,
      essential: true
    });

    const images = props.images ? props.images.split(',') : [];
    const imageRow = images.map(url => `<img src="${url.trim()}" class="popup-image-thumb" onclick="openImageModal('${url.trim()}')" />`).join('');
    const imageHTML = images.length > 0 ? `<div class="popup-image-row">${imageRow}</div>` : '';

    const elevation = map.queryTerrainElevation(coords, { exaggerated: false });
    props.elevation = elevation !== null ? Math.round(elevation * 3.28084) : props.elevation;

    const lat = coords[1].toFixed(6);
    const lng = coords[0].toFixed(6);

    const coordsText = `${lat}, ${lng}`;
    
    const popupHTML = `
      <div class="glass-popup">
        <button class="popup-close-btn" onclick="closePopup()"></button>
        <div class="glass-title">${props.name}</div>
        ${imageHTML}
        <div class="glass-subtitle">
          <span class="material-icons subtitle-icon">place</span>
          Latitude / Longitude
        </div>
        <div class="glass-body glass-coordinates">
          <span class="coordinates-text" onclick="copyCoordinates('${coordsText}', event)">${coordsText}</span>
          <span class="copy-chip">copy</span>
        </div>
        <div class="glass-subtitle">
          <span class="material-icons subtitle-icon">terrain</span>
          Elevation
        </div>
        <div class="glass-body">${props.elevation || 'Unknown'} ft above sea level</div>
        <div class="glass-subtitle">
          <span class="material-icons subtitle-icon">info</span>
          Description
        </div>
        <div class="glass-body">${props.desc || 'No description available.'}</div>
      </div>
    `;

    popup.setLngLat(coords).setHTML(popupHTML).addTo(map);
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


// Copy coordinates to clipboard
async function copyCoordinates(coordsText, event) {
  event.stopPropagation();
  
  try {
    await navigator.clipboard.writeText(coordsText);
    
    // Show feedback by changing chip text
    const chip = event.target.parentElement.querySelector('.copy-chip');
    chip.textContent = 'copied!';
    chip.classList.add('copied');
    
    setTimeout(() => {
      chip.textContent = 'copy';
      chip.classList.remove('copied');
    }, 2000);
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
      
      // Re-add custom layers after style change
      map.once('style.load', () => {
        // Re-add terrain
        if (!map.getSource('mapbox-dem')) {
          map.addSource('mapbox-dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.terrain-rgb'
          });
        }
        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1 });
        
        // Re-add points layer
        map.loadImage('./images/default.png', (error, image) => {
          if (error) {
            console.warn('Could not load pin image, using default');
            addPointsLayers();
            return;
          }
          if (!map.hasImage('custom-pin')) {
            map.addImage('custom-pin', image);
          }
          addPointsLayers();
        });
      });
    });
  });
  
  // Set initial active state
  basemapOptions[currentBasemapIndex].classList.add('active');
};

// Function to add points layers
function addPointsLayers() {
  // Remove existing layers if they exist
  if (map.getLayer('glamis-labels-selected')) {
    map.removeLayer('glamis-labels-selected');
  }
  if (map.getLayer('glamis-labels-default')) {
    map.removeLayer('glamis-labels-default');
  }
  if (map.getLayer('glamis-points-selected')) {
    map.removeLayer('glamis-points-selected');
  }
  if (map.getLayer('glamis-points-layer')) {
    map.removeLayer('glamis-points-layer');
  }
  if (map.getSource('glamis-points')) {
    map.removeSource('glamis-points');
  }

  // Add source
  map.addSource('glamis-points', {
    type: 'vector',
    url: 'mapbox://aeveland.0agz43gz'
  });

  // Add default points layer
  map.addLayer({
    id: 'glamis-points-layer',
    type: 'symbol',
    source: 'glamis-points',
    'source-layer': 'POI-8oc448',
    layout: {
      'icon-image': 'custom-pin',
      'icon-size': 0.7,
      'icon-allow-overlap': true
    }
  });

  // Add selected points layer (initially hidden)
  map.addLayer({
    id: 'glamis-points-selected',
    type: 'symbol',
    source: 'glamis-points',
    'source-layer': 'POI-8oc448',
    layout: {
      'icon-image': 'selected-pin',
      'icon-size': 0.7,
      'icon-allow-overlap': true
    },
    filter: ['==', ['get', 'name'], ''] // Initially show no pins
  });

  // Add default labels layer (closer to pin)
  map.addLayer({
    id: 'glamis-labels-default',
    type: 'symbol',
    source: 'glamis-points',
    'source-layer': 'POI-8oc448',
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
    }
  });

  // Add selected labels layer (further from pin)
  map.addLayer({
    id: 'glamis-labels-selected',
    type: 'symbol',
    source: 'glamis-points',
    'source-layer': 'POI-8oc448',
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
      'text-offset': [0, 1.8],
      'text-anchor': 'top',
      'text-size': 12
    },
    paint: {
      'text-color': '#000',
      'text-halo-color': '#fff',
      'text-halo-width': 2
    },
    filter: ['==', ['get', 'name'], ''] // Initially show no labels
  });

  // Move selected points layer to top (above labels)
  map.moveLayer('glamis-points-selected');
  
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
  initDarkMode();
  initCompass();

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

  // Close popup when clicking outside on mobile
  map.on('click', (e) => {
    if (!e.defaultPrevented && popup.isOpen()) {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['glamis-points-layer']
      });
      if (features.length === 0) {
        popup.remove();
      }
    }
  });

  // Close modal when clicking outside the image
  document.getElementById('image-modal').addEventListener('click', (e) => {
    if (e.target.id === 'image-modal') {
      closeImageModal();
    }
  });
});
