import React from 'react';
import styles from './SegmentedControl.module.css';

interface SegmentedControlProps {
  options: { label: string; value: string; icon?: React.ReactNode }[];
  value: string;
  onChange: (value: string) => void;
}

export default function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  return (
    <div className={styles.container}>
      <div 
        className={styles.slider} 
        style={{ 
          width: `${100 / options.length}%`,
          transform: `translateX(${options.findIndex(o => o.value === value) * 100}%)`
        }} 
      />
      {options.map((option) => (
        <button
          key={option.value}
          className={`${styles.option}${value === option.value ? ` ${styles.active}` : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.icon && <span className={styles.icon}>{option.icon}</span>}
          <span className={styles.label}>{option.label}</span>
        </button>
      ))}
    </div>
  );
}
