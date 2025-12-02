import React, { useState, useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import css from "./EditClientModal.module.css";
import InputAddress from "../inputAddress/InputAddress";
import { customIcon } from "../../leaflet-icon";
import toast from "react-hot-toast";

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

// ... (previous imports)

export default function EditClientModal({ isOpen, onClose, onSave, client }) {
  const [managersList, setManagersList] = useState([]);
  const [clientsList, setClientsList] = useState([]);
  const [formData, setFormData] = useState({
    client: "",
    manager: "",
    representative: "",
    phone1: "",
    phone2: "",
    address: "",
    latitude: 49.97306496577671, // Default to warehouse
    longitude: 35.984652686977824,
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
      
      setFormData({
        client: client.client || "",
        manager: client.manager || "",
        representative: client.representative || "",
        phone1: client.phone1 || "",
        phone2: client.phone2 || "",
        address: addressText,
        latitude: parseFloat(client.latitude) || 49.97306496577671,
        longitude: parseFloat(client.longitude) || 35.984652686977824,
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
      });
    }
  }, [client, isOpen, clientsList]);



  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

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
          },
          initData,
        });
        
        toast.success("Адресу клієнта оновлено успішно");
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
          },
          initData,
        });
        
        toast.success("Адресу клієнта додано успішно");
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
          <div className={css.formGroup}>
            <label>Назва клієнта</label>
            {client ? (
              // When editing - show disabled input
              <input
                className={css.input}
                name="client"
                value={formData.client}
                disabled
              />
            ) : (
              // When adding new - show select dropdown
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
          {/* ... (rest of the form) */}

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
             {/* Key forces remount when position changes significantly to avoid map issues */}
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
