"use client";

import React, { useState, CSSProperties, Suspense } from "react";
import { useDelivery } from "@/store/Delivery";
import styles from "./DeliveryData.module.css";
import { getAddressByClient, sendDeliveryData } from "@/lib/api";
import { DeliveryPayload } from "@/types/types";
import { getInitData } from "@/lib/getInitData";
import { useSearchParams, useRouter } from "next/navigation";
import { FadeLoader } from "react-spinners";
import InputAddress from "@/components/MapModule/components/inputAddress/InputAddress";
import { User, Package, MapPin, Calendar, Phone, Trash2, Send, X, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";

// Тип для вибраного елемента для редагування в модальному вікні.
type SelectedItem = {
  id: string;
  quantity: number;
  max: number;
};

// Тип для партії товару.
type Party = {
  party: string;
  moved_q: number;
  party_quantity?: number;
};

// Тип для елемента доставки (товару).
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

// Тип для згрупованого за номером замовлення.
type GroupedOrder = {
  order: string;
  items: DeliveryItem[];
};

// Тип для згрупованого за клієнтом.
type GroupedClient = {
  client: string;
  orders: GroupedOrder[];
};

// Тип для акумулятора в `reduce` для групування даних.
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
};

type AddressData = {
  display_name: string;
  lat: string;
  lon: string;
};

const formatQuantity = (value: number): string => {
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(2);
};

function DeliveryDataContent() {
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
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isAddressChange, setIsAddressChange] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [customAddressData, setCustomAddressData] = useState<AddressData | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  React.useEffect(() => {
    const editId = searchParams.get("editId");
    if (editId && delivery.length > 0) {
      const itemToEdit = delivery.find((d) => d.id === editId);
      if (itemToEdit) {
        setSelectedItem({
          id: itemToEdit.id,
          quantity: itemToEdit.quantity,
          max: itemToEdit.orders_q || itemToEdit.quantity || 999999,
        });
        setInputValue(String(itemToEdit.quantity));
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete("editId");
        router.replace(`/delivery?${newParams.toString()}`);
      }
    }
  }, [searchParams, delivery, router]);

  const openModal = (item: SelectedItem) => {
    setSelectedItem(item);
    setInputValue(String(item.quantity));
    setError(null);
  };

  const handleSave = () => {
    if (!selectedItem) return;
    const newQuantity = Number(inputValue);
    if (inputValue.trim() === "" || isNaN(newQuantity)) {
      setError("Введіть коректну кількість");
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
      if (!acc[clientName]) acc[clientName] = { client: clientName, orders: {} };
      if (!acc[clientName].orders[orderRef]) acc[clientName].orders[orderRef] = { order: orderRef, items: [] };
      acc[clientName].orders[orderRef].items.push(item);
      return acc;
    }, {})
  ).map((clientObj) => ({
    client: clientObj.client,
    orders: Object.values(clientObj.orders),
  }));

  if (isLoading && !formClient) {
    return (
      <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FadeLoader color="#0ef18e" cssOverride={override} />
      </div>
    );
  }

  const handleAddressData = (data: AddressData | null) => {
    if (data && data.display_name) {
      setCustomAddressData(data);
      setIsGeocoding(true);
    } else {
      setCustomAddressData(null);
      setIsGeocoding(false);
    }
  };

  const handleCustomAddressApply = () => {
    if (customAddressData) {
      setFormData({
        ...formData,
        address: customAddressData.display_name,
        latitude: parseFloat(customAddressData.lat),
        longitude: parseFloat(customAddressData.lon)
      });
      setIsAddressChange(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      {grouped.length === 0 && (
        <div style={{ textAlign: 'center', padding: '100px 20px', opacity: 0.5 }}>
          <Package size={64} style={{ marginBottom: '16px' }} />
          <h3>Кошик доставки порожній</h3>
          <p>Додайте товари з розділу замовлень</p>
        </div>
      )}

      {grouped.map((client) => (
        <div key={client.client} className={styles.clientBlock}>
          <div className={styles.clientHeader}>
            <User size={20} className={styles.clientTitle} />
            <span>{client.client}</span>
          </div>

          {client.orders.map((order) => (
            <div key={order.order} className={styles.orderBlock}>
              <div className={styles.orderHeader}>
                <Package size={18} className={styles.clientTitle} />
                <span>{order.order}</span>
              </div>

              <div className={styles.table}>
                <div className={styles.rowHeader}>
                  <span>Товар</span>
                  <span>Кількість</span>
                </div>
                {order.items.map((item) => (
                  <div className={styles.row} key={item.id}>
                    <div className={styles.cell}>
                      <div style={{ fontWeight: 600 }}>{item.product}</div>
                      {item.parties && item.parties.length > 0 && (
                        <div style={{ marginTop: '4px', opacity: 0.6, fontSize: '0.8rem' }}>
                          {item.parties.map((p, idx) => p.moved_q > 0 && (
                            <div key={idx}>↳ {p.party}: {formatQuantity(p.moved_q)}</div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className={styles.quantityCell}>
                      <span className={styles.quantity} onClick={() => openModal({ id: item.id, quantity: item.quantity, max: item.orders_q || item.quantity || 999999 })}>
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
              onClick={async () => {
                setFormClient(client.client);
                setIsLoading(true);
                try {
                  const address = await getAddressByClient(client.client);
                  if (address && address.length > 0) {
                    setFormData({
                      ...formData,
                      address: `${address[0].region} обл., ${address[0].area} р-н, ${address[0].commune} громада, ${address[0].city}`,
                      contact: address[0].representative || "",
                      phone: address[0].phone1 || "",
                      latitude: address[0].latitude,
                      longitude: address[0].longitude,
                    });
                  } else {
                    setFormData({ ...formData, address: "", contact: "", phone: "", date: "", comment: "" });
                  }
                } catch (e) {
                  setFormData({ ...formData, address: "", contact: "", phone: "", date: "", comment: "" });
                } finally {
                  setIsLoading(false);
                  setFormError(null);
                }
              }}
            >
              <Send size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Оформити доставку
            </button>
            <button
              className={styles.deleteButton}
              onClick={() => removeClientDelivery(client.client)}
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      ))}

      {selectedItem && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Змінити кількість</h3>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className={styles.modalInput}
                autoFocus
              />
              <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>од.</span>
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.modalActions}>
              <button onClick={handleSave} className={styles.buttonSave}>Зберегти</button>
              <button onClick={() => setSelectedItem(null)} className={styles.buttonCancel}>Скасувати</button>
            </div>
          </div>
        </div>
      )}

      {formClient && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '600px' }}>
            <h3 className={styles.modalTitle}>Доставка: {formClient}</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className={styles.fieldGroup}>
                <label className={styles.clientTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <MapPin size={16} /> Адреса доставки
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <textarea
                    className={styles.modalInput}
                    value={formData.address}
                    readOnly={isAddressChange}
                    style={{ margin: 0 }}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value, latitude: undefined, longitude: undefined })}
                  />
                  <button 
                    onClick={() => setIsAddressChange(!isAddressChange)}
                    style={{ 
                      padding: '0 12px', 
                      background: isAddressChange ? '#ef4444' : 'rgba(255,255,255,0.1)', 
                      border: 'none', 
                      borderRadius: '12px', 
                      color: '#fff', 
                      cursor: 'pointer' 
                    }}
                  >
                    {isAddressChange ? <X size={20} /> : <MapPin size={20} />}
                  </button>
                </div>
                {isAddressChange && (
                  <div style={{ marginTop: '12px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                    <InputAddress onAddressSelect={handleAddressData}/>
                    {isGeocoding && (
                      <button onClick={handleCustomAddressApply} style={{ width: '100%', marginTop: '12px', padding: '10px', background: 'var(--accent-green)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 700 }}>
                        Підтвердити адресу
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className={styles.clientTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <User size={16} /> Отримувач
                  </label>
                  <input
                    className={styles.modalInput}
                    value={formData.contact}
                    style={{ margin: 0 }}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  />
                </div>
                <div>
                  <label className={styles.clientTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Phone size={16} /> Телефон
                  </label>
                  <input
                    type="tel"
                    className={styles.modalInput}
                    value={formData.phone}
                    style={{ margin: 0 }}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className={styles.clientTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Calendar size={16} /> Дата доставки
                  </label>
                  <input
                    type="date"
                    className={styles.modalInput}
                    value={formData.date}
                    style={{ margin: 0 }}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className={styles.clientTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <MessageSquare size={16} /> Коментар
                  </label>
                  <input
                    className={styles.modalInput}
                    value={formData.comment}
                    style={{ margin: 0 }}
                    placeholder="Додаткові інструкції..."
                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {formError && <div className={styles.error}>{formError}</div>}

            <div className={styles.modalActions}>
              <button
                disabled={isLoading}
                className={styles.buttonSave}
                style={{ padding: '16px' }}
                onClick={async () => {
                  setIsLoading(true);
                  setFormError(null);
                  const { address, contact, phone, date, comment } = formData;
                  
                  if (!address || !contact || !phone || !date) {
                    setFormError("Будь ласка, заповніть всі важливі поля");
                    setIsLoading(false);
                    return;
                  }

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

                  if (latitude === undefined || longitude === undefined) {
                    try {
                      const geocodeResponse = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`);
                      if (geocodeResponse.ok) {
                        const geocodeData = await geocodeResponse.json();
                        if (geocodeData && geocodeData.length > 0) {
                          latitude = parseFloat(geocodeData[0].lat);
                          longitude = parseFloat(geocodeData[0].lon);
                        } else {
                          setFormError("Не вдалося визначити координати адреси");
                          setIsLoading(false);
                          return;
                        }
                      } else {
                        setFormError("Помилка геокодування");
                        setIsLoading(false);
                        return;
                      }
                    } catch (e) {
                      setFormError("Помилка з'єднання");
                      setIsLoading(false);
                      return;
                    }
                  }

                  const clientData = grouped.find((c) => c.client === formClient);
                  const manager = clientData?.orders?.[0]?.items?.[0]?.manager ?? "";
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
                                      return [{ party: "", moved_q: item.quantity }];
                                  }
                                  return activeParties;
                              })(),
                              weight: item.weight,
                              orders_q: item.orders_q,
                          }));
                      return { order: order.order, items: validItems };
                  }).filter((o) => o.items.length > 0)) ?? [];

                  if (orders.length === 0) {
                      setFormError("Немає товарів для відправки");
                      setIsLoading(false);
                      return;
                  }

                  const total_weight = Math.round((orders.reduce((acc: number, order) => {
                      return acc + order.items.reduce((orderAcc: number, item) => (orderAcc + (item.quantity * (item.weight || 0))), 0);
                  }, 0) || 0) * 100) / 100;

                  const payload: DeliveryPayload = {
                    client: formClient as string,
                    manager, address, latitude, longitude, contact, phone, date, comment, total_weight, orders, status: "Створено", is_custom_address: true,
                  };

                  try {
                    const result = await sendDeliveryData(payload, getInitData());
                    if (result.status === "ok") {
                      removeClientDelivery(formClient as string);
                      setFormClient(null);
                      toast.success("Доставку оформлено!");
                    } else {
                      setFormError("Помилка сервера");
                    }
                  } catch (error) {
                    setFormError("Помилка мережі");
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                {isLoading ? "Відправка..." : "Підтвердити та відправити"}
              </button>
              <button className={styles.buttonCancel} onClick={() => setFormClient(null)}>Скасувати</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DeliveryData() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>Завантаження...</div>}>
      <DeliveryDataContent />
    </Suspense>
  );
}
