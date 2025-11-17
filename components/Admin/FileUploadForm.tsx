"use client";

import { useState, FormEvent, DragEvent } from "react";
import axios from "axios";
import styles from "./FileUploadForm.module.css";
import toast from 'react-hot-toast';
import { MatchingData } from "@/types/types";

const fileInputs = [
  { id: "av_stock_file", label: "Доступно по підрозділах" },
  { id: "remains_file", label: "Залишки" },
  { id: "submissions_file", label: "Заявки" },
  { id: "payment_file", label: "Оплати" },
  // { id: "moved_file", label: "Замовлено-Переміщено" },
  { id: "free_stock", label: "Доступно" },
  { id: "ordered", label: "Замовлено" },
  { id: "moved", label: "Переміщено" },
];

interface FileUploadFormProps {
  onUploadSuccess: (data: MatchingData, allFiles: Record<string, File | null>) => void;
  // Новий пропс для прямого завантаження
  onSkipMatching: (allFiles: Record<string, File | null>) => void;
}

export default function FileUploadForm({ onUploadSuccess, onSkipMatching }: FileUploadFormProps) {
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files: inputFiles } = e.target;
    if (inputFiles && inputFiles.length > 0) {
      setFiles((prevFiles) => ({
        ...prevFiles,
        [name]: inputFiles[0],
      }));
    }
  };

  const handleDrag = (e: DragEvent<HTMLLabelElement>, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragOver(id);
    } else if (e.type === "dragleave") {
      setDragOver(null);
    }
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);
    const { files: droppedFiles } = e.dataTransfer;
    if (droppedFiles && droppedFiles.length > 0) {
      setFiles((prevFiles) => ({
        ...prevFiles,
        [id]: droppedFiles[0],
      }));
    }
  };

  /**
   * Оновлений обробник відправки форми.
   * Тепер він вирішує, який шлях завантаження вибрати.
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Перевіряємо, чи є хоча б один файл для завантаження
    if (Object.values(files).every(file => file === null)) {
      toast.error("Будь ласка, виберіть хоча б один файл.");
      return;
    }

    // Логіка вибору шляху
    // Якщо файли 'ordered' або 'moved' присутні, йдемо по шляху зіставлення.
    if (files.ordered || files.moved) {
      // Перевіряємо, що обидва файли є, якщо хоча б один з них є
      if (!files.ordered || !files.moved) {
        toast.error("Для зіставлення потрібні ОБИДВА файли: 'Замовлено' та 'Переміщено'.");
        return;
      }
      await handleMatchingUpload();
    } else {
      // Інакше, пропускаємо зіставлення і завантажуємо файли напряму.
      await handleDirectUpload();
    }
  };

  /**
   * Логіка для першого етапу завантаження (зіставлення).
   */
  const handleMatchingUpload = async () => {
    setIsSubmitting(true);
    toast.loading("Завантаження файлів для співставлення...");

    const formData = new FormData();
    formData.append("ordered_file", files.ordered as File);
    formData.append("moved_file", files.moved as File);

    try {
      const response = await axios.post("/upload_ordered_moved", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      toast.dismiss();
      toast.success("Файли завантажені! Починається співставлення.");
      onUploadSuccess(response.data, files);
    } catch (error) {
      toast.dismiss();
      console.error("Помилка при завантажені файлів:", error);
      toast.error("Виникла помилка при завантажені. Подивиться в консоль для отримання деталій.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Логіка для прямого завантаження (пропуск зіставлення).
   */
  const handleDirectUpload = async () => {
    setIsSubmitting(true);
    // Викликаємо функцію з батьківського компонента, передаючи їй всі файли.
    // Батьківський компонент сам обробить завантаження.
    await onSkipMatching(files);
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {fileInputs.map(({ id, label }) => (
        <div key={id} className={styles.fileInputContainer}>
          <label 
            htmlFor={id} 
            className={`${styles.dropzone} ${dragOver === id ? styles.dragover : ''}`}
            onDragEnter={(e) => handleDrag(e, id)}
            onDragLeave={(e) => handleDrag(e, id)}
            onDragOver={(e) => handleDrag(e, id)}
            onDrop={(e) => handleDrop(e, id)}
          >
            {files[id] ? (
              <span className={styles.fileName}>{files[id]?.name}</span>
            ) : (
              <span>{label}</span>
            )}
          </label>
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
        {isSubmitting ? "Завантаження..." : "Відправити"}
      </button>
    </form>
  );
}
