import React from 'react';
import styles from './DataSourceSwitch.module.css';
import clsx from 'clsx';

export type DataSourceType = 'warehouse' | 'all' | 'free';

interface DataSourceSwitchProps {
  dataSource: DataSourceType;
  setDataSource: (source: DataSourceType) => void;
}

const DataSourceSwitch: React.FC<DataSourceSwitchProps> = ({ dataSource, setDataSource }) => {
  return (
    <div className={styles.switchContainer}>
      <button
        className={clsx(styles.switchButton, { [styles.active]: dataSource === 'warehouse' })}
        onClick={() => setDataSource('warehouse')}
      >
        Товар на складі
      </button>
      <button
        className={clsx(styles.switchButton, { [styles.active]: dataSource === 'free' })}
        onClick={() => setDataSource('free')}
      >
        Вільний товар
      </button>
      <button
        className={clsx(styles.switchButton, { [styles.active]: dataSource === 'all' })}
        onClick={() => setDataSource('all')}
      >
        Весь товар
      </button>
    </div>
  );
};

export default DataSourceSwitch;
