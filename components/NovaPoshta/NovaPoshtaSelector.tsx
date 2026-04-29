"use client";

import React, { useState, useEffect, useRef } from "react";
import { getNPCities, getNPWarehouses, getNPCounterparty, getNPStreets, NPCity, NPWarehouse, NPStreet } from "@/lib/api";
import { getInitData } from "@/lib/getInitData";
import css from "./NovaPoshtaSelector.module.css";
import { 
  Search, 
  MapPin, 
  Building2, 
  Truck, 
  Box, 
  User, 
  Building, 
  Loader2,
  ChevronDown
} from "lucide-react";

export type NPDeliveryType = "branch" | "postomat" | "address";
export type NPRecipientType = "person" | "company";
export type NPPayerType = "sender" | "recipient";
export type NPPaymentMethod = "cash" | "bank";

export interface NPSelection {
  city: NPCity | null;
  deliveryType: NPDeliveryType;
  warehouse: NPWarehouse | null;
  address: string;
  recipientType: NPRecipientType;
  companyName: string;
  companyEdrpou: string;
  payer: NPPayerType;
  paymentMethod: NPPaymentMethod;
  street: NPStreet | null;
  house: string;
  isValid: boolean;
}

interface Props {
  onSelect: (selection: NPSelection) => void;
  initialSelection?: Partial<NPSelection>;
}

export default function NovaPoshtaSelector({ onSelect, initialSelection }: Props) {
  const initData = getInitData();
  
  // State
  const [citySearch, setCitySearch] = useState("");
  const [cities, setCities] = useState<NPCity[]>([]);
  const [selectedCity, setSelectedCity] = useState<NPCity | null>(initialSelection?.city || null);
  const [isCityLoading, setIsCityLoading] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  
  const [deliveryType, setDeliveryType] = useState<NPDeliveryType>(initialSelection?.deliveryType || "branch");
  
  const [warehouseSearch, setWarehouseSearch] = useState("");
  const [warehouses, setWarehouses] = useState<NPWarehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<NPWarehouse | null>(initialSelection?.warehouse || null);
  const [isWarehouseLoading, setIsWarehouseLoading] = useState(false);
  const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);
  
  const [recipientType, setRecipientType] = useState<NPRecipientType>(initialSelection?.recipientType || "person");
  const [companySearch, setCompanySearch] = useState(initialSelection?.companyEdrpou || "");
  const [companyName, setCompanyName] = useState(initialSelection?.companyName || "");
  const [isCompanyLoading, setIsCompanyLoading] = useState(false);
  
  const [payer, setPayer] = useState<NPPayerType>(initialSelection?.payer || "recipient");
  const [paymentMethod, setPaymentMethod] = useState<NPPaymentMethod>(initialSelection?.paymentMethod || "cash");
  
  const [streetSearch, setStreetSearch] = useState("");
  const [streets, setStreets] = useState<NPStreet[]>([]);
  const [selectedStreet, setSelectedStreet] = useState<NPStreet | null>(initialSelection?.street || null);
  const [house, setHouse] = useState(initialSelection?.house || "");
  const [isStreetLoading, setIsStreetLoading] = useState(false);
  const [showStreetDropdown, setShowStreetDropdown] = useState(false);
  
  const cityRef = useRef<HTMLDivElement>(null);
  const warehouseRef = useRef<HTMLDivElement>(null);
  const streetRef = useRef<HTMLDivElement>(null);

  // Debounced City Search
  useEffect(() => {
    if (citySearch.length < 2 || selectedCity?.main_description === citySearch) {
      setCities([]);
      return;
    }
    
    const timer = setTimeout(async () => {
      setIsCityLoading(true);
      try {
        const res = await getNPCities(citySearch, initData);
        if (res.success) {
          setCities(res.data);
          setShowCityDropdown(true);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsCityLoading(false);
      }
    }, 400);
    
    return () => clearTimeout(timer);
  }, [citySearch, initData, selectedCity]);

  // Street Search
  useEffect(() => {
    if (!selectedCity || streetSearch.length < 2 || selectedStreet?.description === streetSearch) {
      setStreets([]);
      return;
    }
    
    const timer = setTimeout(async () => {
      setIsStreetLoading(true);
      try {
        const res = await getNPStreets(selectedCity.settlement_ref, streetSearch, initData);
        if (res.success) {
          setStreets(res.data);
          setShowStreetDropdown(true);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsStreetLoading(false);
      }
    }, 400);
    
    return () => clearTimeout(timer);
  }, [streetSearch, selectedCity, initData, selectedStreet]);

  // Load Warehouses when city or delivery type changes
  useEffect(() => {
    if (!selectedCity?.ref || deliveryType === "address") {
      setWarehouses([]);
      return;
    }
    
    const fetchWarehouses = async () => {
      setIsWarehouseLoading(true);
      setWarehouses([]); // Clear old results to avoid "mixing" while loading
      setSelectedWarehouse(null);
      
      try {
        // NP API types: 
        // branch: "f9315480-1a13-11e5-8d7d-00505688561d"
        // postomat: "95dc2124-ed45-11e3-b44e-0050568002cf"
        const res = await getNPWarehouses(selectedCity.settlement_ref, initData, undefined, undefined);
        if (res.success) {
          // Strict filtering based on the backend's post_machine flag
          const filtered = res.data.filter((w: NPWarehouse) => {
            if (deliveryType === "postomat") return w.post_machine === true;
            if (deliveryType === "branch") return w.post_machine === false;
            return true;
          });
          setWarehouses(filtered);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsWarehouseLoading(false);
      }
    };
    
    fetchWarehouses();
  }, [selectedCity?.settlement_ref, selectedCity?.ref, deliveryType, initData]); // Corrected deps to fix ESLint warning

  // Company Search by EDRPOU/IPN
  useEffect(() => {
    if (recipientType === "person" || companySearch.length < 8) return;
    
    const timer = setTimeout(async () => {
      setIsCompanyLoading(true);
      try {
        const res = await getNPCounterparty(companySearch, initData);
        if (res.success && res.data && res.data.length > 0) {
          setCompanyName(res.data[0].Description);
        } else {
          setCompanyName("");
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsCompanyLoading(false);
      }
    }, 600);
    
    return () => clearTimeout(timer);
  }, [companySearch, recipientType, initData]);

  // Validate and Notify Parent
  useEffect(() => {
    const isValid = !!(
      selectedCity && 
      (
        (deliveryType === "address" && selectedStreet && house) || 
        (deliveryType !== "address" && selectedWarehouse)
      ) &&
      (recipientType === "person" || (recipientType === "company" && companySearch.length >= 8 && companyName))
    );

    onSelect({
      city: selectedCity,
      deliveryType,
      warehouse: selectedWarehouse,
      street: selectedStreet,
      house,
      address: deliveryType === "address" 
        ? `${selectedStreet?.description || ""}, буд. ${house}` 
        : "",
      recipientType,
      companyEdrpou: companySearch,
      companyName,
      payer,
      paymentMethod,
      isValid
    });
  }, [
    selectedCity, 
    deliveryType, 
    selectedWarehouse, 
    selectedStreet, 
    house, 
    recipientType, 
    companySearch, 
    companyName, 
    payer, 
    paymentMethod,
    onSelect
  ]);

  // Handle outside clicks
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cityRef.current && !cityRef.current.contains(event.target as Node)) {
        setShowCityDropdown(false);
      }
      if (warehouseRef.current && !warehouseRef.current.contains(event.target as Node)) {
        setShowWarehouseDropdown(false);
      }
      if (streetRef.current && !streetRef.current.contains(event.target as Node)) {
        setShowStreetDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={css.container}>
      {/* ── City Selection ── */}
      <div className={css.fieldGroup} ref={cityRef}>
        <label className={css.label}>
          <MapPin size={16} /> Місто
        </label>
        <div className={css.inputWrapper}>
          <input
            type="text"
            className={css.input}
            placeholder="Введіть назву міста..."
            value={citySearch}
            onChange={(e) => {
              setCitySearch(e.target.value);
              if (selectedCity && e.target.value !== selectedCity.main_description) {
                setSelectedCity(null);
                setSelectedWarehouse(null);
              }
            }}
            onFocus={() => citySearch.length >= 2 && setShowCityDropdown(true)}
          />
          {isCityLoading ? (
            <Loader2 size={18} className={`${css.icon} ${css.spin}`} />
          ) : (
            <Search size={18} className={css.icon} />
          )}
          
          {showCityDropdown && cities.length > 0 && (
            <div className={css.dropdown}>
              {cities.map((city) => (
                <div 
                  key={city.ref} 
                  className={css.dropdownItem}
                  onClick={() => {
                    setSelectedCity(city);
                    setCitySearch(city.main_description);
                    setShowCityDropdown(false);
                    setSelectedWarehouse(null);
                  }}
                >
                  <div className={css.cityMain}>{city.main_description}</div>
                  <div className={css.citySub}>{city.region} обл., {city.area}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Delivery Type ── */}
      <div className={css.fieldGroup}>
        <label className={css.label}>Спосіб доставки</label>
        <div className={css.segmentedControl}>
          <button 
            className={`${css.segment} ${deliveryType === "branch" ? css.active : ""}`}
            onClick={() => setDeliveryType("branch")}
          >
            <Building2 size={16} /> Відділення
          </button>
          <button 
            className={`${css.segment} ${deliveryType === "postomat" ? css.active : ""}`}
            onClick={() => setDeliveryType("postomat")}
          >
            <Box size={16} /> Поштомат
          </button>
          <button 
            className={`${css.segment} ${deliveryType === "address" ? css.active : ""}`}
            onClick={() => setDeliveryType("address")}
          >
            <Truck size={16} /> Адреса
          </button>
        </div>
      </div>

      {/* ── Warehouse or Address ── */}
      {selectedCity && (
        <div className={css.fieldGroup}>
          {deliveryType === "address" ? (
            <div className={css.addressForm}>
              <div ref={streetRef} className={css.fieldGroup} style={{ flex: 1, margin: 0 }}>
                <div className={css.inputWrapper}>
                  <input
                    type="text"
                    className={css.input}
                    placeholder="Пошук вулиці..."
                    value={streetSearch}
                    onChange={(e) => setStreetSearch(e.target.value)}
                    onFocus={() => { if (streets.length > 0) setShowStreetDropdown(true); }}
                  />
                  {isStreetLoading ? (
                    <Loader2 size={18} className={`${css.icon} ${css.spin}`} />
                  ) : (
                    <Search size={18} className={css.icon} />
                  )}
                  
                  {showStreetDropdown && streets.length > 0 && (
                    <div className={css.dropdown}>
                      <div className={css.dropdownList}>
                        {streets.map((s) => (
                          <div 
                            key={s.ref} 
                            className={css.dropdownItem}
                            onClick={() => {
                              setSelectedStreet(s);
                              setStreetSearch(s.description);
                              setShowStreetDropdown(false);
                            }}
                          >
                            <span className={css.streetType}>{s.street_type}</span> {s.description}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className={css.houseInputWrapper}>
                <input
                  type="text"
                  className={css.input}
                  placeholder="Буд."
                  value={house}
                  onChange={(e) => setHouse(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div ref={warehouseRef}>
              <label className={css.label}>
                {deliveryType === "branch" ? "Відділення" : "Поштомат"}
              </label>
              <div className={css.inputWrapper}>
                <div 
                  className={`${css.select} ${!selectedWarehouse ? css.placeholder : ""}`}
                  onClick={() => setShowWarehouseDropdown(!showWarehouseDropdown)}
                >
                  {selectedWarehouse ? selectedWarehouse.description : `Оберіть ${deliveryType === "branch" ? "відділення" : "поштомат"}...`}
                  <ChevronDown size={18} className={css.selectIcon} />
                </div>
                
                {showWarehouseDropdown && (
                  <div className={css.dropdown}>
                    <div className={css.dropdownSearch}>
                      <Search size={14} />
                      <input 
                        type="text" 
                        placeholder="Пошук за номером або назвою..." 
                        value={warehouseSearch}
                        onChange={(e) => setWarehouseSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    </div>
                    <div className={css.dropdownList}>
                      {warehouses
                        .filter(w => w.description.toLowerCase().includes(warehouseSearch.toLowerCase()))
                        .map((w) => (
                          <div 
                            key={w.ref} 
                            className={css.dropdownItem}
                            onClick={() => {
                              setSelectedWarehouse(w);
                              setShowWarehouseDropdown(false);
                            }}
                          >
                            {w.description}
                          </div>
                        ))}
                      {warehouses.length === 0 && !isWarehouseLoading && (
                        <div className={css.noResults}>Нічого не знайдено</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Recipient Type ── */}
      <div className={css.fieldGroup}>
        <label className={css.label}>Отримувач</label>
        <div className={css.segmentedControl}>
          <button 
            className={`${css.segment} ${recipientType === "person" ? css.active : ""}`}
            onClick={() => setRecipientType("person")}
          >
            <User size={16} /> Фізособа
          </button>
          <button 
            className={`${css.segment} ${recipientType === "company" ? css.active : ""}`}
            onClick={() => setRecipientType("company")}
          >
            <Building size={16} /> Організація
          </button>
        </div>
        
        {recipientType === "company" && (
          <div className={css.companyBlock}>
            <div className={css.inputWrapper}>
              <input
                type="text"
                className={css.input}
                placeholder="Введіть ЄДРПОУ..."
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value.replace(/\D/g, "").slice(0, 10))}
              />
              {isCompanyLoading ? (
                <Loader2 size={18} className={`${css.icon} ${css.spin}`} />
              ) : (
                <Search size={18} className={css.icon} />
              )}
            </div>
            {companyName && (
              <div className={css.companyNameFound}>
                <Building2 size={14} /> {companyName}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Payer ── */}
      <div className={css.fieldGroup}>
        <label className={css.label}>Хто оплачує доставку?</label>
        <div className={css.segmentedControl}>
          <button 
            className={`${css.segment} ${payer === "recipient" ? css.active : ""}`}
            onClick={() => setPayer("recipient")}
          >
            Отримувач
          </button>
          <button 
            className={`${css.segment} ${payer === "sender" ? css.active : ""}`}
            onClick={() => setPayer("sender")}
          >
            Відправник
          </button>
        </div>
      </div>

      {/* ── Payment Method ── */}
      <div className={css.fieldGroup}>
        <label className={css.label}>Вид оплати</label>
        <div className={css.segmentedControl}>
          <button 
            className={`${css.segment} ${paymentMethod === "cash" ? css.active : ""}`}
            onClick={() => setPaymentMethod("cash")}
          >
            Готівковий
          </button>
          <button 
            className={`${css.segment} ${paymentMethod === "bank" ? css.active : ""}`}
            onClick={() => setPaymentMethod("bank")}
          >
            Безготівковий
          </button>
        </div>
      </div>
    </div>
  );
}
