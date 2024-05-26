import React, {useEffect, useRef} from 'react';

import Head from 'next/head';

import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import styles from './styles.module.css';
import baseMapStyle from './baseMapStyle.json';
import { Protocol } from 'pmtiles';


export default function Map() {

    useEffect(() => {
      let protocol = new Protocol();
      maplibregl.addProtocol("pmtiles", protocol.tile);
      return () => {
        maplibregl.removeProtocol("pmtiles");
      }
    }, []);
  
    const mapContainerRef = useRef();
  
    useEffect(() => {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: baseMapStyle,
        center: [20, -25],
        zoom: 4
      });
  
      fetch('https://t9iixc9z74.execute-api.af-south-1.amazonaws.com/cog/tilejson.json?url=https://peterm790.s3.af-south-1.amazonaws.com/t2m_GFS.tif')
      .then(response => response.json())
      .then(tilejson => {
        // Extract relevant information from TileJSON
        const { tiles, minzoom, maxzoom } = tilejson;
    
        // Add XYZ tile layer to the map
        map.on('load', function () {
          map.addLayer({
            id: 'xyz-tile-layer',
            type: 'raster',
            source: {
              type: 'raster',
              tiles: tiles,
              tileSize: 256,
            },
            minzoom: 0,
            maxzoom: 20,
            paint: {
              'raster-opacity': 0.55, // Set the opacity value (0.0 to 1.0)
            },
          },'physical_line_stream');
        });
      })
      .catch(error => console.error('Error fetching tilejson.json:', error));
  
      map.addControl(new maplibregl.NavigationControl(), 'top-right');
  
      new maplibregl.Marker({color: "#FF0000"})
        .setLngLat([18,-35])
        .addTo(map);
  
      return () => {
        map.remove();
      }
  
    }, []);
  
    return (
      <>
        <Head>
          <title>Pete's Forecast</title> {/* Set your page title here */}
        </Head>
        <div className={styles.mapwrap}>
          <div ref={mapContainerRef} className={styles.map}/>
        </div>
      </>
    );
  }