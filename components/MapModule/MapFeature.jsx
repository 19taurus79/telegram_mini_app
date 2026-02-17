"use client";

import { MapContainer, TileLayer, Marker, Popup, LayersControl } from "react-leaflet";
const { BaseLayer } = LayersControl;
import "leaflet/dist/leaflet.css";
import css from "./App.module.css";
// Импорт дочерних компонентов
import TopData from "./components/topData/topData";
import InputAddress from "./components/inputAddress/InputAddress";
import BottomData from "./components/bottomData/bottomData";
import { useDisplayAddressStore } from "./store/displayAddress"; // Хранилище для отображаемого адреса
import { useApplicationsStore } from "./store/applicationsStore"; // Глобальное хранилище для заявок, доставок, клиентов
import { fetchOrdersHeatmapData } from "./fetchOrdersWithAddresses";
import ChangeMapView from "./components/ChangeMapView/ChangeMapView";
import { getDeliveries } from "../../lib/api";
import Header from "./components/Header/Header";
import { useQuery } from "@tanstack/react-query";
import { getInitData } from "@/lib/getInitData";
import { useState, useRef, useEffect, useCallback } from "react";
import { customIcon, clientIcon, warehouseIcon, deliveryIcon } from "./leaflet-icon"; // Кастомные иконки для маркеров
import { getStatusColor } from "./statusUtils"; // Утилита для получения цвета статуса доставки
import { warehouses } from "./warehouses"; // Статические данные о складах
import { useMapControlStore } from "./store/mapControlStore"; // Хранилище для управления видимостью слоев
import ApplicationsList from "./components/ApplicationsList/ApplicationsList";
import ClientsList from "./components/ClientsList/ClientsList";
import DeliveriesList from "./components/DeliveriesList/DeliveriesList";
import EditClientModal from "./components/EditClientModal/EditClientModal";
import EditDeliveryModal from "./components/EditDeliveryModal/EditDeliveryModal";
import DrawControl from "./components/DrawControl/DrawControl"; // Компонент для рисования на карте (выделение)
import RoutingControl from "./components/RoutingControl/RoutingControl"; // Компонент для построения маршрутов
import RoutePanel from "./components/RoutePanel/RoutePanel"; // Панель управления маршрутом
import MapControls from "./components/MapControls/MapControls"; // Кнопки управления слоями карты
import { useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

/**
 * Компонент, отслеживающий изменение уровня масштабирования (зума) карты.
 * @param {object} props - Свойства компонента.
 * @param {function} props.onZoomChange - Колбэк, вызываемый при изменении зума.
 */
function ZoomTracker({ onZoomChange }) {
  const map = useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom());
    },
  });
  return null;
}

/**
 * Компонент для программного управления картой, например, для плавного перемещения.
 * @param {object} props - Свойства компонента.
 * @param {Array<number>} props.coords - Координаты [lat, lng] для перемещения.
 */
function MapController({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.flyTo(coords, 16); // Плавный перелет к указанным координатам
    }
  }, [coords, map]);
  return null;
}

/**
 * Группирует массив элементов (заявки, клиенты, доставки) по их геолокации.
 * @param {Array<object>} items - Массив элементов для группировки.
 * @returns {Array<Array<object>>} - Массив групп, где каждая группа - это массив элементов с одинаковыми координатами.
 */
const groupItemsByLocation = (items) => {
  const groups = {};
  items.forEach(item => {
    const lat = item.address?.latitude || item.latitude;
    const lon = item.address?.longitude || item.longitude;
    const key = `${lat},${lon}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
  });
  return Object.values(groups);
};

/**
 * Рассчитывает смещение для маркеров, находящихся в одной точке, чтобы они не перекрывали друг друга.
 * @param {number} lat - Широта.
 * @param {number} lon - Долгота.
 * @param {number} index - Индекс маркера в группе.
 * @param {number} total - Общее количество маркеров в группе.
 * @param {number} zoom - Текущий уровень зума карты.
 * @returns {Array<number>} - Новые координаты [lat, lng] со смещением.
 */
const applyOffset = (lat, lon, index, total, zoom = 13) => {
  if (total <= 1) return [lat, lon];
  
  const angle = (index / total) * 2 * Math.PI; // Угол смещения
  
  // Радиус смещения зависит от зума, чтобы на большом зуме маркеры расходились дальше
  const baseRadius = 0.00008;
  const zoomFactor = Math.pow(2, Math.max(0, 15 - zoom));
  const radius = baseRadius * zoomFactor; 
  
  const offsetLat = parseFloat(lat) + (radius * Math.cos(angle));
  const offsetLon = parseFloat(lon) + (radius * Math.sin(angle));
  
  return [offsetLat, offsetLon];
};

/**
 * Создает иконку для группы маркеров с числовым бейджем.
 * @param {string} baseIconUrl - URL базовой иконки.
 * @param {number} count - Количество элементов в группе.
 * @param {number} size - Размер иконки.
 * @returns {L.Icon | L.DivIcon} - Leaflet иконка.
 */
const getGroupedIcon = (baseIconUrl, count, size = 32) => {
  // Если в группе 1 элемент, возвращаем обычную иконку
  if (count <= 1) {
    return new L.Icon({
      iconUrl: baseIconUrl,
      iconSize: [size, size],
      iconAnchor: [size / 2, size],
      popupAnchor: [1, -size],
    });
  }

  // Если элементов больше, создаем divIcon с бейджем
  return L.divIcon({
    className: 'grouped-icon',
    html: `
      <div style="position: relative; width: ${size}px; height: ${size}px;">
        <img src="${baseIconUrl}" style="width: 100%; height: 100%;" />
        <div style="
          position: absolute;
          top: -8px;
          right: -8px;
          background: #ef4444;
          color: white;
          border-radius: 10px;
          padding: 2px 6px;
          font-size: 10px;
          font-weight: bold;
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          z-index: 1000;
        ">
          ${count}
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [1, -size],
  });
};

/**
 * Создает иконку, размер которой зависит от веса (например, тоннажа заявок).
 * @param {string} baseIconUrl - URL базовой иконки.
 * @param {number} count - Количество элементов в группе (для бейджа).
 * @param {number} weight - Вес для расчета размера.
 * @returns {L.Icon | L.DivIcon} - Leaflet иконка.
 */
const getDynamicGroupedIcon = (baseIconUrl, count, weight) => {
  // Расчет размера иконки в зависимости от веса
  const baseSize = 28;
  const maxSize = 60;
  const maxWeight = 50000; // Максимальный вес для нормализации
  const normalizedWeight = Math.min(weight / maxWeight, 1);
  const size = baseSize + (maxSize - baseSize) * normalizedWeight;

  if (count <= 1) {
    return new L.Icon({
      iconUrl: baseIconUrl,
      iconSize: [size, size],
      iconAnchor: [size / 2, size],
      popupAnchor: [1, -size],
    });
  }

  // Возвращаем divIcon с бейджем и динамическим размером
  return L.divIcon({
    className: 'grouped-icon',
    html: `
      <div style="position: relative; width: ${size}px; height: ${size}px;">
        <img src="${baseIconUrl}" style="width: 100%; height: 100%;" />
        <div style="
          position: absolute;
          top: -8px;
          right: -8px;
          background: #ef4444;
          color: white;
          border-radius: 10px;
          padding: 2px 6px;
          font-size: 10px;
          font-weight: bold;
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          z-index: 1000;
        ">
          ${count}
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [1, -size],
  });
};

/**
 * Основной компонент карты, который собирает все элементы в единое целое.
 * @param {object} props - Свойства.
 * @param {function} props.onAddressSelect - Колбэк при выборе адреса через поиск.
 */
export default function MapFeature({ onAddressSelect }) {
  // --- УПРАВЛЕНИЕ СОСТОЯНИЕМ ---

  // Состояние для отображения адреса, выбранного через поиск
  const { addressData, setAddressData } = useDisplayAddressStore();
  
  // Глобальное состояние для заявок, клиентов, доставок и их выбора
  const { 
    applications, 
    setApplications, 
    selectedClient, 
    setSelectedClient, 
    setUnmappedApplications, 
    selectedManager,
    selectedDelivery,
    setSelectedDelivery,
    selectedDeliveries,
    setSelectedDeliveries,
    toggleSelectedDelivery,
    deliveries,
    setDeliveries,
    setMultiSelectedItems
  } = useApplicationsStore();
  
  // Локальное состояние для управления видимостью UI элементов
  const [isDataTopVisible, setDataTopVisible] = useState(false);
  const [isAddressSearchVisible, setAddressSearchVisible] = useState(true);
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false); // Состояние боковой панели поиска/списков
  const [isSheetOpen, setIsSheetOpen] = useState(false); // Состояние нижней выдвижной панели (bottom sheet)
  const [flyToCoords, setFlyToCoords] = useState(null); // Координаты для принудительного перемещения карты
  const [currentZoom, setCurrentZoom] = useState(13); // Текущий уровень зума
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // Модальное окно редактирования клиента
  const [editingClient, setEditingClient] = useState(null); // Данные клиента для редактирования

  // Локальное состояние для режима построения маршрутов
  const [isRoutingMode, setIsRoutingMode] = useState(false);
  const [routeWaypoints, setRouteWaypoints] = useState([]); // Точки маршрута
  const [routeInfo, setRouteInfo] = useState(null); // Информация о построенном маршруте

  // Состояние для данных, загружаемых с сервера
  const [clients, setClients] = useState([]);
  
  // Состояние для управления видимостью слоев (из хранилища)
  const { 
    areApplicationsVisible, 
    toggleApplications,
    areClientsVisible,
    toggleClients,
    areDeliveriesVisible,
    setDeliveriesVisible,
    selectedStatuses,
    setSelectedStatuses,
    availableStatuses,
    setAvailableStatuses
  } = useMapControlStore();
  
  // Ссылка на экземпляр карты
  const mapRef = useRef(null);
  const [isMounted, setIsMounted] = useState(false);

  // --- ФИЛЬТРАЦИЯ ДАННЫХ ---

  // Фильтрация заявок по выбранному менеджеру
  const filteredApplications = selectedManager
    ? applications.filter(app => app.address?.manager === selectedManager)
    : applications;

  // Фильтрация клиентов по выбранному менеджеру
  const filteredClients = selectedManager
    ? clients.filter(client => client.manager === selectedManager)
    : clients;

  // Фильтрация доставок по статусу и менеджеру
  const filteredDeliveries = deliveries.filter(d => {
    const statusMatch = Array.isArray(selectedStatuses) && selectedStatuses.includes(d.status);
    const managerMatch = !selectedManager || d.manager === selectedManager;
    return statusMatch && managerMatch;
  });

  // --- ОБРАБОТЧИКИ СОБЫТИЙ ---

  /**
   * Сохраняет данные клиента (нового или отредактированного).
   */
  const handleSaveClient = (clientData) => {
    if (editingClient) {
        // Обновление существующего клиента
        const updatedClient = { ...editingClient, ...clientData };
        setClients(prev => prev.map(c => c.client === editingClient.client ? updatedClient : c));
        if (selectedClient?.client === editingClient.client) {
          setSelectedClient(updatedClient);
        }
    } else {
        // Добавление нового клиента
        setClients(prev => [...prev, clientData]);
    }
    setAddressData({}); // Сброс адреса из поиска
  };

  /**
   * Открывает модальное окно для добавления нового клиента.
   */
  const handleAddClient = (initialData = null) => {
    setEditingClient(initialData ? { ...initialData, id: null } : null);
    setIsEditModalOpen(true);
  };

  /**
   * Открывает модальное окно для редактирования существующего клиента.
   */
  const handleEditClient = (client) => {
    setEditingClient(client);
    setIsEditModalOpen(true);
  };

  /**
   * Обрабатывает создание выделения на карте (прямоугольником или полигоном).
   * @param {object} selection - Объект с выделенными элементами (deliveries, applications, clients).
   */
  const handleSelectionCreate = (selection) => {
    if (selection.deliveries && selection.deliveries.length > 0) {
        setSelectedDeliveries(selection.deliveries);
        setIsSheetOpen(true);
    } else if (selection.applications && selection.applications.length > 0) {
      setMultiSelectedItems(selection.applications, 'applications');
      setIsSheetOpen(true);
    } else if (selection.clients && selection.clients.length > 0) {
      setMultiSelectedItems(selection.clients, 'clients');
      setIsSheetOpen(true);
    }
  };

  // --- ЛОГИКА МАРШРУТИЗАЦИИ ---

  /**
   * Переключает режим построения маршрута.
   */
  const handleToggleRoutingMode = useCallback(() => {
    setIsRoutingMode(prev => !prev);
    if (isRoutingMode) { // При выключении режима - сбрасываем маршрут
      setRouteWaypoints([]);
      setRouteInfo(null);
    }
  }, [isRoutingMode]);

  /**
   * Добавляет точку в маршрут при клике на маркер в режиме маршрутизации.
   */
  const handleMarkerClickForRouting = useCallback((lat, lng, name = '', type = '') => {
    if (!isRoutingMode) return;
    setRouteWaypoints(prev => {
      if (prev.length >= 10) {
        alert("Максимальное количество точек маршрута: 10");
        return prev;
      }
      return [...prev, { lat, lng, name, type }];
    });
  }, [isRoutingMode]);

  /**
   * Очищает построенный маршрут.
   */
  const handleClearRoute = useCallback(() => {
    setRouteWaypoints([]);
    setRouteInfo(null);
  }, []);

  /**
   * Удаляет точку из маршрута по индексу.
   */
  const handleDeleteWaypoint = useCallback((index) => {
    setRouteWaypoints(prev => prev.filter((_, i) => i !== index));
    setRouteInfo(null); // Сбрасываем маршрут, так как точки изменились
  }, []);

  /**
   * Перемещает точку маршрута (для drag-n-drop).
   */
  const handleMoveWaypoint = useCallback((fromIndex, toIndex) => {
    setRouteWaypoints(prev => {
      const newWaypoints = [...prev];
      const [moved] = newWaypoints.splice(fromIndex, 1);
      newWaypoints.splice(toIndex, 0, moved);
      return newWaypoints;
    });
    setRouteInfo(null);
  }, []);

  /**
   * Оптимизирует порядок точек в маршруте (например, методом ближайшего соседа).
   */
  const handleOptimizeRoute = useCallback((method = 'nearest') => {
    if (routeWaypoints.length < 3) return; // Оптимизация имеет смысл для 3+ точек
    // ... (сложная логика оптимизации)
    setRouteInfo(null);
  }, [routeWaypoints]);

  /**
   * Колбэк при успешном построении маршрута.
   */
  const handleRouteFound = useCallback((info) => {
    setRouteInfo(info);
  }, []);

  /**
   * Колбэк при ошибке построения маршрута.
   */
  const handleRoutingError = useCallback((error) => {
    console.error('Routing error:', error);
  }, []);


  // --- `useEffect` ХУКИ ---

  // Устанавливаем флаг, что компонент смонтирован, чтобы избежать рендеринга на сервере
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Загрузка заявок с помощью React Query
  const { data: applicationsData } = useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const initData = getInitData();
      return await fetchOrdersHeatmapData(initData);
    },
    enabled: areApplicationsVisible,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Эффект для обновления состояния заявок
  useEffect(() => {
    if (applicationsData) {
      setApplications(applicationsData.mergedData);
      setUnmappedApplications(applicationsData.unmappedData);
    }
  }, [applicationsData, setApplications, setUnmappedApplications]);

  // Загрузка клиентов с помощью React Query
  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      // Динамический импорт, так как функция может быть не нужна сразу
      const { fetchOrdersAndAddresses } = await import("./fetchOrdersWithAddresses");
      const { addresses } = await fetchOrdersAndAddresses();
      return addresses.filter(addr => addr.latitude && addr.longitude);
    },
    enabled: areClientsVisible,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Эффект для обновления состояния клиентов
  useEffect(() => {
    if (clientsData) {
      setClients(clientsData);
    }
  }, [clientsData, setClients]);

  // Загрузка и обработка доставок с помощью React Query
  const { data: fetchedDeliveries } = useQuery({
    queryKey: ['deliveries'],
    queryFn: async () => {
      const initData = getInitData();
      const data = await getDeliveries(initData);
      if (!data || !Array.isArray(data)) {
        throw new Error("Invalid data format for deliveries");
      }
      return data;
    },
    enabled: areDeliveriesVisible, // Запрос выполняется только когда слой видим
    staleTime: 5 * 60 * 1000, // Данные считаются свежими в течение 5 минут
    refetchOnWindowFocus: false,
  });

  // Эффект для обновления глобального состояния (Zustand) после успешной загрузки доставок
  useEffect(() => {
    if (fetchedDeliveries) {
      setDeliveries(fetchedDeliveries);
      
      const statuses = [...new Set(fetchedDeliveries.map(d => d.status))];
      setAvailableStatuses(statuses);
      
      setSelectedStatuses(prev => {
        if (!Array.isArray(prev)) return statuses;
        const currentStatuses = new Set(prev);
        let changed = false;
        statuses.forEach(s => {
          if (!currentStatuses.has(s)) {
            currentStatuses.add(s);
            changed = true;
          }
        });
        return changed ? Array.from(currentStatuses) : prev;
      });
    }
  }, [fetchedDeliveries, setDeliveries, setAvailableStatuses, setSelectedStatuses]);

  // Пересчет размера карты при изменении макета (чтобы избежать "серых плиток")
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current.invalidateSize();
      }, 400); // Задержка для завершения CSS-анимаций
    }
  }, [isDataTopVisible, isAddressSearchVisible]);


  // --- ЛОГИКА РЕНДЕРИНГА ---

  // Маркер, отображаемый при выборе адреса через поиск
  let addressMarker = null;
  if (addressData && addressData.lat) {
    addressMarker = (
      <Marker
        icon={customIcon}
        position={[addressData.lat, addressData.lon]}
      >
        <Popup>{addressData.display_name}</Popup>
      </Marker>
    );
  }

  // Прелоадер до монтирования компонента на клиенте
  if (!isMounted) {
    return <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>Loading Map...</div>;
  }

  return (
    <div
      className={`${css.container} ${
        !isDataTopVisible ? css.dataLoadedLayout : ""
      } ${
        !isAddressSearchVisible ? css.addressSearchHidden : ""
      }`}
    >
      {/* Пустой div для хедера, если он будет нужен */}
      <div className={css.header}></div>
      
      {/* Кнопка-иконка для открытия панели поиска */}
      <div className={css.searchToggle} onClick={() => setIsSearchPanelOpen(!isSearchPanelOpen)}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </div>

      {/* Боковая панель (поиск или списки) */}
      <div className={`${css.input} ${css.searchPanel} ${isSearchPanelOpen ? css.searchOpen : css.searchClosed}`}>
        {/* В зависимости от активного слоя, показываем разный контент */}
        {areDeliveriesVisible ? (
          <DeliveriesList 
            deliveries={deliveries}
            onClose={() => setIsSearchPanelOpen(false)}
            onFlyTo={(lat, lon) => setFlyToCoords([lat, lon])}
            onSelectDelivery={(delivery) => {
              setSelectedDelivery(delivery);
              setIsSheetOpen(true);
            }}
            selectedStatuses={selectedStatuses}
          />
        ) : areApplicationsVisible ? (
          <ApplicationsList 
            onClose={() => setIsSearchPanelOpen(false)} 
            onFlyTo={(lat, lon) => setFlyToCoords([lat, lon])}
            onAddClient={handleAddClient}
          />
        ) : areClientsVisible ? (
          <ClientsList 
            clients={clients}
            onClose={() => setIsSearchPanelOpen(false)}
            onFlyTo={(lat, lon) => setFlyToCoords([lat, lon])}
            onClientSelect={(client) => setSelectedClient(client)}
            onAddClient={handleAddClient}
          />
        ) : (
          // По умолчанию - поиск адреса
          <InputAddress onAddressSelect={(data) => {
              if (isRoutingMode && data.lat && data.lon) {
                // В режиме маршрутизации добавляем найденный адрес как точку
                handleMarkerClickForRouting(data.lat, data.lon, data.display_name || 'Адреса з пошуку', 'Пошук');
              } else {
                onAddressSelect(data);
              }
              setIsSearchPanelOpen(false);
          }} />
        )}
        <div className={css.searchCloseBtn} onClick={() => setIsSearchPanelOpen(false)}>
          ✕
        </div>
      </div>

      {/* Основной контейнер карты */}
      <div className={css.map}>
        <MapContainer
          className={css.leafletMap}
          ref={mapRef}
          center={
            addressData.lat
              ? [addressData.lat, addressData.lon]
              : [49.973022, 35.984668] // Координаты по умолчанию (Харьков)
          }
          zoom={13}
        >
          {/* Компоненты, отрисовываемые поверх карты */}
          <MapControls
            areApplicationsVisible={areApplicationsVisible}
            toggleApplications={toggleApplications}
            areClientsVisible={areClientsVisible}
            toggleClients={toggleClients}
            areDeliveriesVisible={areDeliveriesVisible}
            toggleDeliveries={() => setDeliveriesVisible(!areDeliveriesVisible)}
            isRoutingMode={isRoutingMode}
            toggleRoutingMode={handleToggleRoutingMode}
          />

          <ZoomTracker onZoomChange={setCurrentZoom} />
          
          {/* Контрол для переключения базовых слоев карты (спутник, схема и т.д.) */}
          <LayersControl position="bottomright">
            <BaseLayer checked name="OpenStreetMap">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </BaseLayer>
            <BaseLayer name="CartoDB Positron">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
            </BaseLayer>
            <BaseLayer name="Google Satellite (Спутник)">
              <TileLayer
                attribution='&copy; Google'
                url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
              />
            </BaseLayer>
          </LayersControl>

          {/* Рендеринг маркеров складов */}
          {warehouses.map((warehouse) => (
            <Marker
              key={`warehouse-${warehouse.id}`}
              position={[warehouse.lat, warehouse.lng]}
              icon={warehouseIcon}
              eventHandlers={{
                click: () => {
                  if (isRoutingMode) {
                    handleMarkerClickForRouting(warehouse.lat, warehouse.lng, warehouse.name, 'Склад');
                  }
                },
              }}
            >
              <Popup>
                <div>
                  <strong>{warehouse.name}</strong><br />
                  {warehouse.description}
                </div>
              </Popup>
            </Marker>
          ))}
          
          {/* Рендеринг маркеров доставок (если слой включен) */}
          {areDeliveriesVisible && (() => {
            const groupedDeliveries = groupItemsByLocation(filteredDeliveries);
            return groupedDeliveries.flatMap((group) => {
              return group.map((delivery, index) => {
                const position = applyOffset(delivery.latitude, delivery.longitude, index, group.length, currentZoom);
                return (
                  <Marker
                      key={`delivery-${delivery.id}`}
                      position={position}
                      zIndexOffset={index === group.length - 1 ? 1000 : 0} // Последний маркер в группе поверх остальных
                      icon={deliveryIcon(
                        // Иконка желтая, если доставка выбрана, иначе - по статусу
                        selectedDeliveries.some(d => d.id === delivery.id)
                          ? '#FFD700'
                          : getStatusColor(delivery.status),
                        index === group.length - 1 ? group.length : 1 // Передаем кол-во для бейджа
                      )} 
                      eventHandlers={{
                          click: (e) => {
                              const isMulti = e.originalEvent.ctrlKey || e.originalEvent.metaKey; // Проверка на Ctrl/Cmd
                              if (isMulti) {
                                toggleSelectedDelivery(delivery); // Мульти-выбор
                              } else {
                                setSelectedDelivery(delivery); // Одиночный выбор
                              }
                              setIsSheetOpen(true); // Открываем нижнюю панель
                          }
                      }}
                  >
                      {/* Всплывающее окно с информацией о доставке */}
                      <Popup>
                          <div className={css.deliveryPopup}>
                              <strong>🚀 Доставка: {delivery.client}</strong><br />
                              <span style={{color: '#666', fontSize: '12px'}}>Статус: <b>{delivery.status}</b></span><br />
                              Адреса: {delivery.address}<br />
                              Дата: {delivery.delivery_date}<br />
                              Менеджер: {delivery.manager}<br />
                              <strong>Загальна вага: {delivery.total_weight?.toFixed(2)} кг</strong><br />
                              {delivery.comment && (
                                  <>
                                      <hr style={{margin: '5px 0'}}/>
                                      <i>Коментар: {delivery.comment}</i>
                                  </>
                              )}
                          </div>
                      </Popup>
                  </Marker>
                );
              });
            });
          })()}

          {/* Рендеринг маркеров заявок (если слой включен) */}
          {areApplicationsVisible && (() => {
            const groupedApps = groupItemsByLocation(filteredApplications);
            return groupedApps.flatMap((group, gIndex) => {
              return group.map((item, iIndex) => {
                const position = applyOffset(item.address.latitude, item.address.longitude, iIndex, group.length, currentZoom);
                const isGroup = group.length > 1;

                return (
                  <Marker
                    key={`app-${item.id || `${gIndex}-${iIndex}`}`}
                    position={position}
                    zIndexOffset={iIndex === group.length - 1 ? 1000 : 0}
                    icon={getDynamicGroupedIcon("/images/order.png", iIndex === group.length - 1 ? group.length : 1, item.totalWeight || 0)}
                    eventHandlers={{
                      click: () => {
                        if (isRoutingMode) {
                          handleMarkerClickForRouting(item.address.latitude, item.address.longitude, item.client, 'Заявка');
                        } else {
                          setSelectedClient(item);
                          setIsSheetOpen(true);
                        }
                      },
                    }}
                  >
                    {!isRoutingMode && (
                      <Popup>
                        <div
                          onClick={() => {
                            setSelectedClient(item);
                            setIsSheetOpen(true);
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          {isGroup && <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '10px' }}>Група ({iIndex + 1}/{group.length})</div>}
                          <strong>{item.client}</strong><br />
                          {item.address.city}, {item.address.area}<br />
                          <strong>Кількість заявок: {item.count}</strong><br />
                          <em style={{ fontSize: '0.85em', color: '#666' }}>Тицніть для деталей</em>
                        </div>
                      </Popup>
                    )}
                  </Marker>
                );
              });
            });
          })()}

          {/* Рендеринг маркеров клиентов (если слой включен) */}
          {areClientsVisible && (() => {
            const groupedClients = groupItemsByLocation(filteredClients.map(c => ({
              ...c,
              address: { latitude: c.latitude, longitude: c.longitude }
            })));

            return groupedClients.flatMap((group, gIndex) => {
              return group.map((client, iIndex) => {
                const position = applyOffset(client.latitude, client.longitude, iIndex, group.length, currentZoom);
                const isGroup = group.length > 1;

                return (
                  <Marker
                    key={`client-${client.id || `${gIndex}-${iIndex}`}`}
                    position={position}
                    zIndexOffset={iIndex === group.length - 1 ? 1000 : 0}
                    icon={getGroupedIcon("/images/client.png", iIndex === group.length - 1 ? group.length : 1)}
                    eventHandlers={{
                      click: () => {
                        if (isRoutingMode) {
                          handleMarkerClickForRouting(client.latitude, client.longitude, client.client, 'Клієнт');
                        } else {
                          setSelectedClient(client);
                          setIsSheetOpen(true);
                        }
                      },
                    }}
                  >
                    {!isRoutingMode && (
                      <Popup>
                        <div
                          onClick={() => {
                            setSelectedClient(client);
                            setIsSheetOpen(true);
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          {isGroup && <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '10px' }}>Група ({iIndex + 1}/{group.length})</div>}
                          <strong>{client.client}</strong><br />
                          {`${client.region} обл., ${client.area} район, ${client.commune} громада, ${client.city}`} <br />
                          {`Менеджер: ${client.manager}`}<br />
                          {`Контактна особа: ${client.representative}`}<br />
                          {`Телефон: ${client.phone1}`}<br />
                        </div>
                      </Popup>
                    )}
                  </Marker>
                );
              });
            });
          })()}

          {/* Маркер из поиска адреса (отображается, если не активен слой заявок) */}
          {!areApplicationsVisible && addressMarker}
          {/* Компонент для синхронизации центра карты с выбранным адресом */}
          {!areApplicationsVisible && (
            <ChangeMapView
              center={addressData.lat ? [addressData.lat, addressData.lon] : null}
            />
          )}
          {/* Контроллер для принудительного перемещения карты */}
          <MapController coords={flyToCoords} />
          {/* Контрол для рисования на карте (выделения) */}
          <DrawControl 
            applications={filteredApplications}
            clients={filteredClients}
            deliveries={filteredDeliveries}
            onSelectionCreate={handleSelectionCreate}
          />
          {/* Контрол для отрисовки маршрута (если активен режим) */}
          {isRoutingMode && (
            <RoutingControl 
              waypoints={routeWaypoints}
              onRouteFound={handleRouteFound}
              onRoutingError={handleRoutingError}
            />
          )}
        </MapContainer>
        {/* Боковая панель маршрутизации */}
        <RoutePanel 
          routeInfo={routeInfo}
          waypoints={routeWaypoints}
          onClear={handleClearRoute}
          onDeleteWaypoint={handleDeleteWaypoint}
          onMoveWaypoint={handleMoveWaypoint}
          onOptimize={handleOptimizeRoute}
          onToggleMode={handleToggleRoutingMode}
          isActive={isRoutingMode}
        />
      </div>

      {/* Нижняя выдвижная панель (Bottom Sheet) */}
      <div className={`${css.bottomSheet} ${isSheetOpen ? css.sheetOpen : css.sheetClosed}`}>
        <div className={css.sheetHeader} onClick={() => setIsSheetOpen(!isSheetOpen)}>
           <div className={css.sheetHandle}></div>
        </div>
        <div className={css.sheetContent}>
            {/* Разделение панели на две части - верхнюю и нижнюю, логика отображения внутри */}
            <div className={css.dataTop}>
                <TopData />
            </div>
            <div className={css.dataBottom}>
                <BottomData onEditClient={handleEditClient} />
            </div>
        </div>
      </div>

      {/* Модальные окна, которые отображаются поверх всего */}
      <EditClientModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        onSave={handleSaveClient} 
        client={editingClient} 
      />
      <EditDeliveryModal />
    </div>
  );
}
