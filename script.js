mapboxgl.accessToken = 'pk.eyJ1IjoiYWV2ZWxhbmQiLCJhIjoiY2o4b3IzeGF5MDcyZzMzcnNqcTR5bXd4OCJ9.5FnPH3C-4gGgjSLaluFA8Q'; // Replace with your real token

const map = new mapboxgl.Map({

  container: 'map',

  style: 'mapbox://styles/mapbox/outdoors-v12',

  center: [-115.0, 33.0],

  zoom: 11

});

map.on('load', () => {

  map.addSource('glamis-points', {

    type: 'vector',

    url: 'mapbox://aeveland.9f86lh98' // <-- Use your tileset ID

  });

  

  

  map.on('mouseenter', 'glamis-points-layer', () => {

    map.getCanvas().style.cursor = 'pointer';

  });

  map.on('mouseleave', 'glamis-points-layer', () => {

    map.getCanvas().style.cursor = '';

  });

});

map.on('click', 'glamis-points-layer', (e) => {
  const coords = e.features[0].geometry.coordinates.slice();
  const props = e.features[0].properties;

  const imageTag = props.image_url ? `<img src="\${props.image_url}" alt="" style="width:100%;border-radius:8px;margin-bottom:8px;" />` : '';

  const popupHTML = `
    <sl-card style="width: 240px; padding: 0;">
      \${imageTag}
      <div style="padding: 12px;">
        <h3 style="margin: 0 0 6px 0; font-size: 1rem;">\${props.name || 'Unnamed'}</h3>
        <p style="margin: 0; font-size: 0.875rem;">\${props.desc || ''}</p>
      </div>
    </sl-card>
  `;

  new mapboxgl.Popup({ offset: 15 })
    .setLngLat(coords)
    .setHTML(popupHTML)
    .addTo(map);
});

map.loadImage('pin.png', (error, image) => {
  if (error) throw error;
  if (!map.hasImage('custom-pin')) {
    map.addImage('custom-pin', image);
  }

  map.addLayer({
    id: 'glamis-points-layer',
    type: 'symbol',
    source: 'glamis-points',
    'source-layer': 'glamis_map', // replace with your tileset source layer name
    layout: {
      'icon-image': 'custom-pin',
      'icon-size': 0.5,
      'icon-allow-overlap': true
    }
  });
});