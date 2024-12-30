import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { Analytics } from "@vercel/analytics/react";

import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';

import {Tldraw, TldrawOptions, TLCameraOptions, TLComponents, DefaultToolbar, DefaultToolbarContent} from 'tldraw';
import 'tldraw/tldraw.css';

import { addXYZTileLayer } from '../../layers/rasterLayer';
import windLayer from "../../layers/streamlines/windLayer";

import { StyleSpecification } from 'maplibre-gl';
import baseMapStyleJson from '../../styles/basemapstyle.json';
const baseMapStyle: StyleSpecification = baseMapStyleJson as StyleSpecification;

import styles from './styles.module.css';

import MenuBar from '../../components/MenuBar/MenuBar';
import AboutPopup from '../../components/About/AboutPopup';
import Title from '../../components/Title/Title'; // Import the new Title component

const MAX_STEP = 128;

const Map = () => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const latestDateRef = useRef('');
  const [mapInitialized, setMapInitialized] = useState(false);
  const [step, setStep] = useState(0);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [showAbout, setShowAbout] = useState(false);
  const [drawMode, setDrawMode] = useState(false);

  // toggle about popup
  const toggleAbout = () => setShowAbout(!showAbout);

  // TLDraw components to make background transparent
  function Background() {
    return <div style={{ backgroundColor: 'transparent' }} />;
  }
  const TLcomponents: TLComponents = {
    Background,
    NavigationPanel: null,
    Toolbar: () => (
      <DefaultToolbar>
        <DefaultToolbarContent />
      </DefaultToolbar>
    ),
    PageMenu: null,
    ActionsMenu: null,
  };
  const options: Partial<TldrawOptions> = { maxPages: 1 };

  const cameraOptions: TLCameraOptions = {
    isLocked: true,
    wheelBehavior: 'zoom',
    panSpeed: 1,
    zoomSpeed: 1,
    zoomSteps: [0.1, 0.25, 0.5, 1, 2, 4, 8],
  };

  // needed to init protomaps protocol
  useEffect(() => {
    console.log("Setting up Protomaps protocol");
    let protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    return () => {
      maplibregl.removeProtocol("pmtiles");
    };
  }, []);

  // initialize map
  useEffect(() => {
    console.log("Initializing map");
    if (!mapContainerRef.current || mapRef.current || mapInitialized) return;

    // fetch latest date
    const fetchLatestDate = async () => {
      try {
        const response = await fetch('/api/getLatestDate');
        const data = await response.json();
        console.log("Fetched latest URL:", data.extractedDate);
        latestDateRef.current = data.extractedDate;
      } catch (error) {
        console.error("Error fetching latest data URL:", error);
      }
    };
    fetchLatestDate();

    // Default to cape town
    const defaultCenter: [number, number] = [22.9375, -30.5595];

    const initializeMap = (center: [number, number]) => {
      if (mapContainerRef.current) {
        // Initialize the base map
        mapRef.current = new maplibregl.Map({
          container: mapContainerRef.current,
          style: baseMapStyle,
          center: center,
          zoom: 5,
          minZoom: 2,
          maxZoom: 40,
        });

        mapRef.current.on('load', () => {
          setMapInitialized(true);
          updateLayers();
        });

        mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');
      }
    };

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
  }, [mapInitialized]);

  useEffect(() => {
    if (mapRef.current && mapInitialized) {
      updateLayers();
    }
  }, [step, mapInitialized]);

  useEffect(() => {
    updateDateTime();
  }, [step]);

  const updateDateTime = () => {
    const baseDate = new Date();
    const daysToAdd = Math.floor(step / 8);
    const hoursToAdd = (step % 8) * 3;

    const forecastDate = new Date(baseDate);
    forecastDate.setDate(forecastDate.getDate() + daysToAdd);
    forecastDate.setHours(hoursToAdd, 0, 0, 0);

    const formattedDate = forecastDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const formattedTime = forecastDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    setCurrentDateTime(`${formattedDate} ${formattedTime}`);
  };

  const updateLayers = () => {
    const baseURL = `https://peterm790.s3.af-south-1.amazonaws.com/petesforecast/wind/${latestDateRef.current}`;
    const dataURL = `${baseURL}/${latestDateRef.current}_00_${step}_ws`;

    console.log("Data URL:", dataURL);

    // Remove existing layers when updating layers
    ['xyz-layer', 'wind'].forEach((layerId) => {
      if (mapRef.current!.getLayer(layerId)) {
        mapRef.current!.removeLayer(layerId);
        if (layerId === 'xyz-layer') mapRef.current!.removeSource('xyz-source');
      }
    });

    addXYZTileLayer(
      mapRef.current!,
      `https://t9iixc9z74.execute-api.af-south-1.amazonaws.com/cog/tilejson.json?url=${dataURL}.tif`
    );

    try {
      const windLayerInstance = new windLayer(mapRef.current!, dataURL);
      mapRef.current!.addLayer(windLayerInstance);
      mapRef.current!.moveLayer(windLayerInstance.id);
    } catch (error) {
      console.error("Error adding wind layer:", error);
    }
  };

  const handleStepChange = (increment: number) => {
    setStep((prevStep) => Math.max(0, Math.min(prevStep + increment, MAX_STEP)));
  };

  const formatModelRunDate = (dateString: string) => {
    if (!dateString) return '';
    const year = dateString.slice(0, 4);
    const month = dateString.slice(4, 6);
    const day = dateString.slice(6, 8);
    return `${day}/${month}/${year}`;
  };

  const toggleDrawMode = () => {
    setDrawMode((prevDrawMode) => !prevDrawMode);
  };

  return (
    <>
      <Head>
        <title>Pete&apos;s Forecast</title>
      </Head>

      <div className={styles.mapwrap}>
        <Title />

        <div ref={mapContainerRef} className={styles.map} />

        <div style={{ position: 'fixed', inset: 0, zIndex: drawMode ? 1000 : -1 }}>
            <Tldraw 
            onMount={(editor) => {editor.setCurrentTool('draw')}}
            components={TLcomponents}
            options={options}
            cameraOptions={cameraOptions}
            //hideUi
            />
        </div>

        <MenuBar 
            step={step} 
            currentDateTime={currentDateTime} 
            handleStepChange={handleStepChange} 
            MAX_STEP={MAX_STEP} 
            formatModelRunDate={formatModelRunDate} 
            latestDate={latestDateRef.current}
            toggleDrawMode={toggleDrawMode}
            drawMode={drawMode}
        />

        <div className={styles.aboutButtonContainer}>
          <button onClick={toggleAbout} className={styles.aboutButton}>
            README
          </button>
        </div>
        {showAbout && <AboutPopup toggleAbout={toggleAbout} />}

      </div>

      <Analytics />

    </>
  );
};

export default Map;