import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { Analytics } from "@vercel/analytics/react";

import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';

import { addXYZTileLayer } from '../../layers/rasterLayer';
import windLayer from "../../layers/streamlines/windLayer";

import { StyleSpecification } from 'maplibre-gl';
import baseMapStyleJson from '../../styles/basemapstyle.json';
const baseMapStyle: StyleSpecification = baseMapStyleJson as StyleSpecification;

import styles from './styles.module.css';

import MenuBar from '../../components/MenuBar/MenuBar';
import AboutPopup from '../../components/About/AboutPopup';
import Title from '../../components/Title/Title'; 
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
  const [colorScheme, setColorScheme] = useState('rainbow');
  const [selectedVariable, setSelectedVariable] = useState('ws');

  // toggle color scheme
  const toggleColorScheme = () => {
    setColorScheme((prevScheme) => (prevScheme === 'rainbow' ? 'cmocean' : 'rainbow'));
  };

  // toggle about popup
  const toggleAbout = () => setShowAbout(!showAbout);

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
        updateDateTime(); // Ensure date is formatted correctly on first load
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
          minZoom: 1,
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
  }, [step, colorScheme, mapInitialized, selectedVariable]);

  useEffect(() => {
    updateDateTime();
  }, [step]);

  const updateDateTime = () => {
    const baseDate = new Date(latestDateRef.current.slice(0, 4), latestDateRef.current.slice(4, 6) - 1, latestDateRef.current.slice(6, 8));
    const forecastHour = step < 121 ? step : 120 + (step - 120) * 3;

    const forecastDate = new Date(baseDate);
    forecastDate.setHours(forecastDate.getHours() + forecastHour);

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
    const formattedStep = step < 121 ? `f${step.toString().padStart(3, '0')}` : `f${(120 + (step - 120) * 3).toString().padStart(3, '0')}`;
    const windDataURL = `https://petesforecast-input.s3.af-south-1.amazonaws.com/${latestDateRef.current}/ws/${latestDateRef.current}_00_${formattedStep}_ws`;

    const rasterDataURL = `https://petesforecast-input.s3.af-south-1.amazonaws.com/${latestDateRef.current}/${selectedVariable}/${latestDateRef.current}_00_${formattedStep}_${selectedVariable}_${colorScheme}`;

    console.log("Raster Data URL:", rasterDataURL);

    // Remove existing layers when updating layers
    ['xyz-layer', 'wind'].forEach((layerId) => {
      if (mapRef.current!.getLayer(layerId)) {
        mapRef.current!.removeLayer(layerId);
        if (layerId === 'xyz-layer') mapRef.current!.removeSource('xyz-source');
      }
    });

    addXYZTileLayer(
      mapRef.current!,
      `https://t9iixc9z74.execute-api.af-south-1.amazonaws.com/cog/tilejson.json?url=${rasterDataURL}.tif`
    );

    try {
      const windLayerInstance = new windLayer(mapRef.current!, windDataURL);
      mapRef.current!.addLayer(windLayerInstance);
      mapRef.current!.moveLayer(windLayerInstance.id);
    } catch (error) {
      console.error("Error adding wind layer:", error);
    }
  };

  const handleStepChange = (increment: number) => {
    setStep((prevStep) => {
      const newStep = prevStep + increment;
      if (newStep < 0) return 0;
      if (newStep > 387) return 387;
      return newStep;
    });
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

        <MenuBar 
            step={step} 
            currentDateTime={currentDateTime} 
            handleStepChange={handleStepChange} 
            MAX_STEP={MAX_STEP} 
            formatModelRunDate={formatModelRunDate} 
            latestDate={latestDateRef.current}
            toggleDrawMode={toggleDrawMode}
            drawMode={drawMode}
            toggleColorScheme={toggleColorScheme}
            colorScheme={colorScheme}
            selectedVariable={selectedVariable}
            setSelectedVariable={setSelectedVariable}
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