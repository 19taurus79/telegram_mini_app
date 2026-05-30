export const formatQuantity = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null) return "";
  const num = Number(val);
  if (isNaN(num)) return String(val);
  // Округляем до 2 знаков после запятой
  const rounded = Math.round(num * 100) / 100;
  return String(rounded);
};
