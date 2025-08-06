mapboxgl.accessToken = 'pk.eyJ1IjoiYWV2ZWxhbmQiLCJhIjoiY2o4b3IzeGF5MDcyZzMzcnNqcTR5bXd4OCJ9.5FnPH3C-4gGgjSLaluFA8Q';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/satellite-streets-v12',
  center: [-115.0, 33.0],
  zoom: 11
});

const popup = new mapboxgl.Popup({ offset: 25, anchor: 'bottom', closeButton: false, closeOnClick: false });
map.on('load', () => {
  map.addSource('glamis-points', {
    type: 'vector',
    url: 'mapbox://aeveland.dhg6g95p'
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

      const imageTag = props.image_url ? `<img src="${props.image_url}" alt="" style="width:100%;border-radius:8px;margin-bottom:8px;" />` : '';

      

        const popupHTML = `
          <div class="glass-popup">
            <div class="glass-close-button" onclick="this.parentElement.parentElement.remove()">×</div>
            <div class="glass-title">${props.name}</div>
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
