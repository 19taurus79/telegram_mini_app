'use client';

import FileUploadForm from '@/components/Admin/FileUploadForm';
import MatchingUI from '@/components/Admin/MatchingUI';
import { MatchingData } from '@/types/types';
import { useState } from 'react';
import styles from './UploadPage.module.css';
import axios from 'axios';
import toast from 'react-hot-toast';

/**
 * UploadPage - это главный компонент-контейнер, который управляет всем процессом загрузки и сопоставления данных.
 * Он хранит состояние и координирует взаимодействие между FileUploadForm и MatchingUI.
 */
export default function UploadPage() {
  // Состояние для хранения данных, полученных после первого этапа загрузки. Эти данные используются для ручного сопоставления.
  const [matchingData, setMatchingData] = useState<MatchingData | null>(null);
  // Состояние для хранения ВСЕХ файлов, выбранных пользователем в форме. Это нужно, чтобы отправить оставшиеся файлы на втором этапе.
  const [allFiles, setAllFiles] = useState<Record<string, File | null>>({});
  // Состояние для хранения ID текущей сессии, полученного после первого этапа загрузки.
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  /**
   * Обработчик, вызываемый после успешного завершения первого этапа загрузки (из FileUploadForm).
   * @param data - Данные для сопоставления, полученные от бэкенда.
   * @param uploadedFiles - Все файлы, которые были выбраны в форме.
   */
  const handleUploadSuccess = (data: MatchingData, uploadedFiles: Record<string, File | null>) => {
    setMatchingData(data); // Сохраняем данные для сопоставления, что вызовет отображение MatchingUI.
    setAllFiles(uploadedFiles); // Сохраняем все файлы для второго этапа загрузки.
    setCurrentSessionId(data.session_id); // Сохраняем ID сессии.
  };

  /**
   * Обработчик, вызываемый после того, как все элементы в MatchingUI были сопоставлены.
   * Запускает финальный этап загрузки.
   */
  const handleAllMatched = async () => {
    if (!currentSessionId) return; // Проверка на наличие ID сессии.

    toast.loading("Получение результатов сопоставления...");

    try {
      // Шаг 1: Получаем результаты ручного сопоставления с бэкенда.
      const resultsResponse = await axios.get(`/process/${currentSessionId}/results`);
      const manualMatchesJson = JSON.stringify(resultsResponse.data);

      toast.dismiss();
      toast.loading("Загрузка остальных файлов...");

      // Шаг 2: Готовим и отправляем оставшиеся файлы вместе с результатами сопоставления.
      const formData = new FormData();
      let remainingFileCount = 0;

      // Итерируемся по всем файлам и добавляем в formData только те, что не были отправлены на первом этапе.
      for (const key in allFiles) {
        if (key !== 'ordered' && key !== 'moved' && allFiles[key]) {
          formData.append(key, allFiles[key] as File);
          remainingFileCount++;
        }
      }

      // Добавляем JSON-строку с результатами сопоставления.
      formData.append('manual_matches_json', manualMatchesJson);

      // Если остались файлы для загрузки, отправляем их.
      if (remainingFileCount > 0) {
        await axios.post("/upload-data", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }

      toast.dismiss();
      toast.success("Все операции успешно завершены!");
    } catch (error) {
      toast.dismiss();
      console.error("Ошибка на заключительном этапе загрузки:", error);
      toast.error("Произошла ошибка на заключительном этапе загрузки.");
    } finally {
      // Вне зависимости от результата, сбрасываем все состояния, чтобы вернуть UI в исходное положение.
      setMatchingData(null);
      setAllFiles({});
      setCurrentSessionId(null);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Загрузка данных</h1>
      {/* Условный рендеринг: показываем либо UI для сопоставления, либо форму загрузки. */}
      {matchingData ? (
        <MatchingUI data={matchingData} onAllMatched={handleAllMatched} />
      ) : (
        <FileUploadForm onUploadSuccess={handleUploadSuccess} />
      )}
    </div>
  );
}
