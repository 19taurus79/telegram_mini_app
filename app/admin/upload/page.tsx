'use client';

import FileUploadForm from '@/components/Admin/FileUploadForm';
import MatchingUI from '@/components/Admin/MatchingUI';
import { sampleMatchingData } from '@/lib/sample-matching-data';
import { MatchingData } from '@/types/types';
import { useState } from 'react';
import styles from './UploadPage.module.css';

export default function UploadPage() {
  const [matchingData, setMatchingData] = useState<MatchingData | null>(null);

  const handleLoadData = () => {
    setMatchingData(sampleMatchingData);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Загрузка данных</h1>
      {matchingData ? (
        <MatchingUI data={matchingData} />
      ) : (
        <>
          <FileUploadForm />
          <button onClick={handleLoadData} style={{ marginTop: '20px' }}>
            Load Sample Data
          </button>
        </>
      )}
    </div>
  );
}
