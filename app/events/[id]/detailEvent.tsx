"use client";
// import { InnerEvent } from "@/types/types";
import css from "./detail.module.css";
import taskCartCss from "@/components/TaskCart/TaskCart.module.css";
import { getInitData } from "@/lib/getInitData";
import {getEventById, getTelegramIdByEventId, getUserByinitData, getDeliveryByEvent} from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
// import AdminBtnInEvent from "@/components/AdminsBtnInEvent/AdminBtnInEvent";
import { CSSProperties } from "react";
import { FadeLoader } from "react-spinners";
import { Truck } from "lucide-react";

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

  // Fetch actual delivery details matching the calendar event ID
  const { data: deliveryData } = useQuery({
    queryKey: ["deliveryByEvent", id],
    queryFn: () => getDeliveryByEvent(id),
    enabled: !!id,
  });

  // Если данные загружаются, покажем сообщение
  if (isLoading) {
    return <FadeLoader color="#0ef18e" cssOverride={override} />;
  }

  // Если данных нет, покажем сообщение об ошибке
  if (!data) {
    return <div>Событие не найдено.</div>;
  }

  // Group batches under products
  const groupedItems = deliveryData?.items ? Object.values(
    deliveryData.items.reduce((acc, item) => {
      const prod = item.product;
      if (!acc[prod]) {
        acc[prod] = {
          product: prod,
          quantity: item.quantity,
          batches: [],
        };
      }
      if (item.party) {
        acc[prod].batches.push({
          party: item.party,
          quantity: item.party_quantity || 0,
        });
      }
      return acc;
    }, {} as Record<string, { product: string; quantity: number; batches: { party: string; quantity: number }[] }>)
  ) : [];

  // Если данные успешно загружены
  return (
    <>
      <div className={css.listContainer}>
        <div className={css.listItemButton}>
          {data.description.split("\n").map((description, index) => (
            <p key={index}>{description}</p>
          ))}
        </div>

        {/* ── Actual Delivery Section ── */}
        {deliveryData?.found && deliveryData.delivery && (
          <div className={taskCartCss.card} style={{ margin: 0, animation: 'none' }}>
            <div className={taskCartCss.deliverySection}>
              <div className={taskCartCss.deliveryHeader}>
                <Truck size={20} strokeWidth={2} />
                <h2 className={taskCartCss.deliveryTitle}>Фактична доставка</h2>
                <span className={taskCartCss.deliveryBadge}>{deliveryData.delivery.status}</span>
              </div>

              <ul className={taskCartCss.notesList}>
                <li className={taskCartCss.noteRow}>
                  <span className={taskCartCss.noteKey}>Адреса</span>
                  <span className={taskCartCss.noteVal}>{deliveryData.delivery.address || "Не вказано"}</span>
                </li>
                <li className={taskCartCss.noteRow}>
                  <span className={taskCartCss.noteKey}>Дата</span>
                  <span className={taskCartCss.noteVal}>{deliveryData.delivery.delivery_date || "Не вказано"}</span>
                </li>
                {deliveryData.delivery.comment && (
                  <li className={taskCartCss.noteRow}>
                    <span className={taskCartCss.noteKey}>Коментар</span>
                    <span className={taskCartCss.noteVal}>{deliveryData.delivery.comment}</span>
                  </li>
                )}
                {deliveryData.delivery.total_weight ? (
                  <li className={taskCartCss.noteRow}>
                    <span className={taskCartCss.noteKey}>Вага</span>
                    <span className={taskCartCss.noteVal}>{deliveryData.delivery.total_weight} кг</span>
                  </li>
                ) : null}
              </ul>

              {groupedItems.length > 0 && (
                <>
                  <div className={taskCartCss.deliveryItemsTitle}>Товари та партії</div>
                  <div className={taskCartCss.deliveryItemList}>
                    {groupedItems.map((item, idx) => (
                      <div key={idx} className={taskCartCss.deliveryItemRow}>
                        <div className={taskCartCss.itemHeader}>
                          <span className={taskCartCss.itemName}>{item.product}</span>
                          <span className={taskCartCss.itemQty}>{item.quantity} шт</span>
                        </div>
                        {item.batches.length > 0 && (
                          <div className={taskCartCss.batchList}>
                            {item.batches.map((batch, bIdx) => (
                              <div key={bIdx} className={taskCartCss.batchRow}>
                                <span className={taskCartCss.batchName}>Партія: {batch.party}</span>
                                <span className={taskCartCss.batchQty}>{batch.quantity} шт</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      {/*{data?.user?.is_admin && (*/}
      {/*  <AdminBtnInEvent id={id} date={data.start} status={data.colorId} telegramId={data.telegram_id} text={data.description}/>*/}
      {/*)}*/}
    </>
  );
}
