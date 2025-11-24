import * as XLSX from "xlsx";
import { useUploadFilesStore } from "./store/uploadFilesStore";
export default function readExcelFile(file) {
  // Читаем файл как бинарный
  const reader = new FileReader();
  const setExcelData = useUploadFilesStore.getState().addFiles;
  const setRawData = useUploadFilesStore.getState().setFiles;
  reader.onload = (e) => {
    const data = e.target.result;
    // Читаем данные книги
    const workbook = XLSX.read(data, { type: "binary" });
    // Берем первый лист (или нужный)
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Конвертируем лист в JSON (массив объектов)
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    console.log(jsonData); // Массив объектов, где каждый объект — строка
    setExcelData(jsonData);
    setRawData(jsonData);
  };
  reader.readAsBinaryString(file);
}
