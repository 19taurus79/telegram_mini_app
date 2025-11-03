"use client";

import { useState, FormEvent } from "react";
import axios from "axios";
import styles from "./FileUploadForm.module.css";

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

export default function FileUploadForm() {
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files: inputFiles } = e.target;
    if (inputFiles && inputFiles.length > 0) {
      setFiles((prevFiles) => ({
        ...prevFiles,
        [name]: inputFiles[0],
      }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("Загрузка...");

    const formData = new FormData();
    let fileCount = 0;
    for (const key in files) {
      if (files[key]) {
        formData.append(key, files[key] as File);
        fileCount++;
      }
    }

    if (fileCount === 0) {
      setMessage("Пожалуйста, выберите хотя бы один файл.");
      setIsSubmitting(false);
      return;
    }

    try {
      // ЗАГЛУШКА: Замените '/api/upload' на ваш реальный эндпоинт
      const response = await axios.post("/upload-data", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      console.log("Server response:", response.data);
      setMessage("Файлы успешно загружены!");
    } catch (error) {
      console.error("Ошибка при загрузке файлов:", error);
      setMessage(
        "Произошла ошибка при загрузке. Посмотрите в консоль для деталей."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {fileInputs.map(({ id, label }) => (
        <div key={id} className={styles.formGroup}>
          <label htmlFor={id} className={styles.label}>
            {label}
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
        {isSubmitting ? "Загрузка..." : "Отправить"}
      </button>
      {message && <p className={styles.message}>{message}</p>}
    </form>
  );
}
