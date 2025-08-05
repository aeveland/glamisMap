mapboxgl.accessToken = 'pk.eyJ1IjoiYWV2ZWxhbmQiLCJhIjoiY2xubnFmeGVvMDRjMjNwcGc4a2FhZHR6bSJ9.yKBBUSu0X0QyOh1uC3OMbA';
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/satellite-streets-v12',
  center: [-115.080667, 32.923333],
  zoom: 12
});

map.on('load', () => {
  map.addSource('glamis-points', {
    type: 'vector',
    url: 'mapbox://aeveland.dhg6g95p'
  });

  map.addLayer({
    id: 'glamis-pins',
    type: 'circle',
    source: 'glamis-points',
    'source-layer': 'waypoints', 
    paint: {
      'circle-radius': 6,
      'circle-color': '#ff0000'
    }
  });
});

// Map Controls
document.getElementById('zoom-in').onclick = () => map.zoomIn();
document.getElementById('zoom-out').onclick = () => map.zoomOut();
document.getElementById('reset-view').onclick = () => {
  map.flyTo({
    center: [-115.080667, 32.923333],
    zoom: 12
  });
};
