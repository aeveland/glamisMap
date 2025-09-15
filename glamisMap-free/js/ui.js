/**
 * UI utilities for Glamis Map clustering
 * Handles tooltips and interactive elements
 */

/**
 * Initialize cluster tooltips for desktop hover
 * @param {mapboxgl.Map} map - The Mapbox GL JS map instance
 */
function initializeClusterTooltips(map) {
  let tooltip = null;
  let isTouch = false;

  // Detect if device supports touch
  const checkTouch = () => {
    isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  };
  
  checkTouch();
  window.addEventListener('resize', checkTouch);

  // Mouse enter handler for clusters
  map.on('mouseenter', 'clusters', (e) => {
    // Skip on touch devices
    if (isTouch) return;

    const feature = e.features[0];
    const count = feature.properties.point_count;
    
    // Create Shoelace tooltip if it doesn't exist
    if (!tooltip) {
      tooltip = document.createElement('sl-tooltip');
      tooltip.setAttribute('placement', 'top');
      tooltip.setAttribute('distance', '8');
      document.body.appendChild(tooltip);
    }

    // Set tooltip content and position
    tooltip.content = `Cluster with ${count} location${count !== 1 ? 's' : ''}`;
    
    // Position tooltip at cursor
    const updateTooltipPosition = (event) => {
      if (tooltip) {
        tooltip.style.left = `${event.clientX}px`;
        tooltip.style.top = `${event.clientY - 40}px`;
        tooltip.style.position = 'fixed';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.zIndex = '9999';
      }
    };

    updateTooltipPosition(e.originalEvent);
    
    // Show tooltip
    tooltip.open = true;

    // Track mouse movement for tooltip positioning
    const mouseMoveHandler = (event) => updateTooltipPosition(event);
    map.getCanvas().addEventListener('mousemove', mouseMoveHandler);

    // Store handler for cleanup
    tooltip._mouseMoveHandler = mouseMoveHandler;
  });

  // Mouse leave handler for clusters
  map.on('mouseleave', 'clusters', () => {
    if (tooltip && !isTouch) {
      tooltip.open = false;
      
      // Clean up mouse move handler
      if (tooltip._mouseMoveHandler) {
        map.getCanvas().removeEventListener('mousemove', tooltip._mouseMoveHandler);
        delete tooltip._mouseMoveHandler;
      }
    }
  });

  // Change cursor on hover
  map.on('mouseenter', 'clusters', () => {
    if (!isTouch) {
      map.getCanvas().style.cursor = 'pointer';
    }
  });

  map.on('mouseleave', 'clusters', () => {
    map.getCanvas().style.cursor = '';
  });
}

/**
 * Initialize keyboard navigation for clusters
 * @param {mapboxgl.Map} map - The Mapbox GL JS map instance
 */
function initializeClusterKeyboardNavigation(map) {
  // Track focused cluster
  let focusedCluster = null;
  let clusterElements = [];

  // Create invisible focusable elements for clusters
  const updateClusterFocusElements = () => {
    // Remove existing elements
    clusterElements.forEach(el => el.remove());
    clusterElements = [];

    // Get current clusters
    const clusters = map.queryRenderedFeatures({ layers: ['clusters'] });
    
    clusters.forEach((cluster, index) => {
      const coords = cluster.geometry.coordinates;
      const point = map.project(coords);
      const count = cluster.properties.point_count;
      
      // Create focusable element
      const focusElement = document.createElement('button');
      focusElement.className = 'cluster-focus-target';
      focusElement.style.position = 'absolute';
      focusElement.style.left = `${point.x - 20}px`;
      focusElement.style.top = `${point.y - 20}px`;
      focusElement.style.width = '40px';
      focusElement.style.height = '40px';
      focusElement.style.background = 'transparent';
      focusElement.style.border = '2px solid transparent';
      focusElement.style.borderRadius = '50%';
      focusElement.style.cursor = 'pointer';
      focusElement.style.zIndex = '1000';
      
      // Accessibility attributes
      focusElement.setAttribute('aria-label', `Cluster with ${count} location${count !== 1 ? 's' : ''}. Press Enter or Space to zoom in.`);
      focusElement.setAttribute('tabindex', '0');
      focusElement.setAttribute('data-cluster-id', cluster.properties.cluster_id);
      focusElement.setAttribute('data-coordinates', JSON.stringify(coords));
      
      // Focus styles
      focusElement.addEventListener('focus', () => {
        focusElement.style.borderColor = '#007AFF';
        focusElement.style.outline = '2px solid #007AFF';
        focusElement.style.outlineOffset = '2px';
        focusedCluster = cluster;
      });
      
      focusElement.addEventListener('blur', () => {
        focusElement.style.borderColor = 'transparent';
        focusElement.style.outline = 'none';
        focusedCluster = null;
      });
      
      // Keyboard interaction
      focusElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          // Simulate click event for cluster interaction
          const mockEvent = {
            point: map.project(coords),
            originalEvent: e
          };
          handleClusterInteraction(map, mockEvent);
        }
      });
      
      // Click interaction
      focusElement.addEventListener('click', (e) => {
        const mockEvent = {
          point: map.project(coords),
          originalEvent: e
        };
        handleClusterInteraction(map, mockEvent);
      });
      
      map.getContainer().appendChild(focusElement);
      clusterElements.push(focusElement);
    });
  };

  // Update cluster focus elements when map moves or zooms
  map.on('moveend', updateClusterFocusElements);
  map.on('zoomend', updateClusterFocusElements);
  map.on('sourcedata', (e) => {
    if (e.sourceId === 'glamis-points-clustered' && e.isSourceLoaded) {
      setTimeout(updateClusterFocusElements, 100);
    }
  });

  // Initial update
  setTimeout(updateClusterFocusElements, 1000);
}

// handleClusterInteraction function will be available from map.js
