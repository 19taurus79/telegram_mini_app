/**
 * Утилиты для умной обработки, нормализации и валидации украинских номеров телефонов (+380).
 * Корректно обрабатывают вставку (Copy-Paste) в любых форматах:
 * - 0671234567 (10 цифр с нулем)
 * - +380671234567 / 380671234567 (12 цифр)
 * - 80671234567 (11 цифр)
 * - 671234567 (9 цифр)
 * - Вставка в инпут, где уже стоял префикс "+380" (устранение склейки 3800... или 380380...)
 * - Любые разделители: пробелы, дефисы, скобки.
 */

/**
 * Извлекает и нормализует 12 цифр украинского номера (380 + 9 цифр номера).
 * Возвращает строку цифр, например: "380671234567".
 */
export const extractUkrainianPhoneDigits = (value: string): string => {
  if (!value) return "380";

  // 1. Извлекаем только цифры
  let digits = value.replace(/\D/g, "");

  // 2. Устраняем артефакты вставки поверх уже стоящего в инпуте "+380"
  if (digits.startsWith("3800")) {
    // Вставили "067..." в конец "+380" -> "380067..." -> убираем лишний 0
    digits = "380" + digits.slice(4);
  } else if (digits.startsWith("380380")) {
    // Вставили "+38067..." в конец "+380" -> "38038067..." -> убираем дубль
    digits = digits.slice(3);
  } else if (digits.startsWith("38080") && digits.length >= 12) {
    // Вставили "8067..." в конец "+380"
    digits = "380" + digits.slice(5);
  }

  // 3. Распознаем популярные форматы ввода / вставки:
  // Вариант А: Номер начинается с 0 (например, "0671234567" - 10 цифр)
  if (digits.startsWith("0")) {
    digits = "380" + digits.slice(1);
  }
  // Вариант Б: Старый формат с 80 (например, "80671234567" - 11 цифр)
  else if (digits.startsWith("80")) {
    digits = "3" + digits;
  }
  // Вариант В: Ввели без кода страны и без 0 (например, "671234567" - 9 цифр)
  else if (!digits.startsWith("380") && digits.length > 0) {
    digits = "380" + digits;
  }

  // 4. Ограничиваем максимум 12 цифрами (380 + 9 цифр номера)
  return digits.slice(0, 12);
};

/**
 * Форматирует номер в стандартную маску: +380 (XX) XXX-XX-XX
 */
export const formatUkrainianPhoneNumber = (value: string): string => {
  const digits = extractUkrainianPhoneDigits(value);

  let formatted = "+380";
  if (digits.length > 3) {
    formatted += " (" + digits.substring(3, 5);
  }
  if (digits.length >= 6) {
    formatted += ") " + digits.substring(5, 8);
  }
  if (digits.length >= 9) {
    formatted += "-" + digits.substring(8, 10);
  }
  if (digits.length >= 11) {
    formatted += "-" + digits.substring(10, 12);
  }

  return formatted;
};

/**
 * Форматирует номер в компактный вид без пробелов: +380XXXXXXXXX (для баз данных / клиентов)
 */
export const formatCompactUkrainianPhone = (value: string): string => {
  const digits = extractUkrainianPhoneDigits(value);
  return "+" + digits;
};

/**
 * Проверяет, является ли номер телефона полностью заполненным валидным украинским номером (12 цифр, начинающихся на 380).
 */
export const isUkrainianPhoneValid = (phone?: string | null): boolean => {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("380");
};

/**
 * Очищает номер до цифр со знаком + (например, "+380671234567") для сравнения или API
 */
export const normalizeUkrainianPhone = (phone?: string | null): string => {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned;
};
