import React from 'react';
import styles from './styles.module.css';

const Title = () => {
  return (
    <div className={styles.title}>
      <span className={styles.valueText}>Pete&apos;s Forecast v0.1</span>
    </div>
  );
};

export default Title;