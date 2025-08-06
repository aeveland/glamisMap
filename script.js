
mapboxgl.accessToken = 'pk.eyJ1IjoiYWV2ZWxhbmQiLCJhIjoiY2o4b3IzeGF5MDcyZzMzcnNqcTR5bXd4OCJ9.5FnPH3C-4gGgjSLaluFA8Q';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/satellite-streets-v12',
  center: [-115.0, 33.0],
  zoom: 11
});

let selectedFeatureId = null;

map.on('load', () => {
  map.addSource('glamis-points', {
    type: 'vector',
    url: 'mapbox://aeveland.dhg6g95p'
  });

  map.loadImage('https://yourusername.github.io/your-repo-name/images/default.png', (error, defaultIcon) => {
    if (error) throw error;

    map.loadImage('https://yourusername.github.io/your-repo-name/images/selected.png', (err, selectedIcon) => {
      if (err) throw err;

      if (!map.hasImage('default-icon')) map.addImage('default-icon', defaultIcon);
      if (!map.hasImage('selected-icon')) map.addImage('selected-icon', selectedIcon);

      map.addLayer({
        id: 'glamis-points-layer',
        type: 'symbol',
        source: 'glamis-points',
        'source-layer': 'waypoints',
        layout: {
          'icon-image': [
            'case',
            ['==', ['get', 'id'], ['literal', '']],
            'selected-icon',
            'default-icon'
          ],
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

        selectedFeatureId = props.id;

        map.setLayoutProperty('glamis-points-layer', 'icon-image', [
          'case',
          ['==', ['get', 'id'], selectedFeatureId],
          'selected-icon',
          'default-icon'
        ]);

        const popupHTML = `
          <div class="glass-popup">
            <div class="glass-title">${props.name}</div>
            <div class="glass-subtitle">Elevation</div>
            <div class="glass-body">${props.elevation || 'Unknown'} ft above sea level</div>
            <div class="glass-subtitle">Description</div>
            <div class="glass-body">${props.desc || 'No description available.'}</div>
          </div>
        `;

        new mapboxgl.Popup({ offset: 15 })
          .setLngLat(coords)
          .setHTML(popupHTML)
          .addTo(map);
      });
    });
  });
});
