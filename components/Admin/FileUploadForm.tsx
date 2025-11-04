"use client";

import { useState, FormEvent, DragEvent } from "react";
import axios from "axios";
import styles from "./FileUploadForm.module.css";
import toast from 'react-hot-toast';

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    toast.loading("Загрузка...");

    const formData = new FormData();
    let fileCount = 0;
    for (const key in files) {
      if (files[key]) {
        formData.append(key, files[key] as File);
        fileCount++;
      }
    }

    if (fileCount === 0) {
      toast.dismiss();
      toast.error("Пожалуйста, выберите хотя бы один файл.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await axios.post("/upload-data", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      toast.dismiss();
      console.log("Server response:", response.data);
      toast.success("Файлы успешно загружены!");
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
        {isSubmitting ? "Загрузка..." : "Отправить"}
      </button>
    </form>
  );
}
