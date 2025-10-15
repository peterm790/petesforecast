// React and Next.js imports
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';

// Third-party libraries
import maplibregl, { StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import { Analytics } from "@vercel/analytics/react";

// Terra Draw related imports
import { 
  TerraDraw, 
  TerraDrawCircleMode, 
  TerraDrawFreehandMode, 
  TerraDrawLineStringMode, 
  TerraDrawPointMode, 
  TerraDrawPolygonMode, 
  TerraDrawSelectMode 
} from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter';

// Local components
import MenuBar from '../../components/MenuBar/MenuBar';
import AboutPopup from '../../components/About/AboutPopup';
import Title from '../../components/Title/Title';
import DrawMenuBar from '../../components/DrawMenuBar/DrawMenuBar';

// Styles and assets
import styles from './styles.module.css';
import baseMapStyleJson from '../../styles/basemapstyle.json';

// Layers
import { addXYZTileLayer } from '../../layers/rasterLayer';
import windLayer from "../../layers/streamlines/windLayer";

const baseMapStyle: StyleSpecification = baseMapStyleJson as StyleSpecification;

const MAX_STEP = 128;

const Map = () => {
  const router = useRouter();
  const mapContainerRef = useRef(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const latestDateRef = useRef('');
  const [mapInitialized, setMapInitialized] = useState(false);
  const [stateInitialized, setStateInitialized] = useState(false);
  const [step, setStep] = useState(0);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [showAbout, setShowAbout] = useState(false);
  const [colorScheme, setColorScheme] = useState('rainbow');
  const [selectedVariable, setSelectedVariable] = useState('ws');
  const [mouseCoords, setMouseCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [showCoords, setShowCoords] = useState(true);
  const [drawMenuVisible, setDrawMenuVisible] = useState(false);
  const [drawMode, setDrawMode] = useState<string | null>(null);

  const colorbarSrc = `/colorbars/colorbar_${selectedVariable}_${colorScheme}.svg`;

  // Initialize state from URL query parameters after router is ready
  useEffect(() => {
    if (router.isReady) {
      setStep(parseInt(router.query.step as string) || 0);
      setColorScheme(router.query.colorScheme as string || 'rainbow');
      setSelectedVariable(router.query.selectedVariable as string || 'ws');
      setStateInitialized(true);
    }
  }, [router.isReady]);

  // Update URL query parameters
  useEffect(() => {
    if (router.isReady && stateInitialized) {
      router.push({
        pathname: router.pathname,
        query: {
          ...router.query,
          step,
          colorScheme,
          selectedVariable,
        },
      }, undefined, { shallow: true });
    }
  }, [step, colorScheme, selectedVariable, stateInitialized]);

  // Toggle color scheme
  const toggleColorScheme = () => {
    setColorScheme((prevScheme) => (prevScheme === 'rainbow' ? 'cmocean' : 'rainbow'));
  };

  // Toggle about popup
  const toggleAbout = () => setShowAbout(!showAbout);

  // Initialize Protomaps protocol
  useEffect(() => {
    console.log("Setting up Protomaps protocol");
    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    return () => {
      maplibregl.removeProtocol("pmtiles");
    };
  }, []);

  // Fetch latest date and initialize map
  useEffect(() => {
    if (!stateInitialized) return;

    console.log("Initializing map");
    if (!mapContainerRef.current || mapRef.current || mapInitialized) return;

    const fetchLatestDate = async () => {
      try {
        const response = await fetch('/api/getLatestDate');
        const data = await response.json();
        console.log("Fetched latest URL:", data.extractedDate);
        latestDateRef.current = data.extractedDate;
        updateDateTime();
        initializeMap();
      } catch (error) {
        console.error("Error fetching latest data URL:", error);
      }
    };
    fetchLatestDate();

    const defaultCenter: [number, number] = [22.9375, -30.5595];

    const initializeMap = (center: [number, number] = defaultCenter) => {
      if (mapContainerRef.current) {
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

        mapRef.current.on('movestart', () => {
          setShowCoords(false);
        });

        mapRef.current.on('moveend', () => {
          setShowCoords(true);
        });
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
          initializeMap();
        }
      );
    } else {
      console.log("Geolocation not supported, using default coordinates");
      initializeMap();
    }
  }, [mapInitialized, stateInitialized]);

  const draw = useMemo(() => {
    if (mapRef.current) {
      const terraDraw = new TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({ map: mapRef.current}),
        modes: [
          new TerraDrawCircleMode(),
          new TerraDrawFreehandMode(),
          new TerraDrawLineStringMode(),
          new TerraDrawPointMode(),
          new TerraDrawPolygonMode(),
          new TerraDrawSelectMode()
        ],
      });
      terraDraw.start();
      console.log('TerraDraw initialized and started', terraDraw);
      return terraDraw;
    }
  }, [mapRef.current]);

  const changeMode = useCallback(
    (newMode: string) => {
      if (draw) {
        setDrawMode(newMode);
        draw.setMode(newMode);
        console.log(`Draw mode set to: ${newMode}`);
      }
    },
    [draw]
  );

  useEffect(() => {
    if (draw) {
      console.log("Draw instance available:", draw);
    }
  }, [draw]);

  const toggleDrawMenu = () => {
    console.log("Toggling draw menu"); // Log the action
    if (draw) {
      setDrawMode('select');
      draw.setMode('select');
    }
    setDrawMenuVisible((prevVisible) => {return !prevVisible;});
 };

  const onModeSelect = (mode: string) => {
    changeMode(mode);
  };

  const updateDateTime = () => {
    const baseDate = new Date(
      parseInt(latestDateRef.current.slice(0, 4)),
      parseInt(latestDateRef.current.slice(4, 6)) - 1,
      parseInt(latestDateRef.current.slice(6, 8))
    );
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

  // Update date/time when step changes
  useEffect(() => {
    if (latestDateRef.current) {
      updateDateTime();
    }
  }, [step]);

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

  // Update layers when dependencies change
  useEffect(() => {
    if (!mapInitialized || !stateInitialized || !latestDateRef.current) return;
    updateLayers();
  }, [step, colorScheme, selectedVariable, stateInitialized, mapInitialized]);

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

  return (
    <>
      <Head>
        <title>Pete&apos;s Forecast</title>
      </Head>

      <div className={styles.mapwrap}>
        <Title />

        <div ref={mapContainerRef} className={styles.map} />

        {mouseCoords && mousePosition && showCoords && (
          <div
            className={styles.mouseCoords}
            style={{ top: mousePosition.y - 30, left: mousePosition.x - 10 }}
          >
            {mouseCoords.lat.toFixed(4)}, {mouseCoords.lon.toFixed(4)}
          </div>
        )}

        {drawMenuVisible ? (
          <DrawMenuBar toggleDrawMenu={toggleDrawMenu} onModeSelect={onModeSelect} />
        ) : (
          <MenuBar 
            step={step} 
            currentDateTime={currentDateTime} 
            handleStepChange={handleStepChange} 
            MAX_STEP={MAX_STEP} 
            formatModelRunDate={formatModelRunDate} 
            latestDate={latestDateRef.current}
            toggleDrawMenu={toggleDrawMenu}
            toggleColorScheme={toggleColorScheme}
            colorScheme={colorScheme}
            selectedVariable={selectedVariable}
            setSelectedVariable={setSelectedVariable}
          />
        )}

        <div className={styles.aboutButtonContainer}>
          <button onClick={toggleAbout} className={styles.aboutButton}>
            README
          </button>
        </div>
        {showAbout && <AboutPopup toggleAbout={toggleAbout} />}

        <div className={styles.colorbarcontainer}>
          <Image
            src={colorbarSrc}
            alt="Colorbar"
            width={400}
            height={50}
          />
        </div>

      </div>

      <Analytics />

    </>
  );
};

export default Map;