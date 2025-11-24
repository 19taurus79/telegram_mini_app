import React, { useState } from "react";
import styles from "./FileUpload.module.css";

export default function FileUpload({ onFileSelected }) {
  const [fileName, setFileName] = useState("Выберите файл Excel");

  function handleChange(e) {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      if (typeof onFileSelected === "function") {
        onFileSelected(file); // Запускаем функцию и передаем выбранный файл
      }
    } else {
      setFileName("Выберите файл Excel");
    }
  }

  return (
    <div className={styles.fileInputWrapper}>
      <input
        id="upload"
        type="file"
        accept=".xlsx, .xls"
        onChange={handleChange}
        className={styles.fileInput}
      />
      <label htmlFor="upload" className={styles.fileLabel}>
        {fileName /* показываем текущий текст кнопки */}
      </label>
    </div>
  );
}
