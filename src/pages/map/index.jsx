import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { Analytics } from "@vercel/analytics/react";

import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';

import { addXYZTileLayer } from '../../layers/rasterLayer';
import { addTriangleLayer } from '../../layers/triangleLayer';
import WindLayer from "../../layers/streamlines/WindLayer";

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
        zoom: 5
      });

      mapRef.current.on('load', () => {
        console.log("Map loaded");
        addTriangleLayer(mapRef.current);
        // addXYZTileLayer(mapRef.current, 'https://t9iixc9z74.execute-api.af-south-1.amazonaws.com/cog/tilejson.json?url=https://peterm790.s3.af-south-1.amazonaws.com/t2m_GFS.tif'); //
        // Initialize the WindLayer 
        const windLayer = new WindLayer(mapRef.current);
        window.layer = windLayer; // Expose the layer to the window object if needed
        windLayer.addTo(mapRef.current); 
        setMapInitialized(true);
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
        <div className={styles.title}>Pete&apos;s Forecast v0.1</div>
      </div>
      <Analytics />
    </>
  );
};

export default Map;