"use client";

import React, { useState, CSSProperties } from "react";
import { useDelivery } from "@/store/Delivery";
import styles from "./DeliveryData.module.css";
import { sendDeliveryData } from "@/lib/api";
import BackBtn from "@/components/BackBtn/BackBtn";
import { getInitData } from "@/lib/getInitData";
import { FadeLoader } from "react-spinners";
import { fetchOrdersAndAddresses } from "@/components/MapModule/fetchOrdersWithAddresses";
import { useEffect } from "react";

type SelectedItem = {
  id: string;
  quantity: number;
  max: number;
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
  const [clientsDirectory, setClientsDirectory] = useState<ClientAddress[]>([]);

  const [formClient, setFormClient] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    address: "",
    contact: "",
    phone: "",
    date: "",
    comment: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch client directory on mount
  useEffect(() => {
    const loadClientsDirectory = async () => {
      try {
        const { addresses } = await fetchOrdersAndAddresses();
        setClientsDirectory(addresses);
      } catch (error) {
        console.error("Failed to load clients directory:", error);
      }
    };
    loadClientsDirectory();
  }, []);

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

  const grouped = (Object.values(
    delivery.reduce((acc: any, item: any) => {
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
  ) as any[]).map((clientObj: any) => ({
    client: clientObj.client,
    orders: Object.values(clientObj.orders),
  }));

  if (isLoading) {
    return <FadeLoader color="#0ef18e" cssOverride={override} />;
  }
  return (
    <div className={styles.wrapper}>
      {grouped.map((client: any) => (
        <div key={client.client} className={styles.clientBlock}>
          <div className={styles.clientHeader}>
            <span className={styles.clientTitle}>Контрагент:</span>
            <span>{client.client}</span>
          </div>

          {(client.orders as any[]).map((order: any) => (
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
                {(order.items as any[]).map((item: any) => (
                  <div className={styles.row} key={item.id}>
                    <div className={styles.cell}>
                      {/* Product Name */}
                      {item.product}
                      {/* Party details rendered underneath the product name */}
                      <div style={{ paddingTop: "5px" }}>
                        {item.parties &&
                          item.parties.length > 0 &&
                          item.parties.map(
                            (party: any, index: number) =>
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

                // Find client in directory
                const clientData = clientsDirectory.find(
                  (c) => c.client === client.client
                );

                if (clientData) {
                  // Auto-fill form with directory data
                  const addressText = `${clientData.region} обл., ${
                    clientData.area || ""
                  } район, ${clientData.commune || ""} громада, ${
                    clientData.city || ""
                  }`;
                  setFormData({
                    address: addressText.trim(),
                    contact: clientData.representative || "",
                    phone: clientData.phone1 || "",
                    date: "",
                    comment: "",
                  });
                } else {
                  // No data in directory - leave empty
                  setFormData({
                    address: "",
                    contact: "",
                    phone: "",
                    date: "",
                    comment: "",
                  });
                }

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
                    (clientData as any)?.orders?.[0]?.items?.[0]?.manager ?? "";
                  const orders =
                    (clientData as any)?.orders.map((order: any) => {
                        const validItems = (order.items as any[])
                            .filter(item => item.quantity > 0)
                            .map((item) => ({
                                product: item.product || item.nomenclature,
                                quantity: item.quantity,
                                order_ref: order.order,
                                parties: (() => {
                                    const activeParties = (item.parties || []).map((p: any) => ({
                                        party: p.party || "",
                                        moved_q: p.moved_q ?? p.party_quantity ?? 0
                                    })).filter((p: any) => p.moved_q > 0);

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
                    }).filter((o: any) => o.items.length > 0) ?? [];

                  if (orders.length === 0) {
                      setFormError("Немає товарів з кількістю > 0 для відправки");
                      setIsLoading(false);
                      return;
                  }

                  const total_weight = Math.round((orders.reduce((acc: number, order: any) => {
                      return acc + order.items.reduce((orderAcc: number, item: any) => {
                          return orderAcc + (item.quantity * (item.weight || 0));
                      }, 0);
                  }, 0) || 0) * 100) / 100;

                  const directoryData = clientsDirectory.find((c: any) => c.client === formClient);
                  
                  const defaultAddress = (directoryData as any) ? `${(directoryData as any).region} обл., ${
                    (directoryData as any).area || ""
                  } район, ${(directoryData as any).commune || ""} громада, ${
                    (directoryData as any).city || ""
                  }`.trim() : "";

                  const is_custom_address = address.trim() !== defaultAddress;

                  const payload = {
                    client: formClient,
                    manager,
                    address,
                    contact,
                    phone,
                    date,
                    comment,
                    total_weight,
                    latitude: (directoryData as any)?.latitude,
                    longitude: (directoryData as any)?.longitude,
                    is_custom_address,
                    orders,
                    status: "Створено",
                  };
                  const initData = getInitData();

                  try {
                    const result = await sendDeliveryData(payload as any, initData);

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
                    setFormError(
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
