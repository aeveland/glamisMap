mapboxgl.accessToken = 'pk.eyJ1IjoiYWV2ZWxhbmQiLCJhIjoiY2o4b3IzeGF5MDcyZzMzcnNqcTR5bXd4OCJ9.5FnPH3C-4gGgjSLaluFA8Q';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/satellite-streets-v12',
  center: [-115.0, 33.0],
  zoom: 11
});

map.on('load', () => {
  map.addSource('glamis-points', {
    type: 'vector',
    url: 'mapbox://aeveland.dhg6g95p'
  });

  // Load both default and selected icons
  map.loadImage('./images/default.png', (error, defaultImage) => {
    if (error) throw error;
    if (!map.hasImage('pin-default')) {
      map.addImage('pin-default', defaultImage);
    }

    map.loadImage('./images/selected.png', (error, selectedImage) => {
      if (error) throw error;
      if (!map.hasImage('pin-selected')) {
        map.addImage('pin-selected', selectedImage);
      }

      // Add the layer
      map.addLayer({
        id: 'glamis-points-layer',
        type: 'symbol',
        source: 'glamis-points',
        'source-layer': 'waypoints',
        layout: {
          'icon-image': ['case',
            ['==', ['get', 'selected'], true], 'pin-selected',
            'pin-default'
          ],
          'icon-size': 0.7,
          'icon-allow-overlap': true
        }
      });

      let selectedId = null;

      map.on('click', 'glamis-points-layer', (e) => {
        const feature = e.features[0];
        const id = feature.id;

        // Unset previously selected
        if (selectedId !== null) {
          map.setFeatureState(
            { source: 'glamis-points', sourceLayer: 'waypoints', id: selectedId },
            { selected: false }
          );
        }

        // Set newly selected
        map.setFeatureState(
          { source: 'glamis-points', sourceLayer: 'waypoints', id },
          { selected: true }
        );
        selectedId = id;

        // Show popup
        const coords = feature.geometry.coordinates.slice();
        const props = feature.properties;

        const imageTag = props.image_url
          ? `<img src="${props.image_url}" alt="" style="width:100%;border-radius:8px;margin-bottom:8px;" />`
          : '';

        const popupHTML = `
          <sl-card style="width: 240px; padding: 0;">
            ${imageTag}
            <div style="padding: 12px;">
              <h3 style="margin: 0 0 6px 0; font-size: 1rem;">${props.name || 'Unnamed'}</h3>
              <p style="margin: 0; font-size: 0.875rem;">${props.desc || 'No info available'}</p>
            </div>
          </sl-card>
        `;

        new mapboxgl.Popup({ offset: 15 })
          .setLngLat(coords)
          .setHTML(popupHTML)
          .addTo(map);
      });
    });
  });
});

