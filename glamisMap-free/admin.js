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
let localGeoJSON = null;
let isEditingLocal = false;

// Initialize on page load (no authentication needed for local use)
document.addEventListener('DOMContentLoaded', () => {
    initializeAdmin();
});

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

        // Add click handler for adding new points
        adminMap.on('click', (e) => {
            if (isAddingPoint) {
                addNewPoint(e.lngLat);
            }
        });

        showStatus('Admin interface loaded. Load a GeoJSON file to start editing.', 'success');
    });
}

// Load local GeoJSON file
function loadLocalGeoJSON() {
    document.getElementById('geojson-file-input').click();
}

// Handle file load
function handleFileLoad(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            localGeoJSON = JSON.parse(e.target.result);
            isEditingLocal = true;
            
            // Clear existing layers
            if (adminMap.getLayer('local-points-layer')) {
                adminMap.removeLayer('local-points-layer');
            }
            if (adminMap.getLayer('local-labels-layer')) {
                adminMap.removeLayer('local-labels-layer');
            }
            if (adminMap.getSource('local-geojson')) {
                adminMap.removeSource('local-geojson');
            }
            
            // Add local GeoJSON source
            adminMap.addSource('local-geojson', {
                type: 'geojson',
                data: localGeoJSON
            });
            
            // Add visualization layers
            adminMap.addLayer({
                id: 'local-points-layer',
                type: 'circle',
                source: 'local-geojson',
                paint: {
                    'circle-radius': 8,
                    'circle-color': '#28a745',
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff'
                }
            });
            
            adminMap.addLayer({
                id: 'local-labels-layer',
                type: 'symbol',
                source: 'local-geojson',
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
            adminMap.on('click', 'local-points-layer', (e) => {
                if (!isAddingPoint) {
                    selectLocalPoint(e.features[0]);
                }
            });
            
            // Update points list
            currentPoints = localGeoJSON.features;
            renderPointsList();
            
            // Fit map to data bounds
            if (localGeoJSON.features.length > 0) {
                const bounds = new mapboxgl.LngLatBounds();
                localGeoJSON.features.forEach(feature => {
                    bounds.extend(feature.geometry.coordinates);
                });
                adminMap.fitBounds(bounds, { padding: 50 });
            }
            
            showStatus(`Local GeoJSON loaded successfully! ${localGeoJSON.features.length} points loaded.`, 'success');
            
        } catch (error) {
            showStatus('Error loading GeoJSON file: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
}

// Select local point for editing
function selectLocalPoint(feature) {
    selectedPoint = feature;
    
    // Highlight selected point
    document.querySelectorAll('.point-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    const pointIndex = currentPoints.findIndex(p => 
        p.geometry.coordinates[0] === feature.geometry.coordinates[0] &&
        p.geometry.coordinates[1] === feature.geometry.coordinates[1] &&
        p.properties.name === feature.properties.name
    );
    
    if (pointIndex >= 0) {
        document.querySelectorAll('.point-item')[pointIndex]?.classList.add('selected');
    }
    
    // Populate edit form
    const props = feature.properties;
    document.getElementById('edit-name').value = props.name || '';
    document.getElementById('edit-description').value = props.desc || '';
    document.getElementById('edit-images').value = props.images || '';
    
    // Show edit form and hide add point section
    document.getElementById('edit-form').classList.add('show');
    document.getElementById('add-point-section').style.display = 'none';
    
    // Fly to point
    adminMap.flyTo({
        center: feature.geometry.coordinates,
        zoom: 15
    });
}

// Download updated GeoJSON
function downloadGeoJSON() {
    if (!localGeoJSON) {
        showStatus('No local GeoJSON loaded. Please load a file first.', 'error');
        return;
    }
    
    const dataStr = JSON.stringify(localGeoJSON, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'glamis_tileset_updated.geojson';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showStatus('GeoJSON file downloaded! Replace the original file in your repository.', 'success');
}

// Render points list in sidebar (removed - no longer needed)
function renderPointsList() {
    // Points list section has been removed from the UI
    // This function is kept for compatibility but does nothing
}

// Start adding point mode
function startAddingPoint() {
    if (!isEditingLocal) {
        showStatus('Please load a GeoJSON file first.', 'error');
        return;
    }
    
    isAddingPoint = true;
    adminMap.getCanvas().style.cursor = 'crosshair';
    showStatus('Click on the map to add a new point. Click again to cancel.', 'success');
    
    // Add click handler to cancel
    const cancelHandler = () => {
        isAddingPoint = false;
        adminMap.getCanvas().style.cursor = '';
        showStatus('Add point mode cancelled.', 'success');
        adminMap.off('click', cancelHandler);
    };
    
    setTimeout(() => {
        adminMap.on('click', cancelHandler);
    }, 100);
}

// Add new point from map click
function addNewPoint(lngLat) {
    isAddingPoint = false;
    adminMap.getCanvas().style.cursor = '';
    
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
            sym: 'default'
        }
    };
    
    // Add to local GeoJSON
    localGeoJSON.features.push(newPoint);
    currentPoints = localGeoJSON.features;
    
    // Update the map source
    adminMap.getSource('local-geojson').setData(localGeoJSON);
    
    // Select the new point for editing
    selectLocalPoint(newPoint);
    renderPointsList();
    
    // Fly to the new point
    adminMap.flyTo({
        center: [lngLat.lng, lngLat.lat],
        zoom: 15,
        duration: 1000
    });
    
    showStatus('New point added. Edit the details below.', 'success');
}

// Add point from coordinates
function addPointFromCoords() {
    const lat = parseFloat(document.getElementById('input-lat').value);
    const lng = parseFloat(document.getElementById('input-lng').value);
    
    if (isNaN(lat) || isNaN(lng)) {
        showStatus('Please enter valid latitude and longitude values.', 'error');
        return;
    }
    
    if (!isEditingLocal) {
        showStatus('Please load a GeoJSON file first.', 'error');
        return;
    }
    
    addNewPoint({ lng, lat });
    
    // Clear input fields
    document.getElementById('input-lat').value = '';
    document.getElementById('input-lng').value = '';
}

// Save point changes
function savePoint() {
    if (!selectedPoint) return;
    
    try {
        // Update point properties
        selectedPoint.properties.name = document.getElementById('edit-name').value;
        selectedPoint.properties.desc = document.getElementById('edit-description').value;
        selectedPoint.properties.images = document.getElementById('edit-images').value;
        
        if (isEditingLocal && localGeoJSON) {
            // Update the local GeoJSON data
            const pointIndex = localGeoJSON.features.findIndex(p => 
                p.geometry.coordinates[0] === selectedPoint.geometry.coordinates[0] &&
                p.geometry.coordinates[1] === selectedPoint.geometry.coordinates[1]
            );
            
            if (pointIndex >= 0) {
                localGeoJSON.features[pointIndex] = selectedPoint;
            }
            
            // Update the map source
            adminMap.getSource('local-geojson').setData(localGeoJSON);
            
            showStatus('Point updated in local GeoJSON! Use "Download Updated GeoJSON" to save changes.', 'success');
        }
        
        // Update the points list
        renderPointsList();
        
        // Hide edit form and show add point section
        selectedPoint = null;
        document.getElementById('edit-form').classList.remove('show');
        document.getElementById('add-point-section').style.display = 'block';
        
    } catch (error) {
        showStatus('Error saving point: ' + error.message, 'error');
    }
}

// Cancel editing
function cancelEdit() {
    selectedPoint = null;
    document.getElementById('edit-form').classList.remove('show');
    document.getElementById('add-point-section').style.display = 'block';
    document.querySelectorAll('.point-item').forEach(item => {
        item.classList.remove('selected');
    });
}

// Delete point
function deletePoint() {
    if (!selectedPoint) return;
    
    if (confirm('Are you sure you want to delete this point?')) {
        try {
            if (isEditingLocal && localGeoJSON) {
                // Remove from local GeoJSON
                const geoIndex = localGeoJSON.features.findIndex(p => 
                    p.geometry.coordinates[0] === selectedPoint.geometry.coordinates[0] &&
                    p.geometry.coordinates[1] === selectedPoint.geometry.coordinates[1] &&
                    p.properties.name === selectedPoint.properties.name
                );
                
                if (geoIndex >= 0) {
                    localGeoJSON.features.splice(geoIndex, 1);
                }
                
                // Update current points
                currentPoints = localGeoJSON.features;
                
                // Update the map source
                adminMap.getSource('local-geojson').setData(localGeoJSON);
                
                showStatus('Point deleted from local GeoJSON! Use "Download Updated GeoJSON" to save changes.', 'success');
            }
            
            // Update the points list
            renderPointsList();
            
            // Hide edit form and show add point section
            selectedPoint = null;
            document.getElementById('edit-form').classList.remove('show');
            document.getElementById('add-point-section').style.display = 'block';
            
        } catch (error) {
            showStatus('Error deleting point: ' + error.message, 'error');
        }
    }
}

// Show status message
function showStatus(message, type) {
    const statusEl = document.getElementById('status-message');
    statusEl.textContent = message;
    statusEl.className = type;
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 5000);
    }
}
