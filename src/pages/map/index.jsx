import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { Analytics } from "@vercel/analytics/react";

import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';

import { addXYZTileLayer } from '../../layers/rasterLayer';
//import { addTriangleLayer } from '../../layers/triangleLayer';
import windLayer from "../../layers/streamlines/windLayer";

import baseMapStyle from './basemapstyle.json';
import styles from './styles.module.css';


const Map = () => {
  console.log("Map component rendered");
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapInitialized, setMapInitialized] = useState(false);

  useEffect(() => {
    console.log("Setting up Protomaps protocol");
    let protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    return () => {
      maplibregl.removeProtocol("pmtiles");
    }
  }, []);

  useEffect(() => {
    console.log("Initializing map");
    if (!mapContainerRef.current || mapRef.current || mapInitialized) return;

    const initializeMap = (center) => {
      console.log("Creating map instance");
      mapRef.current = new maplibregl.Map({
        container: mapContainerRef.current,
        style: baseMapStyle,
        center: center,
        zoom: 2,
        minZoom: 2,
        maxZoom: 10
      });

      mapRef.current.on('load', () => {
        console.log("Map loaded");
        //addTriangleLayer(mapRef.current);
        addXYZTileLayer(mapRef.current, 'https://t9iixc9z74.execute-api.af-south-1.amazonaws.com/cog/tilejson.json?url=https://peterm790.s3.af-south-1.amazonaws.com/test.tif');
        console.log("Adding wind layer");
        try {
          const windLayerInstance = new windLayer(mapRef.current);
          console.log(typeof windLayerInstance);
          mapRef.current.addLayer(windLayerInstance);

          // Move the wind layer to the top
          mapRef.current.moveLayer(windLayerInstance.id);

          setMapInitialized(true);
        } catch (error) {
          console.error("Error adding wind layer:", error);
        }
      });

      mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    };


    // Default coordinates for South Africa
    const defaultCenter = [22.9375, -30.5595];

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("Geolocation successful");
          initializeMap([position.coords.longitude, position.coords.latitude]);
        },
        () => {
          console.log("Geolocation failed, using default coordinates");
          initializeMap(defaultCenter);
        }
      );
    } else {
      console.log("Geolocation not supported, using default coordinates");
      initializeMap(defaultCenter);
    }

    // No cleanup function here to prevent map removal on re-renders
  }, [mapInitialized]);

  return (
    <>
      <Head>
        <title>Pete&apos;s Forecast</title>
      </Head>
      <div className={styles.mapwrap}>

        <div ref={mapContainerRef} className={styles.map} />
        <div className={styles.title}>
          <span className={styles.valueText}>Pete&apos;s Forecast v0.1</span>
        </div>

        <div className={styles.menuBar}>
          <p className={styles.dateTime}>
            <span className={styles.labelText}>Forecast Model:</span>{' '}
            <span className={styles.valueText}>GFS</span>
          </p>
          <p className={styles.dateTime}>
            <span className={styles.labelText}>Valid Time:</span>{' '}
            <span className={styles.valueText}>04/10/2024 19:00</span>
          </p>
          <p className={styles.dateTime}>
            <span className={styles.labelText}>Layer:</span>{' '}
            <span className={styles.valueText}>Wind Speed</span>
          </p>
        </div>

      </div>
      <Analytics />
    </>
  );
};

export default Map;