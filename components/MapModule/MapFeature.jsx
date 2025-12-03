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
import Header from "./components/Header/Header";
import { useState, useRef, useEffect } from "react";
import { customIcon, clientIcon, warehouseIcon } from "./leaflet-icon";
import { warehouses } from "./warehouses";
import HeatmapLayer from "./components/HeatmapLayer/HeatmapLayer";
import { useMapControlStore } from "./store/mapControlStore";
import ApplicationsList from "./components/ApplicationsList/ApplicationsList";
import ClientsList from "./components/ClientsList/ClientsList";
import EditClientModal from "./components/EditClientModal/EditClientModal";
import DrawControl from "./components/DrawControl/DrawControl";
import { useMap } from "react-leaflet"; // Импортируем useMap

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
    const key = `${item.address?.latitude || item.latitude},${item.address?.longitude || item.longitude}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
  });
  return Object.values(groups);
};

export default function MapFeature({ onAddressSelect }) {
  const { addressData, setAddressData } = useDisplayAddressStore();
  const { applications, setApplications, selectedClient, setSelectedClient, setUnmappedApplications, selectedManager } = useApplicationsStore();
  
  const [isDataTopVisible, setDataTopVisible] = useState(false);
  const [isAddressSearchVisible, setAddressSearchVisible] = useState(true);
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);
  const areApplicationsVisible = useMapControlStore((state) => state.areApplicationsVisible);
  const setAreApplicationsVisible = useMapControlStore((state) => state.setApplicationsVisible);
  const showHeatmap = useMapControlStore((state) => state.showHeatmap);
  const toggleHeatmap = useMapControlStore((state) => state.toggleHeatmap);
  const areClientsVisible = useMapControlStore((state) => state.areClientsVisible);
  const toggleClients = useMapControlStore((state) => state.toggleClients);
  const [clients, setClients] = useState([]);
  
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

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

  const handleAddClient = () => {
    setEditingClient(null);
    setIsEditModalOpen(true);
  };

  const handleEditClient = (client) => {
    setEditingClient(client);
    setIsEditModalOpen(true);
  };

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
    setAreApplicationsVisible((prev) => !prev);
  };

  useEffect(() => {
    const getApplications = async () => {
      if (areApplicationsVisible && applications.length === 0) {
        console.log('Fetching orders and addresses...');
        const { mergedData, unmappedData, heatmapPoints } = await fetchOrdersHeatmapData();
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
      {areApplicationsVisible && (
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
      )}



      <div className={`${css.input} ${css.searchPanel} ${isSearchPanelOpen ? css.searchOpen : css.searchClosed}`}>
        {areApplicationsVisible ? (
          <ApplicationsList 
            onClose={() => setIsSearchPanelOpen(false)} 
            onFlyTo={(lat, lon) => {
              console.log('MapFeature onFlyTo triggered:', lat, lon);
              setFlyToCoords([lat, lon]); // Обновляем состояние для MapController
            }}
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
              onAddressSelect(data);
              setIsSearchPanelOpen(false);
          }} />
        )}
        <div className={css.searchCloseBtn} onClick={() => setIsSearchPanelOpen(false)}>
          ✕
        </div>
      </div>
      <div className={css.map}>
        {/* Clients Toggle Button */}
        <div 
          className={css.clientsToggle} 
          onClick={toggleClients}
          title={areClientsVisible ? "Скрити контрагентів" : "Показати контрагентів"}
          style={{
            background: areClientsVisible ? '#4caf50' : 'white',
            color: areClientsVisible ? 'white' : 'black',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </div>
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
            >
              <Popup>
                <div>
                  <strong>{warehouse.name}</strong><br />
                  {warehouse.description}
                </div>
              </Popup>
            </Marker>
          ))}
          {areApplicationsVisible && !showHeatmap && (() => {
            const groupedApps = groupItemsByLocation(filteredApplications);
            return groupedApps.map((group, index) => {
              const item = group[0];
              const isGroup = group.length > 1;
              
              return (
                <Marker
                  key={`app-group-${index}`}
                  position={[item.address.latitude, item.address.longitude]}
                  icon={customIcon}
                >
                  <Popup>
                    {isGroup ? (
                      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        <strong>Знайдено {group.length} заявок:</strong>
                        <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
                          {group.map((groupItem, i) => (
                            <li 
                              key={i}
                              onClick={() => {
                                setSelectedClient(groupItem);
                                setIsSheetOpen(true);
                              }}
                              style={{ cursor: 'pointer', marginBottom: '5px', textDecoration: 'underline', color: 'blue' }}
                            >
                              {groupItem.client} ({groupItem.count})
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div 
                        onClick={() => {
                          setSelectedClient(item);
                          setIsSheetOpen(true);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <strong>{item.client}</strong><br />
                        {item.address.city}, {item.address.area}<br />
                        <strong>Количество заявок: {item.count}</strong><br />
                        <em style={{ fontSize: '0.85em', color: '#666' }}>Тицніть для деталей</em>
                      </div>
                    )}
                  </Popup>
                </Marker>
              );
            });
          })()}

          {areClientsVisible && (() => {
            const groupedClients = groupItemsByLocation(filteredClients.map(c => ({
              ...c,
              address: { latitude: c.latitude, longitude: c.longitude } // Normalize structure for helper
            })));

            return groupedClients.map((group, index) => {
              const client = group[0];
              const isGroup = group.length > 1;

              return (
                <Marker
                  key={`client-group-${index}`}
                  position={[client.latitude, client.longitude]}
                  icon={clientIcon}
                  eventHandlers={{
                    click: () => {
                      if (!isGroup) {
                        setSelectedClient(client);
                        setIsSheetOpen(true);
                      }
                    },
                  }}
                >
                  <Popup>
                    {isGroup ? (
                      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        <strong>Знайдено {group.length} контрагентів:</strong>
                        <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
                          {group.map((groupClient, i) => (
                            <li 
                              key={i}
                              onClick={() => {
                                setSelectedClient(groupClient);
                                setIsSheetOpen(true);
                              }}
                              style={{ cursor: 'pointer', marginBottom: '5px', textDecoration: 'underline', color: 'blue' }}
                            >
                              {groupClient.client}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div>
                        <strong>{client.client}</strong><br />
                        {`${client.region} обл., ${client.area} район, ${client.commune} громада, ${client.city}`} <br />
                        {`Менеджер: ${client.manager}`}<br />
                        {`Контактна особа: ${client.representative}`}<br />
                        {`Телефон: ${client.phone1}`}<br />
                      </div>
                    )}
                  </Popup>
                </Marker>
              );
            });
          })()}
          {areApplicationsVisible && showHeatmap && (
            <HeatmapLayer 
              points={filteredApplications.map(item => [
                parseFloat(item.address.latitude),
                parseFloat(item.address.longitude),
                item.totalQuantity || 1 // Интенсивность = общее количество товара
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
          <DrawControl />
        </MapContainer>
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
    </div>
  );
}
