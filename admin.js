// Admin credentials (in production, use proper authentication)
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'glamis2025'
};

// Mapbox configuration
mapboxgl.accessToken = 'pk.eyJ1IjoiYWV2ZWxhbmQiLCJhIjoiY2o4b3IzeGF5MDcyZzMzcnNqcTR5bXd4OCJ9.5FnPH3C-4gGgjSLaluFA8Q';

let adminMap;
let currentPoints = [];
let selectedPoint = null;
let isAddingPoint = false;

// Authentication
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('admin-interface').style.display = 'flex';
        initializeAdmin();
    } else {
        document.getElementById('login-error').textContent = 'Invalid credentials';
    }
});

function logout() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('admin-interface').style.display = 'none';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('login-error').textContent = '';
}

// Initialize admin interface
function initializeAdmin() {
    // Initialize map
    adminMap = new mapboxgl.Map({
        container: 'admin-map',
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [-115.0, 33.0],
        zoom: 11
    });

    adminMap.on('load', () => {
        // Add terrain
        adminMap.addSource('mapbox-dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.terrain-rgb'
        });
        adminMap.setTerrain({ source: 'mapbox-dem', exaggeration: 1 });

        // Load existing points
        loadPoints();

        // Add click handler for adding new points
        adminMap.on('click', (e) => {
            if (isAddingPoint) {
                addNewPoint(e.lngLat);
            }
        });
    });
}

// Load existing points from tileset
async function loadPoints() {
    try {
        // Add the existing tileset source
        adminMap.addSource('glamis-points', {
            type: 'vector',
            url: 'mapbox://aeveland.0agz43gz'
        });

        // Add layer for visualization
        adminMap.addLayer({
            id: 'admin-points-layer',
            type: 'circle',
            source: 'glamis-points',
            'source-layer': 'waypoints',
            paint: {
                'circle-radius': 8,
                'circle-color': '#007AFF',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff'
            }
        });

        // Add labels
        adminMap.addLayer({
            id: 'admin-labels-layer',
            type: 'symbol',
            source: 'glamis-points',
            'source-layer': 'waypoints',
            layout: {
                'text-field': ['get', 'name'],
                'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                'text-size': 12,
                'text-offset': [0, 1.5],
                'text-anchor': 'top'
            },
            paint: {
                'text-color': '#fff',
                'text-halo-color': '#000',
                'text-halo-width': 1.5
            }
        });

        // Handle point clicks
        adminMap.on('click', 'admin-points-layer', (e) => {
            if (!isAddingPoint) {
                selectPoint(e.features[0]);
            }
        });

        // Load points into sidebar
        loadPointsList();
        
    } catch (error) {
        showStatus('Error loading points: ' + error.message, 'error');
    }
}

// Load points list in sidebar
function loadPointsList() {
    // Query all features from the tileset
    adminMap.on('data', (e) => {
        if (e.sourceId === 'glamis-points' && e.isSourceLoaded) {
            const features = adminMap.querySourceFeatures('glamis-points', {
                sourceLayer: 'waypoints'
            });
            
            currentPoints = features;
            renderPointsList();
        }
    });
}

// Render points list in sidebar
function renderPointsList() {
    const pointList = document.getElementById('point-list');
    pointList.innerHTML = '';

    currentPoints.forEach((point, index) => {
        const props = point.properties;
        const coords = point.geometry.coordinates;
        
        const pointItem = document.createElement('div');
        pointItem.className = 'point-item';
        pointItem.dataset.index = index;
        
        pointItem.innerHTML = `
            <div class="point-name">${props.name || 'Unnamed Point'}</div>
            <div class="point-coords">${coords[1].toFixed(6)}, ${coords[0].toFixed(6)}</div>
        `;
        
        pointItem.addEventListener('click', () => {
            selectPoint(point);
            // Fly to point on map
            adminMap.flyTo({
                center: coords,
                zoom: 15,
                duration: 1000
            });
        });
        
        pointList.appendChild(pointItem);
    });
}

// Select a point for editing
function selectPoint(feature) {
    selectedPoint = feature;
    const props = feature.properties;
    
    // Update UI
    document.querySelectorAll('.point-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    const selectedItem = document.querySelector(`[data-index="${currentPoints.indexOf(feature)}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }
    
    // Populate edit form
    document.getElementById('edit-name').value = props.name || '';
    document.getElementById('edit-description').value = props.desc || '';
    document.getElementById('edit-images').value = props.images || '';
    document.getElementById('edit-elevation').value = props.elevation || '';
    
    // Show edit form
    document.getElementById('edit-form').classList.add('show');
}

// Start adding a new point
function startAddingPoint() {
    isAddingPoint = true;
    adminMap.getCanvas().style.cursor = 'crosshair';
    
    // Add crosshair overlay
    const mapContainer = adminMap.getContainer();
    const crosshairOverlay = document.createElement('div');
    crosshairOverlay.className = 'crosshair-overlay';
    crosshairOverlay.innerHTML = '<span class="material-icons">add</span>';
    crosshairOverlay.id = 'crosshair-overlay';
    mapContainer.appendChild(crosshairOverlay);
    
    showStatus('Click on the map to place a new point, or press ESC to cancel', 'success');
    
    // Add escape key handler
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            cancelAddingPoint();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

// Cancel adding point
function cancelAddingPoint() {
    isAddingPoint = false;
    adminMap.getCanvas().style.cursor = '';
    
    // Remove crosshair overlay
    const overlay = document.getElementById('crosshair-overlay');
    if (overlay) {
        overlay.remove();
    }
    
    showStatus('Point placement cancelled', 'success');
}

// Add new point at clicked location
function addNewPoint(lngLat) {
    isAddingPoint = false;
    adminMap.getCanvas().style.cursor = '';
    
    // Remove crosshair overlay
    const overlay = document.getElementById('crosshair-overlay');
    if (overlay) {
        overlay.remove();
    }
    
    // Create new point feature
    const newPoint = {
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [lngLat.lng, lngLat.lat]
        },
        properties: {
            name: 'New Point',
            desc: 'Description for new point',
            images: '',
            elevation: 0
        }
    };
    
    // Add to current points and select for editing
    currentPoints.push(newPoint);
    renderPointsList();
    selectPoint(newPoint);
    
    showStatus('New point added. Edit the details below.', 'success');
}

// Add point from coordinate inputs
function addPointFromCoords() {
    const lat = parseFloat(document.getElementById('input-lat').value);
    const lng = parseFloat(document.getElementById('input-lng').value);
    
    // Validate coordinates
    if (isNaN(lat) || isNaN(lng)) {
        showStatus('Please enter valid latitude and longitude values', 'error');
        return;
    }
    
    if (lat < -90 || lat > 90) {
        showStatus('Latitude must be between -90 and 90', 'error');
        return;
    }
    
    if (lng < -180 || lng > 180) {
        showStatus('Longitude must be between -180 and 180', 'error');
        return;
    }
    
    // Create new point
    const newPoint = {
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [lng, lat]
        },
        properties: {
            name: 'New Point',
            desc: 'Description for new point',
            images: '',
            elevation: 0
        }
    };
    
    // Add to current points and select for editing
    currentPoints.push(newPoint);
    renderPointsList();
    selectPoint(newPoint);
    
    // Fly to the new point
    adminMap.flyTo({
        center: [lng, lat],
        zoom: 15,
        duration: 1000
    });
    
    // Clear input fields
    document.getElementById('input-lat').value = '';
    document.getElementById('input-lng').value = '';
    
    showStatus('New point added at coordinates. Edit the details below.', 'success');
}

// Save point changes
async function savePoint() {
    if (!selectedPoint) return;
    
    try {
        // Update point properties
        selectedPoint.properties.name = document.getElementById('edit-name').value;
        selectedPoint.properties.desc = document.getElementById('edit-description').value;
        selectedPoint.properties.images = document.getElementById('edit-images').value;
        selectedPoint.properties.elevation = document.getElementById('edit-elevation').value;
        
        // In a real implementation, you would upload the changes to Mapbox
        // For now, we'll simulate the save
        showStatus('Point saved successfully! (Note: This is a demo - changes are not persisted)', 'success');
        
        // Update the points list
        renderPointsList();
        
        // Hide edit form
        cancelEdit();
        
    } catch (error) {
        showStatus('Error saving point: ' + error.message, 'error');
    }
}

// Cancel editing
function cancelEdit() {
    selectedPoint = null;
    document.getElementById('edit-form').classList.remove('show');
    document.querySelectorAll('.point-item').forEach(item => {
        item.classList.remove('selected');
    });
}

// Delete point
async function deletePoint() {
    if (!selectedPoint) return;
    
    if (confirm('Are you sure you want to delete this point?')) {
        try {
            // Remove from current points array
            const index = currentPoints.indexOf(selectedPoint);
            if (index > -1) {
                currentPoints.splice(index, 1);
            }
            
            // In a real implementation, you would delete from Mapbox tileset
            showStatus('Point deleted successfully! (Note: This is a demo - changes are not persisted)', 'success');
            
            // Update UI
            renderPointsList();
            cancelEdit();
            
        } catch (error) {
            showStatus('Error deleting point: ' + error.message, 'error');
        }
    }
}

// Show status message
function showStatus(message, type) {
    const statusDiv = document.getElementById('status-message');
    statusDiv.innerHTML = `<div class="status-message status-${type}">${message}</div>`;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusDiv.innerHTML = '';
    }, 5000);
}

// Export data functionality (bonus feature)
function exportData() {
    const dataStr = JSON.stringify({
        type: 'FeatureCollection',
        features: currentPoints
    }, null, 2);
    
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'glamis-points.geojson';
    link.click();
    
    URL.revokeObjectURL(url);
}

// Import data functionality (bonus feature)
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.features) {
                currentPoints = data.features;
                renderPointsList();
                showStatus('Data imported successfully!', 'success');
            }
        } catch (error) {
            showStatus('Error importing data: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
}
