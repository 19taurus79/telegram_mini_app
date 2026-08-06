import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import css from "./EditClientModal.module.css";
import InputAddress from "../inputAddress/InputAddress";
import { customIcon } from "../../leaflet-icon";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, User, MapPin, Truck, Package, Phone, UserCog, Building2 } from "lucide-react";

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
    <Marker draggable={true} eventHandlers={eventHandlers} position={position} ref={markerRef} icon={customIcon} />
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

const DEFAULT_LAT = 49.97306496577671;
const DEFAULT_LNG = 35.984652686977824;

export default function EditClientModal({ isOpen, onClose, onSave, client }) {
  const queryClient = useQueryClient();
  const [managersList, setManagersList] = useState([]);
  const [clientsList, setClientsList] = useState([]);
  
  const [expandedSections, setExpandedSections] = useState({
    general: true,
    address: true,
    car: false,
    np: false,
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const initialNpData = useMemo(() => {
    if (!client?.default_np_data) return undefined;
    if (typeof client.default_np_data === 'string') {
      try { return JSON.parse(client.default_np_data); } catch { return undefined; }
    }
    return client.default_np_data;
  }, [client?.id]); 

  const [formData, setFormData] = useState({
    client: "", manager: "", representative: "", phone1: "", phone2: "", address: "",
    latitude: DEFAULT_LAT, longitude: DEFAULT_LNG,
    default_car_make: "", default_car_number: "", default_trailer_number: "", default_driver: "",
    default_car_max_weight: "", default_car_own_weight: "", default_car_length: "", default_car_width: "", default_car_height: "",
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
          try { parsedNpData = JSON.parse(client.default_np_data); } catch (e) {}
        } else {
          parsedNpData = client.default_np_data;
        }
      }
      
      setFormData({
        client: client.client || "", manager: client.manager || "", representative: client.representative || "",
        phone1: client.phone1 || "", phone2: client.phone2 || "", address: addressText,
        latitude: parseFloat(client.latitude) || DEFAULT_LAT, longitude: parseFloat(client.longitude) || DEFAULT_LNG,
        default_car_make: client.default_car_make || "", default_car_number: client.default_car_number || "",
        default_trailer_number: client.default_trailer_number || "", default_driver: client.default_driver || "",
        default_car_max_weight: client.default_car_max_weight ?? "", default_car_own_weight: client.default_car_own_weight ?? "",
        default_car_length: client.default_car_length ?? "", default_car_width: client.default_car_width ?? "",
        default_car_height: client.default_car_height ?? "", default_np_data: parsedNpData,
      });
    } else if (!client && isOpen) {
      setFormData({
        client: "", manager: "", representative: "", phone1: "", phone2: "", address: "",
        latitude: DEFAULT_LAT, longitude: DEFAULT_LNG,
        default_car_make: "", default_car_number: "", default_trailer_number: "", default_driver: "",
        default_car_max_weight: "", default_car_own_weight: "", default_car_length: "", default_car_width: "", default_car_height: "",
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
    if (!value.startsWith("+380")) {
      value = "+380" + value.replace(/^\+380/, "").replace(/\D/g, "");
    } else {
      value = "+380" + value.slice(4).replace(/\D/g, "");
    }
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
      ...prev, latitude: newPos.lat, longitude: newPos.lng,
    }));
  };

  const validateForm = () => {
    if (!formData.client) {
      toast.error("Вкажіть клієнта");
      setExpandedSections(p => ({ ...p, general: true }));
      return false;
    }
    if (!formData.representative?.trim()) {
      toast.error("Вкажіть контактну особу (Представника)");
      setExpandedSections(p => ({ ...p, general: true }));
      return false;
    }
    if (!formData.phone1?.trim() || formData.phone1.length < 13) {
      toast.error("Вкажіть коректний телефон (+380...)");
      setExpandedSections(p => ({ ...p, general: true }));
      return false;
    }

    const isDefaultLocation = formData.latitude === DEFAULT_LAT && formData.longitude === DEFAULT_LNG;
    if (isDefaultLocation && !formData.address?.trim()) {
      toast.error("Вкажіть адресу вигрузки або виберіть її на карті");
      setExpandedSections(p => ({ ...p, address: true }));
      return false;
    }

    const hasCarData = formData.default_car_number || formData.default_car_make || formData.default_trailer_number || formData.default_driver || formData.default_car_max_weight;
    if (hasCarData) {
      if (!formData.default_car_number || !formData.default_car_make || !formData.default_driver) {
        toast.error("Якщо ви вказуєте авто, поля 'Номер', 'Марка' та 'Водій' є обов'язковими");
        setExpandedSections(p => ({ ...p, car: true }));
        return false;
      }
    }

    const npData = formData.default_np_data;
    const isNpPartiallyFilled = npData && (npData.city || npData.warehouse || npData.street || npData.companyEdrpou);
    if (isNpPartiallyFilled && !npData.isValid) {
      toast.error("Будь ласка, заповніть всі обов'язкові поля Нової Пошти");
      setExpandedSections(p => ({ ...p, np: true }));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    const npData = formData.default_np_data;
    const finalNpData = (npData && npData.isValid) ? npData : null;
    
    const payload = {
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
    };

    if (client && client.id) {
      try {
        await updateClientAddress({ id: client.id, clientData: payload, initData: getInitData() });
        toast.success("Дані успішно оновлено");
        queryClient.invalidateQueries({ queryKey: ["clients"] });
        queryClient.invalidateQueries({ queryKey: ["ordersAndAddresses"] });
        queryClient.invalidateQueries({ queryKey: ["clientsList"] });
        onSave(formData);
        onClose();
      } catch (error) {
        toast.error(error?.response?.data?.detail || "Помилка при оновленні даних клієнта");
      }
    } else {
      try {
        await createClientAddress({ clientData: payload, initData: getInitData() });
        toast.success("Клієнта додано успішно");
        queryClient.invalidateQueries({ queryKey: ["clients"] });
        queryClient.invalidateQueries({ queryKey: ["ordersAndAddresses"] });
        queryClient.invalidateQueries({ queryKey: ["clientsList"] });
        onSave(formData);
        onClose();
      } catch (error) {
        toast.error(error?.response?.data?.detail || "Помилка при додаванні клієнта");
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className={css.overlay}>
      <div className={css.modal}>
        
        <div className={css.header}>
          <h2>{client ? "Дані контрагента" : "Додати контрагента"}</h2>
          <button className={css.closeButton} onClick={onClose}>
            &times;
          </button>
        </div>

        <div className={css.modalBody}>
          <div className={css.warningBanner}>
            ℹ️ <strong>Увага:</strong> Внесені дані використовуватимуться за замовчуванням для поточних і майбутніх заявок.
          </div>

          <form onSubmit={handleSubmit} className={css.form}>
            
            {/* 1. Основні дані */}
            <div className={`${css.accordionItem} ${expandedSections.general ? css.expanded : ''}`}>
              <div className={css.accordionHeader} onClick={() => toggleSection('general')}>
                <div className={css.accordionTitle}>
                  <div className={css.iconBubble}><Building2 size={18} className={css.accordionIcon} /></div>
                  <span>Основні дані</span>
                  <span className={css.requiredBadge}>*</span>
                </div>
                <div className={css.chevronWrapper}>
                  {expandedSections.general ? <ChevronUp size={20} className={css.chevron} /> : <ChevronDown size={20} className={css.chevron} />}
                </div>
              </div>
              
              {expandedSections.general && (
                <div className={css.accordionContent}>
                  <div className={css.inputGroup}>
                    <label>Назва клієнта <span className={css.requiredStar}>*</span></label>
                    <div className={css.neumorphicInput}>
                      <UserCog size={18} className={css.inputIcon} />
                      {client ? (
                        <input className={css.input} name="client" value={formData.client} disabled />
                      ) : (
                        <select className={css.input} name="client" value={formData.client} onChange={handleChange} required>
                          <option value="">Оберіть клієнта</option>
                          {clientsList.map((c, idx) => (
                            <option key={idx} value={typeof c === 'string' ? c : (c.client || c.name || '')}>{typeof c === 'string' ? c : (c.client || c.name || '')}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  <div className={css.inputGroup}>
                    <label>Менеджер</label>
                    <div className={css.neumorphicInput}>
                      <User size={18} className={css.inputIcon} />
                      <select className={css.input} name="manager" value={formData.manager} onChange={handleChange}>
                          <option value="">Оберіть менеджера</option>
                          {managersList.map((m, idx) => {
                            const mName = typeof m === 'string' ? m : (m.manager || m.name || '');
                            return <option key={idx} value={mName}>{mName}</option>;
                          })}
                      </select>
                    </div>
                  </div>

                  <div className={css.inputGroup}>
                    <label>Контактна особа (Представник) <span className={css.requiredStar}>*</span></label>
                    <div className={css.neumorphicInput}>
                      <User size={18} className={css.inputIcon} />
                      <input className={css.input} name="representative" value={formData.representative} onChange={handleChange} placeholder="ПІБ контактної особи" />
                    </div>
                  </div>

                  <div className={css.inputGroup}>
                    <label>Телефон <span className={css.requiredStar}>*</span></label>
                    <div className={css.neumorphicInput}>
                      <Phone size={18} className={css.inputIcon} />
                      <input className={css.input} name="phone1" value={formData.phone1} onChange={handlePhoneChange} placeholder="+380XXXXXXXXX" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Адреса та Карта */}
            <div className={`${css.accordionItem} ${expandedSections.address ? css.expanded : ''}`}>
              <div className={css.accordionHeader} onClick={() => toggleSection('address')}>
                <div className={css.accordionTitle}>
                  <div className={css.iconBubble}><MapPin size={18} className={css.accordionIcon} /></div>
                  <span>Адреса вигрузки</span>
                  <span className={css.requiredBadge}>*</span>
                </div>
                <div className={css.chevronWrapper}>
                  {expandedSections.address ? <ChevronUp size={20} className={css.chevron} /> : <ChevronDown size={20} className={css.chevron} />}
                </div>
              </div>
              
              {expandedSections.address && (
                <div className={css.accordionContent}>
                  <div className={css.inputGroup}>
                    <label>Пошук адреси</label>
                    <div className={css.neumorphicCardInner}>
                      <InputAddress key={`address-search-${isOpen}`} onAddressSelect={handleAddressSelect} />
                    </div>
                  </div>

                  <div className={css.inputGroup}>
                    <label>Текстова адреса</label>
                    <div className={css.neumorphicInput}>
                      <MapPin size={18} className={css.inputIcon} />
                      <input className={css.input} name="address" value={formData.address} onChange={handleChange} placeholder="Введіть вручну або знайдіть вище" />
                    </div>
                  </div>

                  <div className={css.neumorphicMapWrapper}>
                    <MapContainer key={`${formData.latitude}-${formData.longitude}`} center={[formData.latitude, formData.longitude]} zoom={13} style={{ height: "100%", width: "100%" }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                      <DraggableMarker position={[formData.latitude, formData.longitude]} setPosition={handleMarkerPositionChange} />
                      <MapUpdater position={[formData.latitude, formData.longitude]} />
                    </MapContainer>
                  </div>
                  <div className={css.mapHint}>* Перетягніть маркер для точного вказання координат</div>
                </div>
              )}
            </div>

            {/* 3. Автомобіль */}
            <div className={`${css.accordionItem} ${expandedSections.car ? css.expanded : ''}`}>
              <div className={css.accordionHeader} onClick={() => toggleSection('car')}>
                <div className={css.accordionTitle}>
                  <div className={css.iconBubble}><Truck size={18} className={css.accordionIcon} /></div>
                  <span>Авто (для самовивозу)</span>
                </div>
                <div className={css.chevronWrapper}>
                  {expandedSections.car ? <ChevronUp size={20} className={css.chevron} /> : <ChevronDown size={20} className={css.chevron} />}
                </div>
              </div>
              
              {expandedSections.car && (
                <div className={css.accordionContent}>
                  <div className={css.vehicleGrid}>
                    <div className={`${css.inputGroup} ${css.fullWidth}`}>
                      <label>Номер авто <span className={css.requiredStarIfFilled}>*</span></label>
                      <div className={css.neumorphicInput}>
                        <input className={css.input} name="default_car_number" value={formData.default_car_number} onChange={(e) => setFormData(prev => ({ ...prev, default_car_number: e.target.value.toUpperCase() }))} placeholder="AX1234HP" />
                      </div>
                    </div>
                    <div className={css.inputGroup}>
                      <label>Марка авто <span className={css.requiredStarIfFilled}>*</span></label>
                      <div className={css.neumorphicInput}>
                        <input className={css.input} name="default_car_make" value={formData.default_car_make} onChange={handleChange} placeholder="MAN, DAF..." />
                      </div>
                    </div>
                    <div className={css.inputGroup}>
                      <label>Водій (ПІБ) <span className={css.requiredStarIfFilled}>*</span></label>
                      <div className={css.neumorphicInput}>
                        <input className={css.input} name="default_driver" value={formData.default_driver} onChange={handleChange} placeholder="Іванов І.І." />
                      </div>
                    </div>
                    <div className={`${css.inputGroup} ${css.fullWidth}`}>
                      <label>Номер причепа</label>
                      <div className={css.neumorphicInput}>
                        <input className={css.input} name="default_trailer_number" value={formData.default_trailer_number} onChange={(e) => setFormData(prev => ({ ...prev, default_trailer_number: e.target.value.toUpperCase() }))} placeholder="AX5678XX" />
                      </div>
                    </div>
                    
                    <div className={css.divider}></div>
                    
                    <div className={css.inputGroup}>
                      <label>Повна маса (кг)</label>
                      <div className={css.neumorphicInput}>
                        <input className={css.input} type="number" name="default_car_max_weight" value={formData.default_car_max_weight} onChange={handleChange} placeholder="18000" />
                      </div>
                    </div>
                    <div className={css.inputGroup}>
                      <label>Маса без навант. (кг)</label>
                      <div className={css.neumorphicInput}>
                        <input className={css.input} type="number" name="default_car_own_weight" value={formData.default_car_own_weight} onChange={handleChange} placeholder="8500" />
                      </div>
                    </div>
                    <div className={css.inputGroup}>
                      <label>Довжина (м)</label>
                      <div className={css.neumorphicInput}>
                        <input className={css.input} type="number" step="0.1" name="default_car_length" value={formData.default_car_length} onChange={handleChange} placeholder="8.2" />
                      </div>
                    </div>
                    <div className={css.inputGroup}>
                      <label>Ширина (м)</label>
                      <div className={css.neumorphicInput}>
                        <input className={css.input} type="number" step="0.1" name="default_car_width" value={formData.default_car_width} onChange={handleChange} placeholder="2.5" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Нова Пошта */}
            <div className={`${css.accordionItem} ${expandedSections.np ? css.expanded : ''}`}>
              <div className={css.accordionHeader} onClick={() => toggleSection('np')}>
                <div className={css.accordionTitle}>
                  <div className={css.iconBubble}><Package size={18} className={css.accordionIcon} /></div>
                  <span>Нова Пошта</span>
                </div>
                <div className={css.chevronWrapper}>
                  {expandedSections.np ? <ChevronUp size={20} className={css.chevron} /> : <ChevronDown size={20} className={css.chevron} />}
                </div>
              </div>
              
              {expandedSections.np && (
                <div className={css.accordionContent}>
                  <div className={css.neumorphicCardInner}>
                    <NovaPoshtaSelector key={client?.id || 'new'} onSelect={handleNpSelect} initialSelection={initialNpData} />
                  </div>
                </div>
              )}
            </div>
            
          </form>
        </div>

        <div className={css.stickyFooter}>
          <button type="button" className={`${css.button} ${css.cancelButton}`} onClick={onClose}>
            Скасувати
          </button>
          <button type="button" className={`${css.button} ${css.saveButton}`} onClick={handleSubmit}>
            Зберегти дані
          </button>
        </div>
      </div>
    </div>
  );
}
