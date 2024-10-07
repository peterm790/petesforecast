import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { Analytics } from "@vercel/analytics/react";

import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';

import { addXYZTileLayer } from '../../layers/rasterLayer';
import windLayer from "../../layers/streamlines/windLayer";

import baseMapStyle from './basemapstyle.json';
import styles from './styles.module.css';

const MAX_STEP = 128;

const Map = () => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const latestDateRef = useRef('');
  const [mapInitialized, setMapInitialized] = useState(false);
  const [step, setStep] = useState(0);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [showAbout, setShowAbout] = useState(false);

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

    // Default coordinates for South Africa
    const defaultCenter = [22.9375, -30.5595];

    const initializeMap = (center) => {
      mapRef.current = new maplibregl.Map({
        container: mapContainerRef.current,
        style: baseMapStyle,
        center: center,
        zoom: 2,
        minZoom: 1,
        maxZoom: 7
      });

      mapRef.current.on('load', () => {
        setMapInitialized(true);
        updateLayers();
      });

      mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');
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

    // No cleanup function here to prevent map removal on re-renders
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
    //const baseDate = new Date('2024-10-05');  // Uncomment this line later to use the actual forecast date
    const daysToAdd = Math.floor(step / 8);
    const hoursToAdd = (step % 8) * 3;
    
    const forecastDate = new Date(baseDate);
    forecastDate.setDate(forecastDate.getDate() + daysToAdd);
    forecastDate.setHours(hoursToAdd, 0, 0, 0);

    const formattedDate = forecastDate.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    const formattedTime = forecastDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    setCurrentDateTime(`${formattedDate} ${formattedTime}`);
  };

  const updateLayers = () => {
    const baseURL = `https://peterm790.s3.af-south-1.amazonaws.com/petesforecast/wind/${latestDateRef.current}`;
    const dataURL = `${baseURL}/${latestDateRef.current}_00_${step}_ws`;

    console.log("Data URL:", dataURL);

    ['xyz-layer', 'wind'].forEach(layerId => {
      if (mapRef.current.getLayer(layerId)) {
        mapRef.current.removeLayer(layerId);
        if (layerId === 'xyz-layer') mapRef.current.removeSource('xyz-source');
      }
    });

    addXYZTileLayer(mapRef.current, `https://t9iixc9z74.execute-api.af-south-1.amazonaws.com/cog/tilejson.json?url=${dataURL}.tif`);

    try {
      const windLayerInstance = new windLayer(mapRef.current, dataURL);
      mapRef.current.addLayer(windLayerInstance);
      mapRef.current.moveLayer(windLayerInstance.id);
    } catch (error) {
      console.error("Error adding wind layer:", error);
    }
  };

  const handleStepChange = (increment) => {
    setStep(prevStep => Math.max(0, Math.min(prevStep + increment, MAX_STEP)));
  };

  // Add this helper function inside the Map component
  const formatModelRunDate = (dateString) => {
    if (!dateString) return '';
    const year = dateString.slice(0, 4);
    const month = dateString.slice(4, 6);
    const day = dateString.slice(6, 8);
    return `${day}/${month}/${year}`;
  };

  const toggleAbout = () => {
    setShowAbout(!showAbout);
  };

  // Add this new component inside the Map component
  const AboutPopup = () => (
    <div className={styles.aboutPopup}>
      <div className={styles.aboutContent}>
        <h2 className={styles.valueText}>About</h2>
        <div className={styles.aboutText}>
          <p>
            This website is the product of previous frustrations trying to <a href="https://petemarsh.com/wrf" target="_blank" rel="noopener noreferrer">share weather forecast data</a>, <a href="https://www.weathersa.co.za/Documents/Corporate/Record_Rains_July_2024_Media_Release_12August_2024_12082024154436.pdf" target="_blank" rel="noopener noreferrer">an unusually rainy Cape Town winter</a>, and a few too many Sundays spent at my desk!
          </p>
          <p>
            The forecast shown here is the 00z initialization of the NCEP GFS forecast. The forecast will be updated daily at 7:30 am (all times are in UTC). 16 days of forecast data are available in 3-hourly time steps. Make use of the arrows in the top left to jump in 3- or 12-hour steps.
          </p>
          <p>
            No demo or subscription APIs are used for this application. The site itself is deployed on Vercel, the tiling endpoints are AWS Lambda functions, and the weather data is updated using a Modal cron job.
          </p>
          <p>
            The weather data component of this application is run from <a href="https://gist.github.com/peterm790/97cb15037f6b51ea86e3bc8d448eb141" target="_blank" rel="noopener noreferrer">a single Python script</a>, which makes use of:
          </p>
          <ul>
            <li><a href="https://modal.com" target="_blank" rel="noopener noreferrer">Modal</a> to remotely host and run the Python script.</li>
            <li><a href="https://docs.xarray.dev/en/stable/#" target="_blank" rel="noopener noreferrer">Xarray</a> to process the data.</li>
            <li><a href="https://github.com/corteva/rioxarray" target="_blank" rel="noopener noreferrer">Rioxarray</a> for creating Cloud Optimized GeoTiffs.</li>
            <li><a href="https://github.com/fsspec/kerchunk" target="_blank" rel="noopener noreferrer">Kerchunk</a> for easy and efficient access to the <a href="https://github.com/peterm790/lambda_GFS_reference" target="_blank" rel="noopener noreferrer">latest GFS forecast data</a>.</li>
            <li><a href="https://github.com/matplotlib/cmocean" target="_blank" rel="noopener noreferrer">cmocean</a> for cool perceptually uniform colormaps.</li>
          </ul>
          <p>
            The backend further relies on:
          </p>
          <ul>
            <li><a href="https://protomaps.com" target="_blank" rel="noopener noreferrer">Protomaps</a> to store and serve all the vector map data.</li>
            <li><a href="https://www.openstreetmap.org/#map=6/-28.68/24.68" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> for the basemap.</li>
            <li><a href="https://github.com/developmentseed/titiler" target="_blank" rel="noopener noreferrer">titiler</a> for serving the foreground raster layer.</li>
          </ul>
          <p>
            The frontend of this site is built on top of a number of open-source tools. These include:
          </p>
          <ul>
            <li><a href="https://github.com/fbrosda/weather-maps" target="_blank" rel="noopener noreferrer">Weather-Maps</a> for the awesome wind animation.</li>
            <li>Weather-Maps is in fact a fork of <a href="https://github.com/mapbox/webgl-wind" target="_blank" rel="noopener noreferrer">WebGL Wind from Mapbox</a>.</li>
            <li>And WebGL Wind is, of course, inspired by the real OG of wind animation, <a href="https://earth.nullschool.net" target="_blank" rel="noopener noreferrer">earth.nullschool.net</a>.</li>
            <li><a href="https://maplibre.org" target="_blank" rel="noopener noreferrer">MapLibre</a> for the map itself.</li>
          </ul>
          <p>
            I have kept the GitHub repo behind this frontend private in part because I am embarrassed by the quality of my code and in part to obscure some of the APIs. I plan to change this soon.
          </p>
        </div>
        <div className={styles.buttonContainer}>
          <button onClick={toggleAbout} className={styles.closeButton}>Close</button>
        </div>
      </div>
    </div>
  );

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
            <span className={styles.labelText}>Model Initialised:</span>{' '}
            <span className={styles.valueText}>{formatModelRunDate(latestDateRef.current)} 00z</span>
          </p>
          <p className={styles.dateTime}>
            <span className={styles.labelText}>Layer:</span>{' '}
            <span className={styles.valueText}>Wind Speed</span>
          </p>
          <p className={styles.dateTime}>
            <span className={styles.labelText}>Valid Time:</span>{' '}
            <span className={styles.valueText}>{currentDateTime}</span>
          </p>
          <div className={styles.stepControls}>
            <button onClick={() => handleStepChange(-6)} disabled={step === 0} aria-label="Jump back 6 steps">
              <span className={styles.doubleArrow}>&laquo;</span>
            </button>
            <button onClick={() => handleStepChange(-1)} disabled={step === 0} aria-label="Previous step">
              <span className={styles.singleArrow}>&lt;</span>
            </button>
            <button onClick={() => handleStepChange(1)} disabled={step === MAX_STEP} aria-label="Next step">
              <span className={styles.singleArrow}>&gt;</span>
            </button>
            <button onClick={() => handleStepChange(6)} disabled={step === MAX_STEP} aria-label="Jump forward 6 steps">
              <span className={styles.doubleArrow}>&raquo;</span>
            </button>
          </div>
        </div>

        <div className={styles.aboutButtonContainer}>
          <button onClick={toggleAbout} className={styles.aboutButton}>README</button>
        </div>

        {showAbout && <AboutPopup />}
      </div>
      <Analytics />
    </>
  );
};

export default Map;