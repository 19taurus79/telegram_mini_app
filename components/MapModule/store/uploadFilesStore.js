import { create } from "zustand";

function processFiles(files) {
  const map = new Map();

  files.forEach((file) => {
    const address = file.address?.trim();
    if (address && !map.has(address)) {
      map.set(address, file);
    }
  });

  return Array.from(map.values());
}

export const useUploadFilesStore = create((set) => ({
  rawFiles: [],
  files: [],
  // Устанавливает новые файлы без обработки
  setFiles: (rawFiles) => set({ rawFiles }),

  // Добавляет новые файлы, избегая дубликатов по адресу
  addFiles: (newFiles) => {
    set((state) => {
      const filteredNewFiles = processFiles(newFiles);
      const currentAddresses = new Set(state.files.map((f) => f.address));

      const filesToAdd = filteredNewFiles.filter(
        (f) => !currentAddresses.has(f.address)
      );

      if (filesToAdd.length === 0) {
        return {}; // Нет изменений, не обновляем стейт
      }

      return {
        files: [...state.files, ...filesToAdd].sort((a, b) =>
          a.address.localeCompare(b.address)
        ),
      };
    });
  },
}));
