"use client";

import React, { useState, CSSProperties } from "react";
import { useDelivery } from "@/store/Delivery";
import styles from "./DeliveryData.module.css";
import { getAddressByClient, sendDeliveryData } from "@/lib/api";
import { DeliveryPayload } from "@/types/types";
import { getInitData } from "@/lib/getInitData";
import { FadeLoader } from "react-spinners";
import InputAddress from "@/components/MapModule/components/inputAddress/InputAddress";
// import {display, width} from "@mui/system";

// Тип для выбранного элемента для редактирования в модальном окне.
type SelectedItem = {
  id: string; // Уникальный идентификатор товара.
  quantity: number; // Текущее количество товара.
  max: number; // Максимально доступное количество товара.
};

// Тип для партии товара.
type Party = {
  party: string; // Название или идентификатор партии.
  moved_q: number; // Количество товара, перемещаемое из этой партии.
  party_quantity?: number; // Общее количество в партии (опционально).
};

// Тип для элемента доставки (товара).
type DeliveryItem = {
  id: string; // Уникальный идентификатор.
  client: string; // Имя клиента.
  order: string; // Номер заказа.
  product: string; // Название товара.
  nomenclature: string; // Номенклатурное название.
  quantity: number; // Выбранное количество для доставки.
  orders_q?: number; // Общее заказанное количество.
  manager: string; // Имя менеджера.
  weight: number; // Вес единицы товара.
  parties: Party[]; // Массив партий.
};

// Тип для сгруппированного по номеру заказа.
type GroupedOrder = {
  order: string; // Номер заказа.
  items: DeliveryItem[]; // Список товаров в этом заказе.
};

// Тип для сгруппированного по клиенту.
type GroupedClient = {
  client: string; // Имя клиента.
  orders: GroupedOrder[]; // Список заказов этого клиента.
};

// Тип для аккумулятора в `reduce` для группировки данных.
type ReducerAccumulator = {
  [clientName: string]: {
    client: string;
    orders: {
      [orderRef: string]: GroupedOrder;
    };
  };
};

// Стили для оверлея загрузчика.
const override: CSSProperties = {
  display: "block",
  margin: "0 auto",
  borderColor: "red",
};

type AddressData = {
  display_name:string,
  lat:string,
  lon:string,
};

const formatQuantity = (value: number): string => {
  if (Number.isInteger(value)) {
    return value.toString();
  }
  return value.toFixed(2);
};

/**
 * Компонент страницы "DeliveryData" для отображения и управления данными о доставке.
 * Позволяет просматривать сгруппированные по клиентам и заказам товары,
 * изменять их количество, а также отправлять данные для оформления доставки.
 */
export default function DeliveryData() {
  // Получение состояния и действий из хранилища Zustand.
  const { delivery, updateQuantity, removeClientDelivery } = useDelivery();

  // Состояние для модального окна редактирования количества.
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [inputValue, setInputValue] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Состояние для индикатора загрузки.
  const [isLoading, setIsLoading] = useState(false);

  // Состояние для формы отправки данных о доставке.
  const [formClient, setFormClient] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    address: "",
    contact: "",
    phone: "",
    date: "",
    comment: "",
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isAddressChange, setIsAddressChange] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [customAddressData, setCustomAddressData] = useState<AddressData | null>(null);


  /**
   * Открывает модальное окно для изменения количества товара.
   * @param {SelectedItem} item - Выбранный товар.
   */
  const openModal = (item: SelectedItem) => {
    setSelectedItem(item);
    setInputValue(String(item.quantity));
    setError(null);
  };
  const fetchAddress = async (client: string)=>{
    try {
      return await getAddressByClient(client)
    } catch (error) {
      console.log(error);
      return []
    }


  };
  /**
   * Сохраняет новое количество товара после редактирования в модальном окне.
   */
  const handleSave = () => {
    if (!selectedItem) return;
    const newQuantity = Number(inputValue);

    if (inputValue.trim() === "") {
      setError("Кількість не може бути порожньою");
      return;
    }

    if (isNaN(newQuantity)) {
      setError("Введіть коректне число");
      return;
    }

    if (newQuantity > selectedItem.max) {
      setError(`Максимальна кількість: ${selectedItem.max}`);
      return;
    }

    updateQuantity(selectedItem.id, newQuantity);
    setSelectedItem(null);
    setError(null);
  };

  // Группировка данных о доставке по клиентам и заказам.
  const grouped: GroupedClient[] = Object.values(
    (delivery as DeliveryItem[]).reduce((acc: ReducerAccumulator, item) => {
      const clientName = item.client || "Невідомий клієнт";
      const orderRef = item.order || "Без доповнення";

      if (!acc[clientName]) {
        acc[clientName] = { client: clientName, orders: {} };
      }

      if (!acc[clientName].orders[orderRef]) {
        acc[clientName].orders[orderRef] = { order: orderRef, items: [] };
      }
      acc[clientName].orders[orderRef].items.push(item);
      return acc;
    }, {})
  ).map((clientObj) => ({
    client: clientObj.client,
    orders: Object.values(clientObj.orders),
  }));

  // Отображение загрузчика, если данные отправляются.
  if (isLoading) {
    return <FadeLoader color="#0ef18e" cssOverride={override} />;
  }


  const addressChange = ()=>{
    console.log('change');
    setIsAddressChange(!isAddressChange);
    setIsGeocoding(false);


  };

  const handleAddressData = (data: AddressData | null)=>{
    if (data && data.display_name){
      console.log("AddressData",data.display_name, data.lat, data.lon);
      setCustomAddressData(data);
      setIsGeocoding(true);
    } else {
      setCustomAddressData(null);
      setIsGeocoding(false);
    }
  };

  const handleCustomAddressApply = ()=>{
    if (customAddressData) {
      console.log('Address before', customAddressData)
      setFormData({
        ...formData,
        address: customAddressData.display_name,
        latitude: parseFloat(customAddressData.lat),
        longitude: parseFloat(customAddressData.lon)
      });
      setIsAddressChange(false); // Скрываем блок выбора адреса после применения
    }
  };

  return (
    <div className={styles.wrapper}>
      {/* Отображение сгруппированных данных */}
      {grouped.map((client) => (
        <div key={client.client} className={styles.clientBlock}>
          <div className={styles.clientHeader}>
            <span className={styles.clientTitle}>Контрагент:</span>
            <span>{client.client}</span>
          </div>

          {client.orders.map((order) => (
            <div key={order.order} className={styles.orderBlock}>
              <div className={styles.orderHeader}>
                <span className={styles.clientTitle}>Доповнення:</span>
                <span>{order.order}</span>
              </div>

              <div className={styles.table}>
                <div className={styles.rowHeader}>
                  <div className={styles.headerProduct}>Товар</div>
                  <div className={styles.headerQuantity}>Кількість</div>
                </div>
                {order.items.map((item) => (
                  <div className={styles.row} key={item.id}>
                    <div className={styles.cell}>
                      {item.product}
                      <div style={{ paddingTop: "5px" }}>
                        {item.parties &&
                          item.parties.length > 0 &&
                          item.parties.map(
                            (party, index) =>
                              party.moved_q > 0 && (
                                <div
                                  key={index}
                                  style={{
                                    fontSize: "12px",
                                    color: "#888",
                                  }}
                                >
                                  ↳ {party.party}: {formatQuantity(party.moved_q)}
                                </div>
                              )
                          )}
                      </div>
                    </div>
                    <div className={styles.quantityCell}>
                      <span
                        className={styles.quantity}
                        onClick={() =>
                          openModal({
                            id: item.id,
                            quantity: item.quantity,
                            max: item.orders_q || item.quantity || 999999,
                          })
                        }
                      >
                        {formatQuantity(item.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className={styles.deliveryActions}>
            <button
              className={styles.sendButton}
              onClick={ async () => {
                console.log(client.client);
                setFormClient(client.client);
                const address=  await fetchAddress(client.client);
                console.log(address);
                if(address && address.length > 0){
                  setFormData({
                    ...formData,
                    address: `${address[0].region} обл., ${address[0].area} р-н,  ${address[0].commune} громада, ${address[0].city}`,
                    contact: address[0].representative,
                    phone: address[0].phone1,
                    latitude: address[0].latitude,
                    longitude: address[0].longitude,
                  } );
                } else
                setFormData({
                  ...formData,
                  address: "",
                  contact: "",
                  phone: "",
                  date: "",
                  comment: "",
                });
                setFormError(null);
              }}
            >
              Відправити дані для доставки
            </button>
            <button
              className={styles.deleteButton}
              onClick={() => {
                removeClientDelivery(client.client);
                setFormClient(null);
                setFormData({
                  address: "",
                  contact: "",
                  phone: "",
                  date: "",
                  comment: "",
                  latitude: undefined,
                  longitude: undefined,
                });
                setFormError(null);
              }}
            >
              Видалити дані
            </button>
          </div>
        </div>
      ))}
      {/* <BackBtn /> */}

      {/* Модальное окно для изменения количества */}
      {selectedItem && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Змінити кількість</h3>
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className={styles.modalInput}
            />
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.modalActions}>
              <button
                onClick={handleSave}
                className={`${styles.button} ${styles.buttonSave}`}
              >
                Зберегти
              </button>
              <button
                onClick={() => setSelectedItem(null)}
                className={`${styles.button} ${styles.buttonCancel}`}
              >
                Скасувати
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно для отправки данных о доставке */}
      {formClient && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>
              Данні для доставки: {formClient}
            </h3>

            {/* Поля формы для данных о доставке */}
            <label>
              Адреса доставки:
              <div style={{display: 'flex', flexDirection: 'row', gap: '10px'}}>
              <textarea
                className={styles.modalInput}
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                  readOnly={isAddressChange}
              />
              <button style={{width: '100px', marginTop:'8px', color: 'var(--foreground)', backgroundColor:"red", border:"none", borderRadius:'5px'}}
                      onClick={addressChange}>{isAddressChange ? 'Назад' : 'Інша адреса'}</button>
              </div>
            </label>
            {isAddressChange && (
                <div style={{display: 'flex', flexDirection: 'row', gap: '10px'}}>
                <InputAddress onAddressSelect={handleAddressData}/>
                  {isGeocoding && (<button onClick={handleCustomAddressApply} style={{width: '100px', marginTop:'24px', marginBottom:'24px', color: 'var(--foreground)', backgroundColor:"green", border:"none", borderRadius:'5px'}}>Ok</button>)}

                </div>
            )}

            <label>
              Контактна особа:
              <input
                className={styles.modalInput}
                value={formData.contact}
                onChange={(e) =>
                  setFormData({ ...formData, contact: e.target.value })
                }
              />
            </label>

            <label>
              Телефон:
              <input
                type="tel"
                className={styles.modalInput}
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </label>

            <label>
              Бажана дата доставки:
              <input
                type="date"
                className={styles.modalInput}
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />
            </label>
            <label>
              Коментар:
              <textarea
                className={styles.modalInput}
                value={formData.comment}
                onChange={(e) =>
                  setFormData({ ...formData, comment: e.target.value })
                }
              />
            </label>
            {formError && <div className={styles.error}>{formError}</div>}

            <div className={styles.modalActions}>
              <button
                disabled={isLoading}
                className={`${styles.button} ${styles.buttonSave}`}
                onClick={async () => {
                  setIsLoading(true);
                  setFormError(null);
                  const { address, contact, phone, date, comment } = formData;

                  // Валидация полей формы.
                  if (!address || !contact || !phone || !date) {
                    setFormError("Будь ласка, заповніть всі поля");
                    setIsLoading(false);
                    return;
                  }

                  // Проверка, что дата доставки не в прошлом.
                  const selectedDate = new Date(date);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  if (selectedDate < today) {
                    setFormError("Дата доставки не може бути в минулому");
                    setIsLoading(false);
                    return;
                  }

                  let latitude = formData.latitude;
                  let longitude = formData.longitude;

                  // Геокодирование адреса, если координаты не были установлены вручную
                  if (latitude === undefined || longitude === undefined) {
                    try {
                      const geocodeResponse = await fetch(
                        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
                          address
                        )}&format=json&limit=1`
                      );
                      if (geocodeResponse.ok) {
                        const geocodeData = await geocodeResponse.json();
                        if (geocodeData && geocodeData.length > 0) {
                          latitude = parseFloat(geocodeData[0].lat);
                          longitude = parseFloat(geocodeData[0].lon);
                        } else {
                          setFormError(
                            "Не вдалося визначити координати для вказаної адреси. Перевірте правильність вводу."
                          );
                          setIsLoading(false);
                          return;
                        }
                      } else {
                        setFormError(
                          "Помилка сервісу геокодування. Спробуйте пізніше."
                        );
                        setIsLoading(false);
                        return;
                      }
                    } catch (e) {
                      console.error("Geocoding request failed:", e);
                      setFormError(
                        "Помилка при визначенні координат. Перевірте з'єднання з інтернетом."
                      );
                      setIsLoading(false);
                      return;
                    }
                  }


                  // Подготовка данных для отправки на сервер.
                  const clientData = grouped.find(
                    (c) => c.client === formClient
                  );
                  const manager =
                    clientData?.orders?.[0]?.items?.[0]?.manager ?? "";
                  const orders = (clientData?.orders.map((order) => {
                      const validItems = order.items
                          .filter(item => item.quantity > 0)
                          .map((item) => ({
                              product: item.product || item.nomenclature,
                              quantity: item.quantity,
                              order_ref: order.order,
                              parties: (() => {
                                  const activeParties = (item.parties || []).map((p: Party) => ({
                                      party: p.party || "",
                                      moved_q: p.moved_q ?? p.party_quantity ?? 0
                                  })).filter((p) => p.moved_q > 0);

                                  if (activeParties.length === 0 && item.quantity > 0) {
                                      return [{
                                          party: "", // Виртуальная партия
                                          moved_q: item.quantity
                                      }];
                                  }
                                  return activeParties;
                              })(),
                              weight: item.weight,
                              orders_q: item.orders_q,
                          }));
                      
                      return {
                          order: order.order,
                          items: validItems
                      };
                  }).filter((o) => o.items.length > 0)) ?? [];

                  if (orders.length === 0) {
                      setFormError("Немає товарів з кількістю > 0 для відправки");
                      setIsLoading(false);
                      return;
                  }
                  
                  const total_weight = Math.round((orders.reduce((acc: number, order) => {
                      return acc + order.items.reduce((orderAcc: number, item) => {
                          const unitWeight = (item.weight && item.orders_q) ? (item.weight) : 0;
                          return orderAcc + (item.quantity * unitWeight);
                      }, 0);
                  }, 0) || 0) * 100) / 100;

                  const payload: DeliveryPayload = {
                    client: formClient as string,
                    manager,
                    address,
                    latitude,
                    longitude,
                    contact,
                    phone,
                    date,
                    comment,
                    total_weight,
                    orders,
                    status: "Створено",
                    is_custom_address: true,
                  };
                  const initData = getInitData();

                  // Отправка данных на сервер.
                  try {
                    const result = await sendDeliveryData(payload, initData);

                    if (result.status === "ok") {
                      removeClientDelivery(formClient as string);
                      setFormClient(null);
                      setFormData({
                        address: "",
                        contact: "",
                        phone: "",
                        date: "",
                        comment: "",
                        latitude: undefined,
                        longitude: undefined,
                      });
                    } else {
                      setFormError(
                        "Сталася помилка, дані не відправлені. Спробуйте пізніше"
                      );
                    }
                  } catch (error) {
                    console.error("Network error during delivery data submission:", error); setFormError(
                      "Сталася помилка мережі, дані не відправлені."
                    );
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                {isLoading ? "Відправка..." : "Відправити"}
              </button>
              <button
                className={`${styles.button} ${styles.buttonCancel}`}
                onClick={() => setFormClient(null)}
              >
                Скасувати
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
