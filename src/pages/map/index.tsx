import React, { useEffect, useRef } from 'react';
import Head from 'next/head';
import maplibregl, { Map as MaplibreMap, NavigationControl, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import styles from './styles.module.css';

import baseMapStyle from './basemapstyle.json';
import { Protocol } from 'pmtiles';

const Map: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);

    return () => {
      maplibregl.removeProtocol("pmtiles");
    };
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map: MaplibreMap = new maplibregl.Map({
      container: mapContainerRef.current,
      style: baseMapStyle as maplibregl.StyleSpecification,
      center: [20, -25],
      zoom: 4
    });

    fetch('https://t9iixc9z74.execute-api.af-south-1.amazonaws.com/cog/tilejson.json?url=https://peterm790.s3.af-south-1.amazonaws.com/t2m_GFS.tif')
      .then(response => response.json())
      .then(tilejson => {
        const { tiles } = tilejson; // We'll ignore minzoom and maxzoom here

        map.on('load', () => {
          map.addLayer({
            id: 'xyz-tile-layer',
            type: 'raster',
            source: {
              type: 'raster',
              tiles: tiles,
              tileSize: 256,
            },
            minzoom: 0, // Set manually to 0
            maxzoom: 20, // Set manually to 20
            paint: {
              'raster-opacity': 0.55,
            },
          }, 'physical_line_stream');
        });
      })
      .catch(error => console.error('Error fetching tilejson.json:', error));

    map.addControl(new NavigationControl(), 'top-right');

    new Marker({ color: "#FF0000" })
      .setLngLat([18, -35])
      .addTo(map);

    return () => {
      map.remove();
    };
  }, []);

  return (
    <>
      <Head>
        <title>Pete&apos;s Forecast</title>
      </Head>
      <div className={styles.mapwrap}>
        <div ref={mapContainerRef} className={styles.map} />
        <div className={styles.title}>Pete&apos;s Forecast v0.1</div>
      </div>
    </>
  );
};

export default Map;