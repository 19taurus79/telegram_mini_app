import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import css from "./EditClientModal.module.css";
import InputAddress from "../inputAddress/InputAddress";
import { customIcon } from "../../leaflet-icon";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";

// Component to handle marker drag events
function DraggableMarker({ position, setPosition }) {
  const markerRef = useRef(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newPos = marker.getLatLng();
          setPosition({ lat: newPos.lat, lng: newPos.lng });
        }
      },
    }),
    [setPosition]
  );

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={customIcon}
    />
  );
}

// Component to update map view when position changes
function MapUpdater({ position }) {
  const map = useMapEvents({});
  useEffect(() => {
    map.flyTo(position, map.getZoom());
  }, [position, map]);
  return null;
}

import { fetchManagers } from "../../fetchManagers";
import { fetchClientsList } from "../../services/fetchFormData";
import { createClientAddress, updateClientAddress } from "@/lib/api";
import { getInitData } from "@/lib/getInitData";
import NovaPoshtaSelector from "@/components/NovaPoshta/NovaPoshtaSelector";

// ... (previous imports)

export default function EditClientModal({ isOpen, onClose, onSave, client }) {
  const queryClient = useQueryClient();
  const [managersList, setManagersList] = useState([]);
  const [clientsList, setClientsList] = useState([]);
  const [activeTab, setActiveTab] = useState("general");

  // Parse NP data from client prop once — stable per client.id
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialNpData = useMemo(() => {
    if (!client?.default_np_data) return undefined;
    if (typeof client.default_np_data === 'string') {
      try { return JSON.parse(client.default_np_data); } catch { return undefined; }
    }
    return client.default_np_data;
  }, [client?.id]); // only recompute when client changes

  const [formData, setFormData] = useState({
    client: "",
    manager: "",
    representative: "",
    phone1: "",
    phone2: "",
    address: "",
    latitude: 49.97306496577671, // Default to warehouse
    longitude: 35.984652686977824,
    // Дані авто/водія за замовчуванням
    default_car_make: "",
    default_car_number: "",
    default_trailer_number: "",
    default_driver: "",
    default_car_max_weight: "",
    default_car_own_weight: "",
    default_car_length: "",
    default_car_width: "",
    default_car_height: "",
    default_np_data: null,
  });

  useEffect(() => {
    const loadData = async () => {
        const managers = await fetchManagers();
        if (managers) setManagersList(managers);

        const clients = await fetchClientsList();
        if (clients) setClientsList(clients);
    };
    if (isOpen) {
        loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (client && isOpen) {
      const addressText = client.region 
        ? `${client.region} обл., ${client.area || ''} район, ${client.commune || ''} громада, ${client.city || ''}`
        : (client.address?.display_name || client.address || "");
      
      let parsedNpData = null;
      if (client.default_np_data) {
        if (typeof client.default_np_data === 'string') {
          try {
            parsedNpData = JSON.parse(client.default_np_data);
          } catch (e) {
            console.error("Error parsing default_np_data:", e);
          }
        } else {
          parsedNpData = client.default_np_data;
        }
      }
      
      setFormData({
        client: client.client || "",
        manager: client.manager || "",
        representative: client.representative || "",
        phone1: client.phone1 || "",
        phone2: client.phone2 || "",
        address: addressText,
        latitude: parseFloat(client.latitude) || 49.97306496577671,
        longitude: parseFloat(client.longitude) || 35.984652686977824,
        // Дані авто/водія за замовчуванням
        default_car_make: client.default_car_make || "",
        default_car_number: client.default_car_number || "",
        default_trailer_number: client.default_trailer_number || "",
        default_driver: client.default_driver || "",
        default_car_max_weight: client.default_car_max_weight !== undefined && client.default_car_max_weight !== null ? client.default_car_max_weight : "",
        default_car_own_weight: client.default_car_own_weight !== undefined && client.default_car_own_weight !== null ? client.default_car_own_weight : "",
        default_car_length: client.default_car_length !== undefined && client.default_car_length !== null ? client.default_car_length : "",
        default_car_width: client.default_car_width !== undefined && client.default_car_width !== null ? client.default_car_width : "",
        default_car_height: client.default_car_height !== undefined && client.default_car_height !== null ? client.default_car_height : "",
        default_np_data: parsedNpData,
      });
    } else if (!client && isOpen) {
      setFormData({
        client: "",
        manager: "",
        representative: "",
        phone1: "",
        phone2: "",
        address: "",
        latitude: 49.97306496577671,
        longitude: 35.984652686977824,
        default_car_make: "",
        default_car_number: "",
        default_trailer_number: "",
        default_driver: "",
        default_car_max_weight: "",
        default_car_own_weight: "",
        default_car_length: "",
        default_car_width: "",
        default_car_height: "",
        default_np_data: null,
      });
    }
  }, [client, isOpen, clientsList]);



  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNpSelect = useCallback((selection) => {
    setFormData(prev => ({ ...prev, default_np_data: selection }));
  }, []);

  const handlePhoneChange = (e) => {
    let value = e.target.value;
    // Basic mask logic for +380
    if (!value.startsWith("+380")) {
      value = "+380" + value.replace(/^\+380/, "").replace(/\D/g, "");
    } else {
      value = "+380" + value.slice(4).replace(/\D/g, "");
    }
    // Limit length
    if (value.length > 13) return;
    
    setFormData((prev) => ({ ...prev, phone1: value }));
  };

  const handleAddressSelect = (data) => {
    if (data && data.lat && data.lon) {
      setFormData((prev) => ({
        ...prev,
        address: data.display_name,
        latitude: parseFloat(data.lat),
        longitude: parseFloat(data.lon),
      }));
    }
  };

  const handleMarkerPositionChange = (newPos) => {
    setFormData((prev) => ({
      ...prev,
      latitude: newPos.lat,
      longitude: newPos.lng,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const npData = formData.default_np_data;
    const isNpPartiallyFilled = npData && (npData.city || npData.warehouse || npData.street || npData.companyEdrpou);
    
    if (isNpPartiallyFilled && !npData.isValid) {
      toast.error("Будь ласка, заповніть всі обов'язкові поля Нової Пошти");
      return;
    }
    
    const finalNpData = (npData && npData.isValid) ? npData : null;
    
    if (client && client.id) {
      // Editing existing client - call API
      try {
        const initData = getInitData();
        await updateClientAddress({
          id: client.id,
          clientData: {
            client: formData.client,
            manager: formData.manager,
            representative: formData.representative,
            phone1: formData.phone1,
            phone2: formData.phone2 || "",
            address: formData.address,
            latitude: formData.latitude,
            longitude: formData.longitude,
            default_car_make: formData.default_car_make || undefined,
            default_car_number: formData.default_car_number || undefined,
            default_trailer_number: formData.default_trailer_number || undefined,
            default_driver: formData.default_driver || undefined,
            default_car_max_weight: formData.default_car_max_weight ? parseInt(formData.default_car_max_weight, 10) : undefined,
            default_car_own_weight: formData.default_car_own_weight ? parseInt(formData.default_car_own_weight, 10) : undefined,
            default_car_length: formData.default_car_length ? parseFloat(formData.default_car_length) : undefined,
            default_car_width: formData.default_car_width ? parseFloat(formData.default_car_width) : undefined,
            default_car_height: formData.default_car_height ? parseFloat(formData.default_car_height) : undefined,
            default_np_data: finalNpData,
          },
          initData,
        });
        
        toast.success("Адресу клієнта оновлено успішно");
        queryClient.invalidateQueries({ queryKey: ["clients"] });
        // Call onSave callback to update local state
        onSave(formData);
        onClose();
      } catch (error) {
        console.error("Error updating client address:", error);
        const errorMessage = error?.response?.data?.detail || "Помилка при оновленні адреси клієнта";
        toast.error(errorMessage);
      }
    } else {
      // Adding new client - call API
      try {
        const initData = getInitData();
        await createClientAddress({
          clientData: {
            client: formData.client,
            manager: formData.manager,
            representative: formData.representative,
            phone1: formData.phone1,
            phone2: formData.phone2 || "",
            address: formData.address,
            latitude: formData.latitude,
            longitude: formData.longitude,
            default_car_make: formData.default_car_make || undefined,
            default_car_number: formData.default_car_number || undefined,
            default_trailer_number: formData.default_trailer_number || undefined,
            default_driver: formData.default_driver || undefined,
            default_car_max_weight: formData.default_car_max_weight ? parseInt(formData.default_car_max_weight, 10) : undefined,
            default_car_own_weight: formData.default_car_own_weight ? parseInt(formData.default_car_own_weight, 10) : undefined,
            default_car_length: formData.default_car_length ? parseFloat(formData.default_car_length) : undefined,
            default_car_width: formData.default_car_width ? parseFloat(formData.default_car_width) : undefined,
            default_car_height: formData.default_car_height ? parseFloat(formData.default_car_height) : undefined,
            default_np_data: finalNpData,
          },
          initData,
        });
        
        toast.success("Адресу клієнта додано успішно");
        queryClient.invalidateQueries({ queryKey: ["clients"] });
        // Call onSave callback to update local state
        onSave(formData);
        onClose();
      } catch (error) {
        console.error("Error creating client address:", error);
        const errorMessage = error?.response?.data?.detail || "Помилка при додаванні адреси клієнта";
        toast.error(errorMessage);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className={css.overlay}>
      <div className={css.modal}>
        {/* ... (header) */}
        <div className={css.header}>
          <h2>{client ? "Редагувати клієнта" : "Додати клієнта"}</h2>
          <button className={css.closeButton} onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={css.tabsContainer}>
            <button type="button" className={`${css.tabButton} ${activeTab === 'general' ? css.active : ''}`} onClick={() => setActiveTab('general')}>Основні дані</button>
            <button type="button" className={`${css.tabButton} ${activeTab === 'address' ? css.active : ''}`} onClick={() => setActiveTab('address')}>Адреса та Карта</button>
            <button type="button" className={`${css.tabButton} ${activeTab === 'car' ? css.active : ''}`} onClick={() => setActiveTab('car')}>Автомобіль</button>
            <button type="button" className={`${css.tabButton} ${activeTab === 'np' ? css.active : ''}`} onClick={() => setActiveTab('np')}>Нова Пошта</button>
          </div>

          {activeTab === 'general' && (
            <div className={css.tabContent}>
              <div className={css.formGroup}>
                <label>Назва клієнта</label>
                {client ? (
                  <input
                    className={css.input}
                    name="client"
                    value={formData.client}
                    disabled
                  />
                ) : (
                  <select
                    className={css.input}
                    name="client"
                    value={formData.client}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Оберіть клієнта</option>
                    {clientsList.map((c, index) => {
                      const clientName = typeof c === 'string' ? c : (c.client || c.name || '');
                      return (
                        <option key={index} value={clientName}>{clientName}</option>
                      );
                    })}
                  </select>
                )}
              </div>

              <div className={css.formGroup}>
                <label>Менеджер</label>
                <select
                  className={css.input}
                  name="manager"
                  value={formData.manager}
                  onChange={handleChange}
                >
                    <option value="">Оберіть менеджера</option>
                    {managersList.map((m) => (
                        <option key={m.id} value={m.manager}>{m.manager}</option>
                    ))}
                </select>
              </div>

              <div className={css.formGroup}>
                <label>Представник</label>
                <input
                  className={css.input}
                  name="representative"
                  value={formData.representative}
                  onChange={handleChange}
                />
              </div>

              <div className={css.formGroup}>
                <label>Телефон</label>
                <input
                  className={css.input}
                  name="phone1"
                  value={formData.phone1}
                  onChange={handlePhoneChange}
                  placeholder="+380XXXXXXXXX"
                />
              </div>
            </div>
          )}

          {activeTab === 'address' && (
            <div className={css.tabContent}>
              <div className={css.formGroup}>
                <label>Поточна адреса</label>
                <input
                  className={css.input}
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Адреса буде заповнена після пошуку"
                />
              </div>

              <div className={css.formGroup}>
                <label>Пошук нової адреси (опціонально)</label>
                <InputAddress 
                  key={`address-search-${isOpen}-${client?.client || 'new'}`}
                  onAddressSelect={handleAddressSelect} 
                />
              </div>

              <div className={css.mapContainer}>
                <MapContainer
                  key={`${formData.latitude}-${formData.longitude}`} 
                  center={[formData.latitude, formData.longitude]}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <DraggableMarker
                    position={[formData.latitude, formData.longitude]}
                    setPosition={handleMarkerPositionChange}
                  />
                  <MapUpdater position={[formData.latitude, formData.longitude]} />
                </MapContainer>
              </div>
              <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '5px' }}>
                * Перетягніть маркер для уточнення координат: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
              </div>
            </div>
          )}

          {activeTab === 'car' && (
            <div className={css.tabContent}>
              <div className={css.formGroup}>
                <div className={css.sectionTitle}>
                  <span className={css.sectionIcon}>🚗</span>
                  <span>Авто за замовчуванням <span className={css.sectionHint}>(для самовивозу)</span></span>
                </div>
                <div className={css.vehicleGrid}>
                  <div className={`${css.vehicleField} ${css.fullWidth}`}>
                    <label>Номер авто</label>
                    <input
                      className={css.input}
                      name="default_car_number"
                      value={formData.default_car_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, default_car_number: e.target.value.toUpperCase() }))}
                      placeholder="AX1234HP"
                    />
                  </div>
                  <div className={css.vehicleField}>
                    <label>Марка авто</label>
                    <input
                      className={css.input}
                      name="default_car_make"
                      value={formData.default_car_make}
                      onChange={handleChange}
                      placeholder="MAN, DAF, Газель..."
                    />
                  </div>
                  <div className={css.vehicleField}>
                    <label>Номер причепа <span style={{ opacity: 0.6, fontSize: '0.8em' }}>(опціонально)</span></label>
                    <input
                      className={css.input}
                      name="default_trailer_number"
                      value={formData.default_trailer_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, default_trailer_number: e.target.value.toUpperCase() }))}
                      placeholder="AX5678XX"
                    />
                  </div>
                  <div className={css.vehicleField}>
                    <label>Водій (ПІБ)</label>
                    <input
                      className={css.input}
                      name="default_driver"
                      value={formData.default_driver}
                      onChange={handleChange}
                      placeholder="Прізвище Ім'я По батькові"
                    />
                  </div>
                  <div className={css.vehicleField}>
                    <label>Повна маса (кг)</label>
                    <input
                      className={css.input}
                      type="number"
                      name="default_car_max_weight"
                      value={formData.default_car_max_weight}
                      onChange={handleChange}
                      placeholder="Наприклад: 18000"
                    />
                  </div>
                  <div className={css.vehicleField}>
                    <label>Маса без навантаження (кг)</label>
                    <input
                      className={css.input}
                      type="number"
                      name="default_car_own_weight"
                      value={formData.default_car_own_weight}
                      onChange={handleChange}
                      placeholder="Наприклад: 8500"
                    />
                  </div>
                  <div className={css.vehicleField}>
                    <label>Довжина (м)</label>
                    <input
                      className={css.input}
                      type="number"
                      step="0.1"
                      name="default_car_length"
                      value={formData.default_car_length}
                      onChange={handleChange}
                      placeholder="Наприклад: 8.2"
                    />
                  </div>
                  <div className={css.vehicleField}>
                    <label>Ширина (м)</label>
                    <input
                      className={css.input}
                      type="number"
                      step="0.1"
                      name="default_car_width"
                      value={formData.default_car_width}
                      onChange={handleChange}
                      placeholder="Наприклад: 2.5"
                    />
                  </div>
                  <div className={css.vehicleField}>
                    <label>Висота (м)</label>
                    <input
                      className={css.input}
                      type="number"
                      step="0.1"
                      name="default_car_height"
                      value={formData.default_car_height}
                      onChange={handleChange}
                      placeholder="Наприклад: 3.6"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'np' && (
            <div className={css.tabContent}>
              <div className={css.formGroup}>
                <div className={css.sectionTitle}>
                  <span className={css.sectionIcon}>📦</span>
                  <span>Нова Пошта за замовчуванням</span>
                </div>
                <div style={{ marginTop: '15px' }}>
                  <NovaPoshtaSelector 
                    key={client?.id || 'new'}
                    onSelect={handleNpSelect}
                    initialSelection={initialNpData}
                  />
                </div>
              </div>
            </div>
          )}

          <div className={css.actions}>
            <button type="button" className={`${css.button} ${css.cancelButton}`} onClick={onClose}>
              Скасувати
            </button>
            <button type="submit" className={`${css.button} ${css.saveButton}`}>
              Зберегти
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
