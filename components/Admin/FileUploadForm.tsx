"use client";

import { useState, FormEvent, DragEvent } from "react";
import axios from "axios";
import styles from "./FileUploadForm.module.css";
import toast from 'react-hot-toast';
import { MatchingData } from "@/types/types";

// Определяем список инпутов для файлов, которые будут отображаться в форме.
const fileInputs = [
  { id: "av_stock_file", label: "Доступность по подразделениям" },
  { id: "remains_file", label: "Остатки" },
  { id: "submissions_file", label: "Заявки" },
  { id: "payment_file", label: "Оплаты" },
  { id: "moved_file", label: "Заказано-Перемещено" },
  { id: "free_stock", label: "Доступно(общий)" },
  { id: "ordered", label: "Заказано" },
  { id: "moved", label: "Перемещено" },
];

// Определяем пропсы для компонента.
interface FileUploadFormProps {
  // Функция обратного вызова, которая будет вызвана после успешной первой загрузки.
  // Передает данные для сопоставления и все выбранные файлы родительскому компоненту.
  onUploadSuccess: (data: MatchingData, allFiles: Record<string, File | null>) => void;
}

/**
 * FileUploadForm - компонент, отвечающий за отображение формы загрузки файлов и выполнение первого этапа загрузки.
 */
export default function FileUploadForm({ onUploadSuccess }: FileUploadFormProps) {
  // Состояние для хранения выбранных файлов. Ключ - id инпута, значение - объект File.
  const [files, setFiles] = useState<Record<string, File | null>>({});
  // Состояние для отслеживания процесса отправки формы (для блокировки кнопки).
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Состояние для отслеживания, над каким инпутом находится перетаскиваемый файл (для стилизации).
  const [dragOver, setDragOver] = useState<string | null>(null);

  /**
   * Обработчик изменения состояния инпута файла (когда файл выбирается через диалоговое окно).
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files: inputFiles } = e.target;
    if (inputFiles && inputFiles.length > 0) {
      setFiles((prevFiles) => ({
        ...prevFiles,
        [name]: inputFiles[0],
      }));
    }
  };

  /**
   * Обработчик событий drag-n-drop (dragenter, dragover, dragleave).
   */
  const handleDrag = (e: DragEvent<HTMLLabelElement>, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragOver(id); // Устанавливаем id инпута, над которым находится курсор.
    } else if (e.type === "dragleave") {
      setDragOver(null); // Сбрасываем, когда курсор уходит.
    }
  };

  /**
   * Обработчик события drop (когда файл "бросают" в дропзону).
   */
  const handleDrop = (e: DragEvent<HTMLLabelElement>, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);
    const { files: droppedFiles } = e.dataTransfer;
    if (droppedFiles && droppedFiles.length > 0) {
      setFiles((prevFiles) => ({
        ...prevFiles,
        [id]: droppedFiles[0], // Добавляем файл в состояние.
      }));
    }
  };

  /**
   * Обработчик отправки формы. Выполняет первый этап загрузки.
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Проверяем, выбраны ли обязательные для первого этапа файлы.
    if (!files.ordered || !files.moved) {
      toast.error("Пожалуйста, выберите файлы 'Заказано' и 'Перемещено'.");
      return;
    }

    setIsSubmitting(true);
    toast.loading("Загрузка файлов сопоставления...");

    // Создаем FormData для отправки файлов.
    const formData = new FormData();
    // Добавляем файлы с именами, которые ожидает бэкенд.
    formData.append("ordered_file", files.ordered as File);
    formData.append("moved_file", files.moved as File);

    try {
      // Отправляем запрос на первый эндпоинт.
      const response = await axios.post("/upload_ordered_moved", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      toast.dismiss();
      toast.success("Файлы успешно загружены! Начинается сопоставление.");
      // Вызываем колбэк родительского компонента, передавая ему данные для сопоставления и все выбранные файлы.
      onUploadSuccess(response.data, files);
    } catch (error) {
      toast.dismiss();
      console.error("Ошибка при загрузке файлов:", error);
      toast.error("Произошла ошибка при загрузке. Посмотрите в консоль для деталей.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {fileInputs.map(({ id, label }) => (
        <div key={id} className={styles.fileInputContainer}>
          {/* Обертка-лейбл, которая работает как дропзона. */}
          <label 
            htmlFor={id} 
            className={`${styles.dropzone} ${dragOver === id ? styles.dragover : ''}`}
            onDragEnter={(e) => handleDrag(e, id)}
            onDragLeave={(e) => handleDrag(e, id)}
            onDragOver={(e) => handleDrag(e, id)}
            onDrop={(e) => handleDrop(e, id)}
          >
            {/* Показываем либо имя файла, либо лейбл. */}
            {files[id] ? (
              <span className={styles.fileName}>{files[id]?.name}</span>
            ) : (
              <span>{label}</span>
            )}
          </label>
          {/* Сам инпут файла скрыт, но связан с лейблом через htmlFor. */}
          <input
            type="file"
            id={id}
            name={id}
            onChange={handleFileChange}
            className={styles.input}
          />
        </div>
      ))}
      <button type="submit" disabled={isSubmitting} className={styles.button}>
        {isSubmitting ? "Загрузка..." : "Отправить"}
      </button>
    </form>
  );
}
