"use client";
// import { InnerEvent } from "@/types/types";
import css from "./detail.module.css";
import { getInitData } from "@/lib/getInitData";
import {getEventById, getTelegramIdByEventId, getUserByinitData} from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import AdminBtnInEvent from "@/components/AdminsBtnInEvent/AdminBtnInEvent";
import { CSSProperties } from "react";
import { FadeLoader } from "react-spinners";
const override: CSSProperties = {
  display: "block",
  margin: "0 auto",
};
// Функция для получения данных, которая принимает id
const fetchEventsDetail = async (id: string) => {
  const initData = getInitData();
  const events = await getEventById(id);
  // Предполагаем, что вам нужно получить пользователя, если нет, то уберите эту строку
  const user = await getUserByinitData(initData);
  const telegram_id = await getTelegramIdByEventId(id)
  return {
    ...events,
    user,
    telegram_id
  };
};

// Компонент, который принимает id через пропсы
export default function DetailEvent({ id }: { id: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["eventsDetail", id],
    queryFn: () => fetchEventsDetail(id),
  });

  // Если данные загружаются, покажем сообщение
  if (isLoading) {
    return <FadeLoader color="#0ef18e" cssOverride={override} />;
  }

  // Если данных нет, покажем сообщение об ошибке
  if (!data) {
    return <div>Событие не найдено.</div>;
  }

  // Если данные успешно загружены
  return (
    <>
      <div className={css.listContainer}>
        <div className={css.listItemButton}>
          {data.description.split("\n").map((description, index) => (
            <div key={index}>
              <p>{description}</p>
            </div>
          ))}
        </div>
      </div>
      {data?.user?.is_admin && (
        <AdminBtnInEvent id={id} date={data.start} status={data.colorId} telegramId={data.telegram_id} text={data.description}/>
      )}
    </>
  );
}
