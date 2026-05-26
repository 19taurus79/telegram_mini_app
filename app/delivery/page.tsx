"use client";

import React, { useState, CSSProperties, Suspense } from "react";
import { useDelivery } from "@/store/Delivery";
import styles from "./DeliveryData.module.css";
import { getAddressByClient, sendDeliveryData } from "@/lib/api";
import NovaPoshtaSelector, { NPSelection } from "@/components/NovaPoshta/NovaPoshtaSelector";
import { DeliveryPayload } from "@/types/types";
import { getInitData } from "@/lib/getInitData";
import { useSearchParams, useRouter } from "next/navigation";
import { FadeLoader } from "react-spinners";
import InputAddress from "@/components/MapModule/components/inputAddress/InputAddress";
import { User, Package, MapPin, Calendar, Phone, Trash2, Send, X, MessageSquare, Truck, Box, Car, FileText } from "lucide-react";
import toast from "react-hot-toast";
import { useSwipeToClose } from "@/hooks/useSwipeToClose";
import { useUser } from "@/store/User";

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

// Функция для форматирования номера телефона в формат +380 (XX) XXX-XX-XX
const formatPhoneNumber = (value: string): string => {
  if (!value) return "+380";
  
  // Оставляем только цифры
  let digits = value.replace(/\D/g, "");
  
  // Если номер не начинается с 380, добавляем
  if (!digits.startsWith("380")) {
    // Если пользователь удалил 380, но ввел что-то другое, 
    // пробуем прикрепить это к префиксу
    if (digits.length > 0 && digits.length <= 9) {
       digits = "380" + digits;
    } else if (digits.length === 0) {
       return "+380";
    }
  }
  
  // Ограничиваем 12 цифрами (380 + 9 цифр номера)
  digits = digits.slice(0, 12);
  
  let formatted = "+380";
  
  // Форматируем оставшуюся часть
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

function DeliveryDataContent() {
  const [isAnimatingSuccess, setIsAnimatingSuccess] = useState(false);
  
  const { delivery, removeClientDelivery, updateQuantity } = useDelivery();
  const userData = useUser(state => state.userData);
  const actorName = userData?.full_name_for_orders || "";
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
    isPickup: false,
    isNP: false,
    needTTN: false,
    ttnType: "self" as "self" | "client",
    carMake: "",
    carNumber: "",
    trailerNumber: "",
    driver: "",
  });
  const [npSelection, setNpSelection] = useState<NPSelection | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isAddressChange, setIsAddressChange] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [customAddressData, setCustomAddressData] = useState<AddressData | null>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const searchParams = useSearchParams();
  const router = useRouter();

  const swipeSelectedItem = useSwipeToClose({ onClose: () => setSelectedItem(null), threshold: 120 });
  const swipeFormClient = useSwipeToClose({ onClose: () => setFormClient(null), threshold: 150 });

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
        <div className={styles.emptyState}>
          <Package size={64} className={styles.emptyIcon} />
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
                      <div className={styles.productName}>{item.product}</div>
                      {item.parties && item.parties.length > 0 && (
                        <div className={styles.partiesList}>
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
                      address: `${address[0].region} обл., ${address[0].area} р-н, ${address[0].commune} громада, ${address[0].city}`,
                      contact: address[0].representative || "",
                      phone: formatPhoneNumber(address[0].phone1 || ""),
                      latitude: address[0].latitude,
                      longitude: address[0].longitude,
                      date: "",
                      comment: "",
                      isPickup: false,
                      isNP: false,
                      needTTN: false,
                      ttnType: "self",
                      carMake: "",
                      carNumber: "",
                      trailerNumber: "",
                      driver: "",
                    });
                  } else {
                    setFormData({
                      address: "",
                      contact: "",
                      phone: "",
                      date: "",
                      comment: "",
                      latitude: undefined,
                      longitude: undefined,
                      isPickup: false,
                      isNP: false,
                      needTTN: false,
                      ttnType: "self",
                      carMake: "",
                      carNumber: "",
                      trailerNumber: "",
                      driver: "",
                    });
                  }
                } catch {
                  setFormData({
                    address: "",
                    contact: "",
                    phone: "",
                    date: "",
                    comment: "",
                    latitude: undefined,
                    longitude: undefined,
                    isPickup: false,
                    isNP: false,
                    needTTN: false,
                    ttnType: "self",
                    carMake: "",
                    carNumber: "",
                    trailerNumber: "",
                    driver: "",
                  });
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
        <div className={styles.modalOverlay} onClick={() => setSelectedItem(null)}>
          <div 
            className={styles.modal} 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              transform: swipeSelectedItem.offsetY > 0 ? `translateY(${swipeSelectedItem.offsetY}px)` : undefined,
              transition: swipeSelectedItem.offsetY === 0 ? 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none'
            }}
          >
            <div className={styles.dragHandle} {...swipeSelectedItem.handlers} />
            <div className={styles.modalHeader} {...swipeSelectedItem.handlers}>
              <h3 className={styles.modalTitle}>Змінити кількість</h3>
            </div>
            <div className={styles.modalBody} style={{ paddingTop: '10px' }}>
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
            </div>
            <div className={styles.modalFooter}>
              <div className={styles.modalActions}>
                <button onClick={handleSave} className={styles.buttonSave}>Зберегти</button>
                <button onClick={() => setSelectedItem(null)} className={styles.buttonCancel}>Скасувати</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {formClient && (
        <div className={styles.modalOverlay}>
          <div 
            className={styles.modal} 
            style={{ 
              maxWidth: '600px',
              transform: swipeFormClient.offsetY > 0 ? `translateY(${swipeFormClient.offsetY}px)` : undefined,
              transition: swipeFormClient.offsetY === 0 ? 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.dragHandle} {...swipeFormClient.handlers} />
            <div className={styles.modalHeader} {...swipeFormClient.handlers}>
              <h3 className={styles.modalTitle}>Доставка: {formClient}</h3>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.deliveryTabs}>
                <button 
                  className={`${styles.deliveryTab} ${!formData.isPickup && !formData.isNP ? styles.active : ""}`}
                  onClick={() => setFormData(prev => ({ ...prev, isPickup: false, isNP: false }))}
                >
                  <Truck size={18} /> Доставка
                </button>
                <button 
                  className={`${styles.deliveryTab} ${formData.isPickup ? styles.active : ""}`}
                  onClick={() => setFormData(prev => ({ ...prev, isPickup: true, isNP: false }))}
                >
                  <Package size={18} /> Самовивіз
                </button>
                <button 
                  className={`${styles.deliveryTab} ${formData.isNP ? styles.active : ""}`}
                  onClick={() => setFormData(prev => ({ ...prev, isPickup: false, isNP: true }))}
                >
                  <Box size={18} /> Нова Пошта
                </button>
              </div>

              {formData.isNP && (
                <div className={styles.npSection}>
                  <NovaPoshtaSelector 
                    onSelect={(selection) => setNpSelection(selection)}
                  />
                </div>
              )}

              {!formData.isPickup && !formData.isNP && (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    <MapPin size={16} /> Адреса доставки
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <textarea
                      className={`${styles.modalInput} ${errors.address ? styles.invalid : ''}`}
                      value={formData.address}
                      readOnly={true}
                      rows={3}
                      style={{ margin: 0, resize: 'none' }}
                      placeholder="Оберіть адресу через карту"
                    />
                    <button
                      onClick={() => setIsAddressChange(!isAddressChange)}
                      className={`${styles.addressToggleButton} ${isAddressChange ? styles.active : ''}`}
                    >
                      {isAddressChange ? <X size={20} /> : <MapPin size={20} />}
                    </button>
                  </div>
                  {isAddressChange && (
                    <div className={styles.geocodingWrapper}>
                      <InputAddress onAddressSelect={handleAddressData}/>
                      {isGeocoding && (
                        <button onClick={handleCustomAddressApply} className={styles.confirmAddressButton}>
                          Підтвердити адресу
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!formData.isPickup && (
                <div>
                  <label className={styles.fieldLabel}>
                    <User size={16} /> Отримувач
                  </label>
                  <input
                    className={`${styles.modalInput} ${errors.contact ? styles.invalid : ''}`}
                    value={formData.contact}
                    onChange={(e) => {
                      setFormData({ ...formData, contact: e.target.value });
                      if (errors.contact) setErrors({ ...errors, contact: false });
                    }}
                  />
                </div>
              )}

              {!formData.isPickup && (
                <div>
                  <label className={styles.fieldLabel}>
                    <Phone size={16} /> Телефон
                  </label>
                  <input
                    type="tel"
                    className={`${styles.modalInput} ${errors.phone ? styles.invalid : ''}`}
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) });
                      if (errors.phone) setErrors({ ...errors, phone: false });
                    }}
                    onFocus={(e) => {
                      if (!e.target.value) {
                        setFormData({ ...formData, phone: "+380" });
                        if (errors.phone) setErrors({ ...errors, phone: false });
                      }
                    }}
                    placeholder="+380 (XX) XXX-XX-XX"
                  />
                </div>
              )}

              {formData.isPickup && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className={`${styles.pickupToggleContainer} ${formData.needTTN ? styles.active : ""}`}>
                    <div className={styles.pickupToggleLeft}>
                      <span className={styles.pickupToggleIcon}>
                        <FileText size={20} />
                      </span>
                      <label htmlFor="need-ttn-toggle" className={styles.pickupToggleLabel} style={{ cursor: 'pointer' }}>
                        Потрібна ТТН
                      </label>
                    </div>
                    <label className={styles.switch}>
                      <input 
                        id="need-ttn-toggle"
                        type="checkbox" 
                        checked={formData.needTTN} 
                        onChange={(e) => setFormData(prev => ({ ...prev, needTTN: e.target.checked }))} 
                      />
                      <span className={styles.slider}></span>
                    </label>
                  </div>

                  {formData.needTTN && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>Хто забирає вантаж?</label>
                        <div className={styles.deliveryTabs}>
                          <button 
                            type="button"
                            className={`${styles.deliveryTab} ${formData.ttnType === "self" ? styles.active : ""}`}
                            onClick={() => setFormData(prev => ({ ...prev, ttnType: "self" }))}
                          >
                            Забираю сам
                          </button>
                          <button 
                            type="button"
                            className={`${styles.deliveryTab} ${formData.ttnType === "client" ? styles.active : ""}`}
                            onClick={() => setFormData(prev => ({ ...prev, ttnType: "client" }))}
                          >
                            Забирає клієнт
                          </button>
                        </div>
                      </div>

                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>
                          <MapPin size={16} /> Адреса доставки
                        </label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <textarea
                            className={`${styles.modalInput} ${errors.address ? styles.invalid : ''}`}
                            value={formData.address}
                            readOnly={true}
                            rows={3}
                            style={{ margin: 0, resize: 'none' }}
                            placeholder="Оберіть адресу через карту"
                          />
                          <button
                            type="button"
                            onClick={() => setIsAddressChange(!isAddressChange)}
                            className={`${styles.addressToggleButton} ${isAddressChange ? styles.active : ''}`}
                          >
                            {isAddressChange ? <X size={20} /> : <MapPin size={20} />}
                          </button>
                        </div>
                        {isAddressChange && (
                          <div className={styles.geocodingWrapper}>
                            <InputAddress onAddressSelect={handleAddressData}/>
                            {isGeocoding && (
                              <button type="button" onClick={handleCustomAddressApply} className={styles.confirmAddressButton}>
                                Підтвердити адресу
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {formData.ttnType === "client" && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div>
                            <label className={styles.fieldLabel}>
                              <Car size={16} /> Марка авто
                            </label>
                            <input
                              className={`${styles.modalInput} ${errors.carMake ? styles.invalid : ''}`}
                              value={formData.carMake}
                              placeholder="Наприклад: MAN, DAF, Газель"
                              onChange={(e) => {
                                setFormData({ ...formData, carMake: e.target.value });
                                if (errors.carMake) setErrors({ ...errors, carMake: false });
                              }}
                            />
                          </div>

                          <div>
                            <label className={styles.fieldLabel}>
                              <FileText size={16} /> Номер авто
                            </label>
                            <input
                              className={`${styles.modalInput} ${errors.carNumber ? styles.invalid : ''}`}
                              value={formData.carNumber}
                              placeholder="Наприклад: AX1234HP"
                              onChange={(e) => {
                                setFormData({ ...formData, carNumber: e.target.value.toUpperCase() });
                                if (errors.carNumber) setErrors({ ...errors, carNumber: false });
                              }}
                            />
                          </div>

                          <div>
                            <label className={styles.fieldLabel}>
                              <FileText size={16} /> Номер причепа (опціонально)
                            </label>
                            <input
                              className={styles.modalInput}
                              value={formData.trailerNumber}
                              placeholder="Наприклад: AX5678XX"
                              onChange={(e) => {
                                setFormData({ ...formData, trailerNumber: e.target.value.toUpperCase() });
                              }}
                            />
                          </div>

                          <div>
                            <label className={styles.fieldLabel}>
                              <User size={16} /> Водій (ПІБ)
                            </label>
                            <input
                              className={`${styles.modalInput} ${errors.driver ? styles.invalid : ''}`}
                              value={formData.driver}
                              placeholder="Прізвище, Ім'я, По батькові"
                              onChange={(e) => {
                                setFormData({ ...formData, driver: e.target.value });
                                if (errors.driver) setErrors({ ...errors, driver: false });
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className={styles.inputWithIcon}>
                <label className={styles.fieldLabel}>
                  <Calendar size={16} /> Дата доставки
                </label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={18} className={styles.inputIcon} />
                  <input
                    type="date"
                    className={`${styles.modalInput} ${errors.date ? styles.invalid : ''}`}
                    value={formData.date}
                    onChange={(e) => {
                      setFormData({ ...formData, date: e.target.value });
                      if (errors.date) setErrors({ ...errors, date: false });
                    }}
                  />
                </div>
              </div>

              <div>
                <label className={styles.fieldLabel}>
                  <MessageSquare size={16} /> Коментар
                </label>
                <textarea
                  className={styles.modalInput}
                  value={formData.comment}
                  rows={2}
                  placeholder="Додаткові інструкції..."
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                />
              </div>

              {formError && <div className={styles.error}>{formError}</div>}
            </div>

            <div className={styles.modalFooter}>
              <div className={styles.modalActions}>
                <button
                  disabled={isLoading}
                  className={styles.buttonSave}
                  style={{ padding: '16px' }}
                  onClick={async (e) => {
                    if (isLoading) return;
                    const btn = e.currentTarget;
                    btn.disabled = true;
                    try {
                      setIsLoading(true);
                      setFormError(null);
                      const { address, contact, phone, date, comment, isPickup, isNP, needTTN, ttnType, carMake, carNumber, trailerNumber, driver } = formData;
                      
                      if (isNP && (!npSelection || !npSelection.isValid)) {
                        setFormError("Будь ласка, заповніть всі обов'язкові поля Нової Пошти");
                        setIsLoading(false);
                        return;
                      }

                      const newErrors: Record<string, boolean> = {};
                      if (!address && !isPickup && !isNP) newErrors.address = true;
                      if (isPickup && needTTN && !address) newErrors.address = true;
                      if (!isPickup && !contact) newErrors.contact = true;
                      if (!isPickup && (!phone || phone.length < 19)) newErrors.phone = true;
                      if (!date) newErrors.date = true;

                      if (isPickup && needTTN && ttnType === "client") {
                        if (!carMake) newErrors.carMake = true;
                        if (!carNumber) newErrors.carNumber = true;
                        if (!driver) newErrors.driver = true;
                      }

                      if (Object.keys(newErrors).length > 0) {
                        setErrors(newErrors);
                        setFormError("Будь ласка, заповніть всі обов'язкові поля");
                        setIsLoading(false);
                        return;
                      }

                      const selectedDate = new Date(date);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      if (selectedDate < today) {
                        setErrors({ date: true });
                        setFormError("Дата доставки не може бути в минулому");
                        setIsLoading(false);
                        return;
                      }

                      let latitude = formData.latitude;
                      let longitude = formData.longitude;
                      let finalAddress = address;
                      let finalContact = contact;

                      if (isNP && npSelection) {
                        const region = npSelection.city?.area ? `${npSelection.city.area} обл., ` : "";
                        const area = npSelection.city?.region ? `${npSelection.city.region} р-н, ` : "";
                        const city = npSelection.city?.main_description || "";
                        const fullCity = `${region}${area}${city}`;
                        
                        const deliveryType = npSelection.deliveryType === "branch" ? "Відділення" : 
                                            npSelection.deliveryType === "postomat" ? "Поштомат" : "Адресна доставка";
                        const warehouse = npSelection.warehouse?.description || npSelection.address;
                        
                        if (npSelection.recipientType === "company") {
                          finalContact = `${npSelection.companyName} (ЄДРПОУ: ${npSelection.companyEdrpou}), представник: ${contact}`;
                        } else {
                          finalContact = contact;
                        }
                        
                        const payerNote = npSelection.payer === "sender" ? "Оплата: Відправник" : "Оплата: Отримувач";
                        const paymentNote = npSelection.paymentMethod === "cash" ? "Готівка" : "Безготковковий";
                        
                        finalAddress = `Нова Пошта: ${fullCity}, ${deliveryType}: ${warehouse} | ${payerNote} | ${paymentNote}`;
                        
                        latitude = 0;
                        longitude = 0;
                      } else if (((!isPickup && !isNP) || (isPickup && needTTN)) && (latitude === undefined || longitude === undefined)) {
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
                        } catch {
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
                                      })).filter((p: { party: string; moved_q: number }) => p.moved_q > 0);
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

                      const payloadStatus = isPickup ? "Самовивіз" : (isNP ? "Нова Пошта" : "Створено");

                      let finalComment = comment;
                      if (isPickup) {
                        if (needTTN) {
                          if (ttnType === "client") {
                            const trailerPart = trailerNumber ? `, Причіп: ${trailerNumber}` : "";
                            finalComment = `САМОВИВІЗ (ТТН, Забирає клієнт). Авто: ${carMake}, Номер: ${carNumber}${trailerPart}, Водій: ${driver}. Адреса: ${finalAddress}\n\n${comment}`.trim();
                          } else {
                            finalComment = `САМОВИВІЗ (ТТН, Забираю сам). Адреса: ${finalAddress}\n\n${comment}`.trim();
                          }
                        } else {
                          finalComment = `САМОВИВІЗ. ${comment}`.trim();
                        }
                      } else if (isNP) {
                        const fullNPInfo = `${finalAddress} | Отримувач: ${finalContact} | Тел: ${phone}`;
                        finalComment = `${fullNPInfo}\n\n${comment}`.trim();
                      }

                      const payload: DeliveryPayload = {
                        client: formClient as string,
                        manager, 
                        address: isPickup ? "Самовивіз" : finalAddress, 
                        latitude: isPickup ? 0 : latitude, 
                        longitude: isPickup ? 0 : longitude, 
                        contact: finalContact, 
                        phone, 
                        date, 
                        comment: finalComment, 
                        total_weight, 
                        orders, 
                        status: payloadStatus, 
                        is_custom_address: true,
                        actor_name: actorName,
                      };

                      try {
                        const result = await sendDeliveryData(payload, getInitData());
                        
                        // Відображаємо попередження, якщо вони є
                        if (result && result.warnings && result.warnings.length > 0) {
                          result.warnings.forEach(warn => toast(warn, { icon: '⚠️', duration: 6000 }));
                        }

                        if (result.status === "ok") {
                          setIsAnimatingSuccess(true);
                          setTimeout(() => {
                            setIsAnimatingSuccess(false);
                            removeClientDelivery(formClient as string);
                            setFormClient(null);
                            toast.success("Доставку оформлено!");
                          }, 3000);
                        } else {
                          setFormError("Помилка сервера");
                        }
                      } catch {
                        setFormError("Помилка мережі");
                      } finally {
                        setIsLoading(false);
                      }
                    } finally {
                      btn.disabled = false;
                    }
                  }}
                >
                  {isLoading ? "Відправка..." : "Підтвердити та відправити"}
                </button>
                <button className={styles.buttonCancel} onClick={() => setFormClient(null)}>Скасувати</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAnimatingSuccess && (
        <div className={styles.animationOverlay}>
          <div className={styles.animationContainer}>
            <Package size={80} className={styles.packageIcon} />
            <Box size={100} className={styles.boxIcon} />
            <Truck size={120} className={styles.truckIcon} />
            <div className={styles.successText}>Відправлено!</div>
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
