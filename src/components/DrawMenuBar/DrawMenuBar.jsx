import React from 'react';
import { FaTimes, FaCircle, FaDrawPolygon, FaPenFancy, FaRulerHorizontal, FaMapMarkerAlt } from 'react-icons/fa';
import styles from './DrawMenuBar.module.css';

const DrawMenuBar = ({ toggleDrawMenu, onModeSelect }) => {
  return (
    <div className={styles.drawMenuBar}>
      <button onClick={toggleDrawMenu} className={styles.closeButton} aria-label="Close draw menu">
        <FaTimes />
      </button>
      <div className={styles.buttonGrid}>
        <button className={styles.drawButton} aria-label="Freehand mode" onClick={() => onModeSelect('freehand')}>
          <FaPenFancy />
        </button>
        <button className={styles.drawButton} aria-label="Circle mode" onClick={() => onModeSelect('circle')}>
          <FaCircle />
        </button>
        <button className={styles.drawButton} aria-label="Line mode" onClick={() => onModeSelect('linestring')}>
          <FaRulerHorizontal />
        </button>
        <button className={styles.drawButton} aria-label="Point mode" onClick={() => onModeSelect('point')}>
          <FaMapMarkerAlt />
        </button>
        <button className={styles.drawButton} aria-label="Polygon mode" onClick={() => onModeSelect('polygon')}>
          <FaDrawPolygon />
        </button>
      </div>
    </div>
  );
};

export default DrawMenuBar;
