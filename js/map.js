/**
 * Map clustering functionality for Glamis Map
 * Handles clustered point display with accessibility support
 */

/**
 * Initialize clustered map layers
 * @param {mapboxgl.Map} map - The Mapbox GL JS map instance
 */
function initializeClusterLayers(map) {
  // Remove existing non-clustered source and layers
  if (map.getLayer('glamis-points-layer')) map.removeLayer('glamis-points-layer');
  if (map.getLayer('glamis-labels-layer')) map.removeLayer('glamis-labels-layer');
  if (map.getSource('glamis-points')) map.removeSource('glamis-points');

  // Add clustered source
  map.addSource('glamis-points-clustered', {
    type: 'vector',
    url: 'mapbox://aeveland.0agz43gz',
    cluster: true,
    clusterMaxZoom: 14, // Max zoom to cluster points on
    clusterRadius: 50 // Radius of each cluster when clustering points (defaults to 50)
  });

  // Add cluster circles layer
  map.addLayer({
    id: 'clusters',
    type: 'circle',
    source: 'glamis-points-clustered',
    'source-layer': 'POI-8oc448',
    filter: ['has', 'point_count'],
    paint: {
      // Use step expressions to implement three types of circles:
      // * Blue, 20px circles when point count is less than 100
      // * Yellow, 30px circles when point count is between 100 and 750
      // * Pink, 40px circles when point count is greater than or equal to 750
      'circle-color': [
        'step',
        ['get', 'point_count'],
        'rgba(255, 255, 255, 0.8)',
        100,
        'rgba(255, 255, 255, 0.9)',
        750,
        'rgba(255, 255, 255, 1.0)'
      ],
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        20,
        100,
        30,
        750,
        40
      ],
      'circle-stroke-width': 2,
      'circle-stroke-color': 'rgba(255, 255, 255, 0.6)',
      'circle-blur': 0.1
    }
  });

  // Add cluster count labels
  map.addLayer({
    id: 'cluster-count',
    type: 'symbol',
    source: 'glamis-points-clustered',
    'source-layer': 'POI-8oc448',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
      'text-size': 12
    },
    paint: {
      'text-color': '#000',
      'text-halo-color': '#fff',
      'text-halo-width': 2
    }
  });

  // Add unclustered points layer
  map.addLayer({
    id: 'unclustered-point',
    type: 'symbol',
    source: 'glamis-points-clustered',
    'source-layer': 'POI-8oc448',
    filter: ['!', ['has', 'point_count']],
    layout: {
      'icon-image': 'custom-pin',
      'icon-size': 0.7,
      'icon-allow-overlap': true
    }
  });

  // Add unclustered point labels
  map.addLayer({
    id: 'unclustered-labels',
    type: 'symbol',
    source: 'glamis-points-clustered',
    'source-layer': 'POI-8oc448',
    filter: ['!', ['has', 'point_count']],
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
}

/**
 * Handle cluster click/keyboard interaction
 * @param {mapboxgl.Map} map - The Mapbox GL JS map instance
 * @param {Event} e - The click or keyboard event
 */
function handleClusterInteraction(map, e) {
  const features = map.queryRenderedFeatures(e.point, {
    layers: ['clusters']
  });

  if (!features.length) return;

  const clusterId = features[0].properties.cluster_id;
  const pointCount = features[0].properties.point_count;
  const source = map.getSource('glamis-points-clustered');

  // Get the expansion zoom level
  source.getClusterExpansionZoom(clusterId, (err, zoom) => {
    if (err) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Animate to the cluster expansion zoom and center
    map.easeTo({
      center: features[0].geometry.coordinates,
      zoom: zoom,
      duration: prefersReducedMotion ? 0 : 800,
      essential: true
    });

    // Announce the action for screen readers
    announceToScreenReader(`Zoomed to reveal ${pointCount} locations`);
  });
}

/**
 * Get cluster tooltip text
 * @param {Object} feature - The cluster feature
 * @returns {string} Tooltip text
 */
function getClusterTooltipText(feature) {
  const count = feature.properties.point_count;
  return `Cluster with ${count} location${count !== 1 ? 's' : ''}`;
}

/**
 * Announce text to screen readers using a live region
 * @param {string} message - Message to announce
 */
function announceToScreenReader(message) {
  // Create or get existing live region
  let liveRegion = document.getElementById('map-announcements');
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'map-announcements';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.style.position = 'absolute';
    liveRegion.style.left = '-10000px';
    liveRegion.style.width = '1px';
    liveRegion.style.height = '1px';
    liveRegion.style.overflow = 'hidden';
    document.body.appendChild(liveRegion);
  }

  // Clear and set new message
  liveRegion.textContent = '';
  setTimeout(() => {
    liveRegion.textContent = message;
  }, 100);
}
