'use client';

import FileUploadForm from '@/components/Admin/FileUploadForm';
import MatchingUI from '@/components/Admin/MatchingUI';
import { MatchingData } from '@/types/types';
import { useState } from 'react';
import styles from './UploadPage.module.css';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function UploadPage() {
  const [matchingData, setMatchingData] = useState<MatchingData | null>(null);
  const [allFiles, setAllFiles] = useState<Record<string, File | null>>({});
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  // 1. Додаємо стан для ключа форми
  const [formKey, setFormKey] = useState(0);

  const handleUploadSuccess = (data: MatchingData, uploadedFiles: Record<string, File | null>) => {
    setMatchingData(data);
    setAllFiles(uploadedFiles);
    setCurrentSessionId(data.session_id);
  };

  const handleAllMatched = async () => {
    if (!currentSessionId) return;

    toast.loading("Отримання результатів співставлення...");

    try {
      const resultsResponse = await axios.get(`/process/${currentSessionId}/results`);
      const manualMatchesJson = JSON.stringify(resultsResponse.data);

      toast.dismiss();
      toast.loading("Завантаження  файлів...");

      const formData = new FormData();
      let remainingFileCount = 0;

      for (const key in allFiles) {
        if (key !== 'ordered' && key !== 'moved' && allFiles[key]) {
          formData.append(key, allFiles[key] as File);
          remainingFileCount++;
        }
      }

      formData.append('manual_matches_json', manualMatchesJson);

      if (remainingFileCount > 0) {
        await axios.post("/upload-data", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }

      toast.dismiss();
      toast.success("Всі операції успішно завершені!");
    } catch (error) {
      toast.dismiss();
      console.error("Помилка на заключному етапі завантаження:", error);
      toast.error("Помилка на заключному етапі завантаження.");
    } finally {
      setMatchingData(null);
      setAllFiles({});
      setCurrentSessionId(null);
      // 3. Оновлюємо ключ, щоб перестворити форму
      setFormKey(prevKey => prevKey + 1);
    }
  };

  const handleDirectUpload = async (files: Record<string, File | null>) => {
    const toastId = toast.loading("Завантаження файлів...");
    try {
      const formData = new FormData();
      let fileCount = 0;

      for (const key in files) {
        if (files[key]) {
          formData.append(key, files[key] as File);
          fileCount++;
        }
      }

      if (fileCount > 0) {
        await axios.post("/upload-data", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }

      toast.dismiss(toastId);
      toast.success("Файли успішно завантажені!");
      // 3. Оновлюємо ключ, щоб перестворити форму
      setFormKey(prevKey => prevKey + 1);
    } catch (error) {
      toast.dismiss(toastId);
      console.error("Помилка при завантажені файлів:", error);
      toast.error("Помилка при завантажені файлів.");
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Завантаження даних</h1>
      {matchingData ? (
        <MatchingUI data={matchingData} onAllMatched={handleAllMatched} />
      ) : (
        <FileUploadForm 
          key={formKey} // 2. Передаємо ключ до компонента
          onUploadSuccess={handleUploadSuccess} 
          onSkipMatching={handleDirectUpload}
        />
      )}
    </div>
  );
}
