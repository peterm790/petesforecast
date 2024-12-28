import React from 'react';
import styles from './About.module.css';

const AboutPopup = ({ toggleAbout }) => {
    return (
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
};

export default AboutPopup;
