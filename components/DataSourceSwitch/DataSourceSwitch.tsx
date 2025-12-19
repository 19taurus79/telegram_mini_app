import React from 'react';
import styles from './DataSourceSwitch.module.css';
import clsx from 'clsx';

type DataSourceType = 'warehouse' | 'all';

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
        className={clsx(styles.switchButton, { [styles.active]: dataSource === 'all' })}
        onClick={() => setDataSource('all')}
      >
        Весь товар
      </button>
    </div>
  );
};

export default DataSourceSwitch;
