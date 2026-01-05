"use client";

import { MapContainer, TileLayer, Marker, Popup, LayersControl } from "react-leaflet";
const { BaseLayer } = LayersControl;
import "leaflet/dist/leaflet.css";
import css from "./App.module.css";
import TopData from "./components/topData/topData";
import InputAddress from "./components/inputAddress/InputAddress";
import BottomData from "./components/bottomData/bottomData";
import { useDisplayAddressStore } from "./store/displayAddress";
import { useApplicationsStore } from "./store/applicationsStore";
import { fetchOrdersHeatmapData, fetchOrdersAndAddresses, mergeOrdersWithAddresses } from "./fetchOrdersWithAddresses";
import ChangeMapView from "./components/ChangeMapView/ChangeMapView";
import { getDeliveries } from "../../lib/api";
import Header from "./components/Header/Header";
import { getInitData } from "@/lib/getInitData";
import { useState, useRef, useEffect, useCallback } from "react";
import { customIcon, clientIcon, warehouseIcon, deliveryIcon } from "./leaflet-icon";
import { getStatusColor } from "./statusUtils";
import { warehouses } from "./warehouses";
import HeatmapLayer from "./components/HeatmapLayer/HeatmapLayer";
import { useMapControlStore } from "./store/mapControlStore";
import ApplicationsList from "./components/ApplicationsList/ApplicationsList";
import ClientsList from "./components/ClientsList/ClientsList";
import DeliveriesList from "./components/DeliveriesList/DeliveriesList";
import EditClientModal from "./components/EditClientModal/EditClientModal";
import EditDeliveryModal from "./components/EditDeliveryModal/EditDeliveryModal";
import DrawControl from "./components/DrawControl/DrawControl";
import SelectionList from "./components/SelectionList/SelectionList";
import RoutingControl from "./components/RoutingControl/RoutingControl";
import RoutePanel from "./components/RoutePanel/RoutePanel";
import MapControls from "./components/MapControls/MapControls";
import { useMap, useMapEvents } from "react-leaflet"; // Импортируем useMap

// Компонент для отслеживания зума
function ZoomTracker({ onZoomChange }) {
  const map = useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom());
    },
  });
  return null;
}

// Компонент для управления картой (flyTo)
function MapController({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.flyTo(coords, 16);
    }
  }, [coords, map]);
  return null;
}

// Helper function to group items by location
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

// Helper function to apply offset for overlapping markers
const applyOffset = (lat, lon, index, total, zoom = 13) => {
  if (total <= 1) return [lat, lon];
  
  // Circular offset
  const angle = (index / total) * 2 * Math.PI;
  
  // Adjust radius based on zoom. 
  // At zoom 13, radius should be ~0.0001
  // At zoom 10, radius should be ~0.001 (multiplied by 10)
  // Formula: base_radius * 2^(13 - current_zoom)
  const baseRadius = 0.00008;
  const zoomFactor = Math.pow(2, Math.max(0, 15 - zoom)); // Higher spread at lower zoom
  const radius = baseRadius * zoomFactor; 
  
  const offsetLat = parseFloat(lat) + (radius * Math.cos(angle));
  const offsetLon = parseFloat(lon) + (radius * Math.sin(angle));
  
  return [offsetLat, offsetLon];
};

// Helper to create grouped icon with badge
const getGroupedIcon = (baseIconUrl, count, size = 32) => {
  if (count <= 1) {
    return new L.Icon({
      iconUrl: baseIconUrl,
      iconSize: [size, size],
      iconAnchor: [size / 2, size],
      popupAnchor: [1, -size],
    });
  }

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

export default function MapFeature({ onAddressSelect }) {
  const { addressData, setAddressData } = useDisplayAddressStore();
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
    setDeliveries
  } = useApplicationsStore();
  
  const [isDataTopVisible, setDataTopVisible] = useState(false);
  const [isAddressSearchVisible, setAddressSearchVisible] = useState(true);
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const { 
    areApplicationsVisible, 
    setApplicationsVisible, 
    toggleApplications,
    showHeatmap, 
    toggleHeatmap,
    areClientsVisible,
    toggleClients,
    areDeliveriesVisible,
    setDeliveriesVisible,
    selectedStatuses,
    setSelectedStatuses,
    availableStatuses,
    setAvailableStatuses
  } = useMapControlStore();
  
  // Filter applications based on selected manager
  const filteredApplications = selectedManager 
    ? applications.filter(app => app.address?.manager === selectedManager)
    : applications;

  // Filter clients based on selected manager
  const filteredClients = selectedManager
    ? clients.filter(client => client.manager === selectedManager)
    : clients;

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const mapRef = useRef(null);
  const [isMounted, setIsMounted] = useState(false);
  const [flyToCoords, setFlyToCoords] = useState(null); // Состояние для flyTo
  const [currentZoom, setCurrentZoom] = useState(13);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectionType, setSelectionType] = useState(null); // 'applications', 'clients', 'deliveries'
  const [isSelectionListOpen, setIsSelectionListOpen] = useState(false);

  // Routing state
  const [isRoutingMode, setIsRoutingMode] = useState(false);
  const [routeWaypoints, setRouteWaypoints] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);


  const handleSaveClient = (clientData) => {
    console.log("Saving client data:", clientData);
    // Here you would typically make an API call to save the data
    // For now, we update the local state to reflect changes immediately
    if (editingClient) {
        // Update existing client - preserve all original fields and merge with new data
        const updatedClient = { ...editingClient, ...clientData };
        setClients(prev => prev.map(c => c.client === editingClient.client ? updatedClient : c));
        // Update selectedClient if it's the one being edited
        if (selectedClient?.client === editingClient.client) {
          setSelectedClient(updatedClient);
        }
    } else {
        // Add new client
        setClients(prev => [...prev, clientData]);
    }
    // Clear address marker from main map
    setAddressData({});
  };

  const handleAddClient = (initialData = null) => {
    // Если переданы начальные данные (например, из заявки без адреса), 
    // используем их, но убеждаемся, что нет ID, чтобы это считалось созданием нового
    if (initialData) {
      setEditingClient({ ...initialData, id: null });
    } else {
      setEditingClient(null);
    }
    setIsEditModalOpen(true);
  };

  const handleEditClient = (client) => {
    setEditingClient(client);
    setIsEditModalOpen(true);
  };

  const handleSelectionCreate = (selection) => {
    console.log('=== handleSelectionCreate вызвана ===');
    console.log('Selection:', selection);
    
    if (selection.deliveries && selection.deliveries.length > 0) {
        setSelectedDeliveries(selection.deliveries);
        setIsSelectionListOpen(true);
    } else if (selection.applications && selection.applications.length > 0) {
      setSelectedItems(selection.applications);
      setSelectionType('applications');
      setIsSelectionListOpen(true);
    } else if (selection.clients && selection.clients.length > 0) {
      setSelectedItems(selection.clients);
      setSelectionType('clients');
      setIsSelectionListOpen(true);
    }
  };

  // Routing handlers
  // Routing handlers
  const handleToggleRoutingMode = useCallback(() => {
    setIsRoutingMode(prev => !prev);
    if (isRoutingMode) {
      // Clear routing when disabling
      setRouteWaypoints([]);
      setRouteInfo(null);
    }
  }, [isRoutingMode]);

  const handleMarkerClickForRouting = useCallback((lat, lng, name = '', type = '') => {
    if (!isRoutingMode) return;

    setRouteWaypoints(prev => {
      // If we already have 2 points and the user clicks another, 
      // we can either add it as a via point or reset. 
      // User complaint "can only select two points" suggests they want more.
      // Let's allow adding up to 10 points for now.
      if (prev.length >= 10) {
        alert("Максимальное количество точек маршрута: 10");
        return prev;
      }
      return [...prev, { lat, lng, name, type }];
    });
  }, [isRoutingMode]);

  const handleClearRoute = useCallback(() => {
    setRouteWaypoints([]);
    setRouteInfo(null);
  }, []);

  const handleDeleteWaypoint = useCallback((index) => {
    setRouteWaypoints(prev => prev.filter((_, i) => i !== index));
    setRouteInfo(null);
  }, []);

  const handleMoveWaypoint = useCallback((fromIndex, toIndex) => {
    setRouteWaypoints(prev => {
      const newWaypoints = [...prev];
      const [moved] = newWaypoints.splice(fromIndex, 1);
      newWaypoints.splice(toIndex, 0, moved);
      return newWaypoints;
    });
    setRouteInfo(null);
  }, []);

  const handleOptimizeRoute = useCallback((method = 'nearest') => {
    if (routeWaypoints.length < 3) return;

    setRouteWaypoints(prev => {
      if (prev.length < 3) return prev;
      
      const start = prev[0];
      const end = prev[prev.length - 1];
      const middle = prev.slice(1, -1);
      
      // Calculate distance between two points
      const distance = (p1, p2) => {
        const dx = p1.lat - p2.lat;
        const dy = p1.lng - p2.lng;
        return Math.sqrt(dx * dx + dy * dy);
      };
      
      let optimized = [start];
      
      if (method === 'nearest') {
        // Nearest neighbor algorithm
        const remaining = [...middle];
        let current = start;
        
        while (remaining.length > 0) {
          let nearestIndex = 0;
          let nearestDist = distance(current, remaining[0]);
          
          for (let i = 1; i < remaining.length; i++) {
            const dist = distance(current, remaining[i]);
            if (dist < nearestDist) {
              nearestDist = dist;
              nearestIndex = i;
            }
          }
          
          current = remaining[nearestIndex];
          optimized.push(current);
          remaining.splice(nearestIndex, 1);
        }
      } else if (method === 'shortest') {
        // 2-opt algorithm for shortest path
        let route = [...middle];
        let improved = true;
        
        while (improved) {
          improved = false;
          for (let i = 0; i < route.length - 1; i++) {
            for (let j = i + 1; j < route.length; j++) {
              const currentDist = distance(route[i], route[i + 1]) + distance(route[j], route[j + 1] || end);
              const newDist = distance(route[i], route[j]) + distance(route[i + 1], route[j + 1] || end);
              
              if (newDist < currentDist) {
                // Reverse the segment between i+1 and j
                const segment = route.slice(i + 1, j + 1).reverse();
                route = [...route.slice(0, i + 1), ...segment, ...route.slice(j + 1)];
                improved = true;
              }
            }
          }
        }
        optimized = [start, ...route];
      } else if (method === 'reverse') {
        // Simply reverse the middle points
        optimized = [start, ...middle.reverse()];
      }
      
      optimized.push(end);
      return optimized;
    });
    setRouteInfo(null);
  }, [routeWaypoints]);

  const handleRouteFound = useCallback((info) => {
    setRouteInfo(info);
  }, []);

  const handleRoutingError = useCallback((error) => {
    console.error('Routing error:', error);
    // Suppress alert to avoid spamming if it happens frequently during drag
    // alert('Не удалось построить маршрут. Попробуйте выбрать другие точки.');
  }, []);


  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLoadDataClick = () => {
    setDataTopVisible((prev) => !prev);
  };

  const handleToggleAddressSearch = () => {
    setAddressSearchVisible((prev) => !prev);
  };

  const handleToggleApplications = () => {
    setApplicationsVisible((prev) => !prev);
  };

  useEffect(() => {
    const getApplications = async () => {
      if (areApplicationsVisible && applications.length === 0) {
        console.log('Fetching orders and addresses...');
        const initData = getInitData();
        const { mergedData, unmappedData, heatmapPoints } = await fetchOrdersHeatmapData(initData);
        console.log('Merged data:', mergedData);
        console.log('Unmapped data:', unmappedData);
        console.log('Heatmap points:', heatmapPoints);
        // Сохраняем объединенные данные в store
        setApplications(mergedData);
        setUnmappedApplications(unmappedData);
      }
    };
    getApplications();
  }, [areApplicationsVisible, applications.length, setApplications]);

  useEffect(() => {
    const getClients = async () => {
      if (areClientsVisible && clients.length === 0) {
        console.log('Fetching clients...');
        const { addresses } = await import("./fetchOrdersWithAddresses").then(mod => mod.fetchOrdersAndAddresses());
        // Filter addresses that have coordinates
        const validClients = addresses.filter(addr => addr.latitude && addr.longitude);
        setClients(validClients);
        console.log('Clients:', validClients);
      }
    };
    getClients();
  }, [areClientsVisible, clients.length]);

  // Fetch deliveries
  useEffect(() => {
    const fetchDeliveries = async () => {
        if (areDeliveriesVisible) {
            try {
                const initData = getInitData();
                const data = await getDeliveries(initData); 
                
                if (data && Array.isArray(data)) {
                  setDeliveries(data);
                  
                  // Extract unique statuses
                  const statuses = [...new Set(data.map(d => d.status))];
                  setAvailableStatuses(statuses);
                  
                  // If we have new statuses that weren't in selectedStatuses, add them
                  setSelectedStatuses(prev => {
                      if (!Array.isArray(prev)) return statuses;
                      if (prev.length === 0) return statuses;
                      const newStatuses = statuses.filter(s => !prev.includes(s));
                      if (newStatuses.length > 0) {
                          return [...prev, ...newStatuses];
                      }
                      return prev;
                  });
                }
            } catch (e) {
                console.error("❌ [MapFeature] Error fetching deliveries:", e);
            }
        }
    };
    fetchDeliveries();
  }, [areDeliveriesVisible, setDeliveries, setSelectedStatuses, setAvailableStatuses]);

  // Filtered deliveries
  const filteredDeliveries = deliveries
          .filter(d => {
            const statusMatch = Array.isArray(selectedStatuses) && selectedStatuses.includes(d.status);
            const managerMatch = !selectedManager || d.manager === selectedManager;
            return statusMatch && managerMatch;
          });
  

  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current.invalidateSize();
      }, 400);
    }
  }, [isDataTopVisible, isAddressSearchVisible]);

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
      <div className={css.header}>
        {/* <Header
          onLoadDataClick={handleLoadDataClick}
          isDataTopVisible={isDataTopVisible}
          onToggleAddressSearch={handleToggleAddressSearch}
          isAddressSearchVisible={isAddressSearchVisible}
          onToggleApplications={handleToggleApplications}
          areApplicationsVisible={areApplicationsVisible}
        /> */}
      </div>
      
      {/* Mobile Search Toggle Button */}
      <div className={css.searchToggle} onClick={() => setIsSearchPanelOpen(!isSearchPanelOpen)}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </div>

      {/* Heatmap Toggle Button */}
      {/* {areApplicationsVisible && (
        <div 
          className={css.heatmapToggle} 
          onClick={toggleHeatmap}
          title={showHeatmap ? "Показать маркеры" : "Показать тепловую карту"}
        >
          {showHeatmap ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <path d="M8 13h2"></path>
              <path d="M8 17h2"></path>
              <path d="M14 13h2"></path>
              <path d="M14 17h2"></path>
            </svg>
          )}
        </div>
      )} */}



      <div className={`${css.input} ${css.searchPanel} ${isSearchPanelOpen ? css.searchOpen : css.searchClosed}`}>
        {areDeliveriesVisible ? (
          <DeliveriesList 
            deliveries={deliveries}
            onClose={() => setIsSearchPanelOpen(false)}
            onFlyTo={(lat, lon) => {
              setFlyToCoords([lat, lon]);
            }}
            onSelectDelivery={(delivery) => {
              setSelectedDelivery(delivery);
              setIsSheetOpen(true);
            }}
            selectedStatuses={selectedStatuses}
          />
        ) : areApplicationsVisible ? (
          <ApplicationsList 
            onClose={() => setIsSearchPanelOpen(false)} 
            onFlyTo={(lat, lon) => {
              console.log('MapFeature onFlyTo triggered:', lat, lon);
              setFlyToCoords([lat, lon]); // Обновляем состояние для MapController
            }}
            onAddClient={handleAddClient}
          />
        ) : areClientsVisible ? (
          <ClientsList 
            clients={clients}
            onClose={() => setIsSearchPanelOpen(false)}
            onFlyTo={(lat, lon) => {
              console.log('MapFeature client onFlyTo triggered:', lat, lon);
              setFlyToCoords([lat, lon]);
            }}
            onClientSelect={(client) => setSelectedClient(client)}
            onAddClient={handleAddClient}
          />
        ) : (
          <InputAddress onAddressSelect={(data) => {
              if (isRoutingMode && data.lat && data.lon) {
                // Add address to route
                handleMarkerClickForRouting(data.lat, data.lon, data.display_name || 'Адреса з пошуку', 'Пошук');
              } else {
                // Normal address selection
                onAddressSelect(data);
              }
              setIsSearchPanelOpen(false);
          }} />
        )}
        <div className={css.searchCloseBtn} onClick={() => setIsSearchPanelOpen(false)}>
          ✕
        </div>
      </div>



      <div className={css.map}>
        <MapContainer
          className={css.leafletMap}
          ref={mapRef}
          center={
            addressData.lat
              ? [addressData.lat, addressData.lon]
              : [49.973022, 35.984668]
          }
          zoom={13}
        >
          {/* Map Controls */}
          <MapControls
            areApplicationsVisible={areApplicationsVisible}
            toggleApplications={toggleApplications}
            showHeatmap={showHeatmap}
            toggleHeatmap={toggleHeatmap}
            areClientsVisible={areClientsVisible}
            toggleClients={toggleClients}
            areDeliveriesVisible={areDeliveriesVisible}
            toggleDeliveries={() => setDeliveriesVisible(!areDeliveriesVisible)}
            isRoutingMode={isRoutingMode}
            toggleRoutingMode={handleToggleRoutingMode}
          />

          <ZoomTracker onZoomChange={setCurrentZoom} />
          
          <LayersControl position="bottomright">
            {/* Обычные карты */}
            <BaseLayer checked name="OpenStreetMap">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </BaseLayer>
            
            <BaseLayer name="OpenStreetMap Hot">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a>'
                url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
              />
            </BaseLayer>

            <BaseLayer name="CartoDB Positron">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
            </BaseLayer>

            <BaseLayer name="CartoDB Dark Matter">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
            </BaseLayer>

            {/* Спутниковые карты */}
            <BaseLayer name="ESRI World Imagery (Спутник)">
              <TileLayer
                attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            </BaseLayer>

            <BaseLayer name="Google Satellite (Спутник)">
              <TileLayer
                attribution='&copy; Google'
                url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
              />
            </BaseLayer>

            <BaseLayer name="Google Hybrid (Спутник + Дороги)">
              <TileLayer
                attribution='&copy; Google'
                url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
              />
            </BaseLayer>

            <BaseLayer name="OpenTopoMap">
              <TileLayer
                attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
                url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              />
            </BaseLayer>
          </LayersControl>
          {/* Warehouse Markers */}
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
          
          {/* Delivery Markers with Status Filter */}
          {areDeliveriesVisible && (() => {
            const groupedDeliveries = groupItemsByLocation(filteredDeliveries);
            return groupedDeliveries.flatMap((group) => {
              return group.map((delivery, index) => {
                const position = applyOffset(delivery.latitude, delivery.longitude, index, group.length, currentZoom);
                return (
                  <Marker
                      key={`delivery-${delivery.id}`}
                      position={position}
                      zIndexOffset={index === group.length - 1 ? 1000 : 0}
                      icon={deliveryIcon(
                        selectedDeliveries.some(d => d.id === delivery.id) 
                          ? '#FFD700' // Gold color for selected
                          : getStatusColor(delivery.status),
                        index === group.length - 1 ? group.length : 1 // Badge on the last marker
                      )} 
                      eventHandlers={{
                          click: (e) => {
                              const isMulti = e.originalEvent.ctrlKey || e.originalEvent.metaKey;
                              if (isMulti) {
                                toggleSelectedDelivery(delivery);
                              } else {
                                setSelectedDelivery(delivery);
                              }
                              setIsSheetOpen(true);
                          }
                      }}
                  >
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

          {areApplicationsVisible && !showHeatmap && (() => {
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
                    icon={getGroupedIcon("/images/marker-icon.png", iIndex === group.length - 1 ? group.length : 1, 25)}
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

          {areClientsVisible && (() => {
            const groupedClients = groupItemsByLocation(filteredClients.map(c => ({
              ...c,
              address: { latitude: c.latitude, longitude: c.longitude } // Normalize structure for helper
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
          {areApplicationsVisible && showHeatmap && (
            <HeatmapLayer 
              points={filteredApplications.map(item => [
                parseFloat(item.address.latitude),
                parseFloat(item.address.longitude),
                item.totalWeight || 0.1 // Интенсивность = ОБЩИЙ ВЕС
              ])}
            />
          )}
          {!areApplicationsVisible && addressMarker}
          {!areApplicationsVisible && (
            <ChangeMapView
              center={addressData.lat ? [addressData.lat, addressData.lon] : null}
            />
          )}
          <MapController coords={flyToCoords} />
          <DrawControl 
            applications={filteredApplications}
            clients={filteredClients}
            deliveries={filteredDeliveries} // Pass filtered deliveries to DrawControl
            onSelectionCreate={handleSelectionCreate}
          />
          {isRoutingMode && (
            <RoutingControl 
              waypoints={routeWaypoints}
              onRouteFound={handleRouteFound}
              onRoutingError={handleRoutingError}
            />
          )}
        </MapContainer>
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
      <div className={`${css.bottomSheet} ${isSheetOpen ? css.sheetOpen : css.sheetClosed}`}>
        <div className={css.sheetHeader} onClick={() => setIsSheetOpen(!isSheetOpen)}>
           <div className={css.sheetHandle}></div>
        </div>
        <div className={css.sheetContent}>
            <div className={css.dataTop}>
                <TopData />
            </div>
            <div className={css.dataBottom}>
                <BottomData onEditClient={handleEditClient} />
            </div>
        </div>
      </div>
      <EditClientModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        onSave={handleSaveClient} 
        client={editingClient} 
      />
      <EditDeliveryModal />
      {isSelectionListOpen && selectedItems.length > 0 && (
        <SelectionList 
          items={selectedItems}
          type={selectionType}
          onClose={() => {
            console.log('Закрываем SelectionList');
            setIsSelectionListOpen(false);
          }}
        />
      )}
    </div>
  );
}
