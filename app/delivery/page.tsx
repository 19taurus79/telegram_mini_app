"use client";

import React, { useState, CSSProperties } from "react";
import { useDelivery } from "@/store/Delivery";
import styles from "./DeliveryData.module.css";
import { sendDeliveryData } from "@/lib/api";
import { DeliveryPayload } from "@/types/types";
import BackBtn from "@/components/BackBtn/BackBtn";
import { getInitData } from "@/lib/getInitData";
import { FadeLoader } from "react-spinners";

type SelectedItem = {
  id: string;
  quantity: number;
  max: number;
};

type Party = {
  party: string;
  moved_q: number;
  party_quantity?: number;
};

type DeliveryItem = {
  id: string;
  client: string;
  order: string;
  product: string;
  nomenclature: string;
  quantity: number;
  orders_q?: number;
  manager: string;
  weight: number;
  parties: Party[];
};

type GroupedOrder = {
  order: string;
  items: DeliveryItem[];
};

type ClientAddress = {
  client: string;
  representative: string;
  phone1: string;
  region: string;
  area: string;
  commune: string;
  city: string;
  latitude: number;
  longitude: number;
};

type GroupedClient = {
  client: string;
  orders: GroupedOrder[];
};

type ReducerAccumulator = {
  [clientName: string]: {
    client: string;
    orders: {
      [orderRef: string]: GroupedOrder;
    };
  };
};

const override: CSSProperties = {
  display: "block",
  margin: "0 auto",
  borderColor: "red",
};
export default function DeliveryData() {
  const { delivery, updateQuantity, removeClientDelivery } = useDelivery();

  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [inputValue, setInputValue] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formClient, setFormClient] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    address: "",
    contact: "",
    phone: "",
    date: "",
    comment: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  const openModal = (item: SelectedItem) => {
    setSelectedItem(item);
    setInputValue(String(item.quantity));
    setError(null);
  };

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

  if (isLoading) {
    return <FadeLoader color="#0ef18e" cssOverride={override} />;
  }
  return (
    <div className={styles.wrapper}>
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
                      {/* Product Name */}
                      {item.product}
                      {/* Party details rendered underneath the product name */}
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
                                  ↳ {party.party}: {party.moved_q}
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
                        {item.quantity}
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
              onClick={() => {
                setFormClient(client.client);
                setFormData({
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
                removeClientDelivery(client.client); // ❌ Удаление данных
                setFormClient(null);
                setFormData({
                  address: "",
                  contact: "",
                  phone: "",
                  date: "",
                  comment: "",
                });
                setFormError(null);
              }}
            >
              Видалити дані
            </button>
          </div>
        </div>
      ))}
      <BackBtn />

      {/* Модалка изменения количества */}
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

      {/* Модалка отправки данных */}

      {formClient && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>
              Данні для доставки: {formClient}
            </h3>

            <label>
              Адреса доставки:
              <textarea
                className={styles.modalInput}
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </label>

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
                  if (!address || !contact || !phone || !date) {
                    setFormError("Будь ласка, заповніть всі поля");
                    setIsLoading(false);
                    return;
                  }
                  // Проверка даты
                  const selectedDate = new Date(date);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0); // чтобы сравнивать только по дню

                  if (selectedDate < today) {
                    setFormError("Дата доставки не може бути в минулому");
                    setIsLoading(false);
                    return;
                  }

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
                                          party: "", // Віртуальна партія
                                          moved_q: item.quantity
                                      }];
                                  }
                                  return activeParties;
                              })(),
                              weight: item.weight,
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
                          const unitWeight = (item.weight && item.orders_q) ? (item.weight / item.orders_q) : 0;
                          return orderAcc + (item.quantity * unitWeight);
                      }, 0);
                  }, 0) || 0) * 100) / 100;

                  const payload: DeliveryPayload = {
                    client: formClient,
                    manager,
                    address,
                    contact,
                    phone,
                    date,
                    comment,
                    total_weight,
                    orders,
                    status: "Створено",
                  };
                  const initData = getInitData();

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
