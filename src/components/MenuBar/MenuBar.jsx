import React, { useState, useEffect, useRef } from 'react';
import { FaPencilAlt, FaPalette } from 'react-icons/fa';
import styles from './MenuBar.module.css';

const MenuBar = ({ 
  step, 
  currentDateTime, 
  handleStepChange, 
  MAX_STEP, 
  formatModelRunDate, 
  latestDate,
  toggleDrawMenu,
  toggleColorScheme,
  colorScheme,
  selectedVariable,
  setSelectedVariable
}) => {
  const variables = [
    { key: 'ws', label: 'Wind Speed' },
    { key: 't2m', label: 'Ambient Temperature' },
    { key: 'rh', label: 'Relative Humidity' },
    { key: 'pres', label: 'Pressure' },
    { key: 'refd', label: 'Simulated Radar' }
  ];

  const [expanded, setExpanded] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const menuBarRef = useRef(null);

  const handleVariableButtonClick = (key) => {
    setSelectedVariable(key);
    setExpanded(true);
    setShowLabels(true);
  };

  const handleClickAway = (e) => {
    if (menuBarRef.current && !menuBarRef.current.contains(e.target)) {
      setExpanded(false);
      setShowLabels(false);
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClickAway);
    return () => {
      document.removeEventListener('click', handleClickAway);
    };
  }, []);

  const handleMenuBarClick = (e) => {
    e.stopPropagation();
    setShowLabels(true);
    setExpanded(true);
  };

  const selectedVariableLabel = variables.find(variable => variable.key === selectedVariable)?.label || 'Wind Speed';

  const sortedVariables = variables.sort((a, b) => (a.key === selectedVariable ? -1 : b.key === selectedVariable ? 1 : 0));

  return (
    <div ref={menuBarRef} className={styles.menuBar} style={{ maxWidth: '40%' }} onClick={handleMenuBarClick}>
      <p className={styles.dateTime}>
        <span className={`${styles.labelText} ${!showLabels ? styles.hidden : ''}`}>Forecast Model:</span>{' '}
        <span className={`${styles.valueText} ${!showLabels ? styles.hidden : ''}`}>GFS</span>
      </p>
      <p className={styles.dateTime}>
        <span className={`${styles.labelText} ${!showLabels ? styles.hidden : ''}`}>Model Initialised:</span>{' '}
        <span className={`${styles.valueText} ${!showLabels ? styles.hidden : ''}`}>{formatModelRunDate(latestDate)} 00z</span>
      </p>
      <p className={styles.dateTime}>
        <span className={`${styles.labelText} ${!showLabels ? styles.hidden : ''}`}>Layer:</span>{' '}
        <span className={`${styles.valueText} ${!showLabels ? styles.hidden : ''}`}>{selectedVariableLabel}</span>
      </p>
      <p className={styles.dateTime}>
        <span className={`${styles.labelText} ${!showLabels ? styles.hidden : ''}`}>Valid Time:</span>{' '}
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
      <div className={`${styles.variableButtonGroup} ${expanded ? styles.expanded : ''}`}>
        {sortedVariables.map((variable) => (
          <button
            key={variable.key}
            onClick={(e) => { e.stopPropagation(); handleVariableButtonClick(variable.key); }}
            className={`${styles.variableButton} ${selectedVariable === variable.key ? styles.active : ''}`}
            aria-label={`Select ${variable.label}`}
          >
            <span className={styles.labelText}>{variable.label}</span>
          </button>
        ))}
      </div>
      <div className={styles.buttonGroup}>
        <button onClick={toggleColorScheme} className={styles.colorButton} aria-label="Toggle color scheme">
          <FaPalette className={colorScheme === 'rainbow' ? styles.active : ''} />
        </button>
        <button onClick={() => toggleDrawMenu(true)} className={styles.drawButton} aria-label="Toggle draw mode">
          <FaPencilAlt className={''} />
        </button>
      </div>
    </div>
  );
};

export default MenuBar;
