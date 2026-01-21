import {
  checkEventCompleted,
  checkEventInProgress,
  chengedEventDate,
  sendTelegramMessage,
} from "@/lib/api";
import css from "./AdminBtn.module.css";
import { getInitData } from "@/lib/getInitData";
import { useState } from "react";
import { DateWithTimeZone } from "@/types/types";
import toast from "react-hot-toast";

const initData = getInitData();

// Вспомогательная функция для экранирования HTML-символов
const escapeHtml = (text: string) => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
};

export default function AdminBtnInEvent({
  id,
  date,
  status,
  telegramId,
  text, // Это data.description, которое будет цитироваться
}: {
  id: string;
  date: DateWithTimeZone;
  status: string;
  telegramId: string;
  text: string;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const inProgres = (id: string) => {
    console.log("in progress", id);
    checkEventInProgress(id, initData);
  };

  const doneEvent = (id: string) => {
    console.log("Done !");
    checkEventCompleted(id, initData);
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(event.target.value);
    chengedEventDate(id, initData, event.target.value);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      toast.error("Повідомлення не може бути порожнім");
      return;
    }

    // Экранируем пользовательский ввод перед вставкой в HTML
    const escapedOriginalText = escapeHtml(text);
    const escapedMessageText = escapeHtml(messageText);

    // Формируем текст с цитатой и выделением
    const fullMessage = `<b>Повідомлення щодо події:</b>\n\n<blockquote>${escapedOriginalText}</blockquote>\n\n<b>Повідомлення:</b>\n\n<b>${escapedMessageText}</b>`;

    const promise = sendTelegramMessage(telegramId, fullMessage, initData);

    toast.promise(promise, {
      loading: "Відправка повідомлення...",
      success: () => {
        setIsModalOpen(false);
        setMessageText("");
        return "Повідомлення відправлено!";
      },
      error: (err) => {
        console.error("Failed to send message:", err);
        return "Помилка при відправці повідомлення.";
      },
    });
  };

  const dateString =
    typeof date === "string"
      ? date
      : new Date(date.dateTime).toISOString().split("T")[0];

  // Общий блок кнопок, который будет отображаться для всех нужных статусов
  const renderAdminControls = () => (
    <div className={css.container}>
      {/* Кнопки, зависящие от статуса */}
      {status === "11" && (
        <>
          <button onClick={() => inProgres(id)} className={css.adminButton}>
            Взяти в роботу
          </button>
          <button onClick={() => doneEvent(id)} className={css.adminButton}>
            Готово до завантаження
          </button>
        </>
      )}
      {status === "5" && (
        <button onClick={() => doneEvent(id)} className={css.adminButton}>
          Готово до завантаження
        </button>
      )}

      {/* Общие элементы для всех статусов */}
      <input
        type="date"
        className={css.adminButton}
        value={selectedDate || dateString}
        onChange={handleDateChange}
      />
      <button onClick={() => setIsModalOpen(true)} className={css.adminButton}>
        Відправити повідомлення
      </button>
    </div>
  );

  return (
    <>
      {/* Условие для отображения всего блока кнопок */}
      {(status === "11" || status === "5" || status === "10") && renderAdminControls()}

      {/* Модальное окно */}
      {isModalOpen && (
        <div className={css.modalOverlay}>
          <div className={css.modal}>
            <h3 className={css.modalTitle}>Відправити повідомлення</h3>
            <p className={css.quotedText}>
              <strong>Відповідь на:</strong> "{text}"
            </p>
            <textarea
              className={css.modalTextarea}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Введіть ваш текст..."
            />
            <div className={css.modalActions}>
              <button onClick={handleSendMessage} className={css.buttonSave}>
                Відправити
              </button>
              <button onClick={() => setIsModalOpen(false)} className={css.buttonCancel}>
                Скасувати
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
