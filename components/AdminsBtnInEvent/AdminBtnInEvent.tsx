import {
  checkEventCompleted,
  checkEventInProgress,
  chengedEventDate,
} from "@/lib/api";
import css from "./AdminBtn.module.css";
import { getInitData } from "@/lib/getInitData";
import { useState } from "react";
import { DateWithTimeZone } from "@/types/types";
const initData = getInitData();
export default function AdminBtnInEvent({
  id,
  date,
  status,
}: {
  id: string;
  date: DateWithTimeZone;
  status: string;
}) {
  console.log("id", id);
  const inProgres = (id: string) => {
    console.log("in progress", id);
    checkEventInProgress(id, initData);
  };
  const [selectedDate, setSelectedDate] = useState("");
  const doneEvent = (id: string) => {
    console.log("Done !");
    checkEventCompleted(id, initData);
  };
  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(event.target.value);
    // Теперь ты можешь использовать `event.target.value`
    // чтобы отправить новую дату на сервер
    console.log(
      "Новая дата выбрана:",
      event.target.value,
      typeof event.target.value
    );
    chengedEventDate(id, initData, event.target.value);
  };
  const dateString =
    typeof date === "string"
      ? date
      : new Date(date.dateTime).toISOString().split("T")[0];
  return (
    <>
      {status === "11" && (
        <div className={css.container}>
          <button onClick={() => inProgres(id)} className={css.adminButton}>
            Взяти в роботу
          </button>
          <button onClick={() => doneEvent(id)} className={css.adminButton}>
            Готово до завантаження
          </button>
          <input
            type="date"
            className={css.adminButton}
            value={selectedDate || dateString}
            onChange={handleDateChange}
          />
        </div>
      )}
      {status === "5" && (
        <div className={css.container}>
          {/* <button onClick={() => inProgres(id)} className={css.adminButton}>
            Взяти в роботу
          </button> */}
          <button onClick={() => doneEvent(id)} className={css.adminButton}>
            Готово до завантаження
          </button>
          <input
            type="date"
            className={css.adminButton}
            value={selectedDate || dateString}
            onChange={handleDateChange}
          />
        </div>
      )}
      {status === "10" && (
        <div className={css.container}>
          {/* <button onClick={() => inProgres(id)} className={css.adminButton}>
            Взяти в роботу
          </button>
          <button onClick={() => doneEvent(id)} className={css.adminButton}>
            Завантажується
          </button> */}
          <input
            type="date"
            className={css.adminButton}
            value={selectedDate || dateString}
            onChange={handleDateChange}
          />
        </div>
      )}
    </>
  );
}
