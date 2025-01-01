import maplibregl from 'maplibre-gl';

export function addXYZTileLayer(map, url) {
  console.log("Adding XYZ Tile Layer");

  // Remove existing layer and source if they exist
  if (map.getLayer('xyz-tile-layer')) {
    map.removeLayer('xyz-tile-layer');
  }
  if (map.getSource('xyz-source')) {
    map.removeSource('xyz-source');
  }

  fetch(url)
    .then((response) => response.json())
    .then((tileJSON) => {
      console.log("TileJSON received:", tileJSON);

      map.addSource('xyz-source', {
        type: 'raster',
        tiles: tileJSON.tiles,
        tileSize: 256,
        'bounds': [-180, -90, 180, 90], // Covers entire world
      });

      map.addLayer({
        id: 'xyz-tile-layer',
        type: 'raster',
        source: 'xyz-source',
        minzoom: 0,
        maxzoom: 20,
        paint: {
          'raster-opacity': 1,
          'raster-resampling': 'linear'
        },
      }, 'physical_line_stream');

      console.log("XYZ Tile Layer added successfully");
    })
    .catch((error) => {
      console.error('Error fetching or adding XYZ tile layer:', error);
    });
}