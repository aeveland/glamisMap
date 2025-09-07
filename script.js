mapboxgl.accessToken = 'pk.eyJ1IjoiYWV2ZWxhbmQiLCJhIjoiY2o4b3IzeGF5MDcyZzMzcnNqcTR5bXd4OCJ9.5FnPH3C-4gGgjSLaluFA8Q';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/satellite-streets-v12',
  center: [-115.0, 33.0],
  zoom: 11,
  // Mobile-friendly map options
  touchZoomRotate: true,
  touchPitch: false, // Disable pitch on mobile for better UX
  dragRotate: false, // Disable rotation for simpler mobile interaction
  keyboard: false // Disable keyboard navigation on mobile
});

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
    'bottom': [0, -25],
    'bottom-left': [0, -25],
    'bottom-right': [0, -25],
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

    // Handle both click and touch events for better mobile support
    const handlePointInteraction = (e) => {
      const coords = e.features[0].geometry.coordinates.slice();
      const props = e.features[0].properties;

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
            <span class="coordinates-text">${coordsText}</span>
            <span class="material-icons copy-icon" onclick="copyCoordinates('${coordsText}', event)">content_copy</span>
            <div class="copied-feedback">Copied!</div>
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

      // Add popup after a slight delay to allow map panning to start
      setTimeout(() => {
        popup.setLngLat(coords).setHTML(popupHTML).addTo(map);
      }, 100);
    };

    map.on('click', 'glamis-points-layer', handlePointInteraction);
    map.on('touchend', 'glamis-points-layer', handlePointInteraction);

    // Add cursor pointer for interactive elements
    map.on('mouseenter', 'glamis-points-layer', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'glamis-points-layer', () => {
      map.getCanvas().style.cursor = '';
    });
  });
});

// Global function to close popup (mobile-friendly)
function closePopup() {
  popup.remove();
}

// Copy coordinates to clipboard
async function copyCoordinates(coordsText, event) {
  event.stopPropagation();
  
  try {
    await navigator.clipboard.writeText(coordsText);
    
    // Show feedback
    const feedback = event.target.parentElement.querySelector('.copied-feedback');
    feedback.classList.add('show');
    
    // Hide feedback after 2 seconds
    setTimeout(() => {
      feedback.classList.remove('show');
    }, 2000);
    
  } catch (err) {
    console.error('Failed to copy coordinates:', err);
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = coordsText;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    
    // Show feedback
    const feedback = event.target.parentElement.querySelector('.copied-feedback');
    feedback.classList.add('show');
    setTimeout(() => {
      feedback.classList.remove('show');
    }, 2000);
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
};

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
