import React from 'react';
import styles from './styles.module.css';

const MenuBar = ({ 
  step, 
  currentDateTime, 
  handleStepChange, 
  MAX_STEP, 
  formatModelRunDate, 
  latestDate 
}) => {
  return (
    <div className={styles.menuBar}>
      <p className={styles.dateTime}>
        <span className={styles.labelText}>Forecast Model:</span>{' '}
        <span className={styles.valueText}>GFS</span>
      </p>
      <p className={styles.dateTime}>
        <span className={styles.labelText}>Model Initialised:</span>{' '}
        <span className={styles.valueText}>{formatModelRunDate(latestDate)} 00z</span>
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
  );
};

export default MenuBar;
