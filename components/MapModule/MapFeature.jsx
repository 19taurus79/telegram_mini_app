"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import css from "./App.module.css";
import TopData from "./components/topData/topData";
import InputAddress from "./components/inputAddress/InputAddress";
import BottomData from "./components/bottomData/bottomData";
import { useDisplayAddressStore } from "./store/displayAddress";
import { useApplicationsStore } from "./store/applicationsStore";
import { fetchOrdersHeatmapData } from "./fetchOrdersWithAddresses";
import ChangeMapView from "./components/ChangeMapView/ChangeMapView";
import Header from "./components/Header/Header";
import { useState, useRef, useEffect } from "react";
import { customIcon } from "./leaflet-icon";
import HeatmapLayer from "./components/HeatmapLayer/HeatmapLayer";
import { useMapControlStore } from "./store/mapControlStore";
import ApplicationsList from "./components/ApplicationsList/ApplicationsList";
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

export default function MapFeature({ onAddressSelect }) {
  const { addressData } = useDisplayAddressStore();
  const { applications, setApplications, setSelectedClient } = useApplicationsStore();
  const [isDataTopVisible, setDataTopVisible] = useState(false);
  const [isAddressSearchVisible, setAddressSearchVisible] = useState(true);
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);
  const areApplicationsVisible = useMapControlStore((state) => state.areApplicationsVisible);
  const showHeatmap = useMapControlStore((state) => state.showHeatmap);
  const toggleHeatmap = useMapControlStore((state) => state.toggleHeatmap);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const mapRef = useRef(null);
  const [isMounted, setIsMounted] = useState(false);
  const [flyToCoords, setFlyToCoords] = useState(null); // Состояние для flyTo

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
        const { mergedData, heatmapPoints } = await fetchOrdersHeatmapData();
        console.log('Merged data:', mergedData);
        console.log('Heatmap points:', heatmapPoints);
        // Сохраняем объединенные данные в store
        setApplications(mergedData);
      }
    };
    getApplications();
  }, [areApplicationsVisible, applications.length, setApplications]);

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
        <MapContainer
          ref={mapRef}
          center={
            addressData.lat
              ? [addressData.lat, addressData.lon]
              : [49.973022, 35.984668]
          }
          zoom={13}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {areApplicationsVisible && !showHeatmap &&
            applications.map((item) => (
              <Marker
                key={item.client}
                position={[item.address.latitude, item.address.longitude]}
                icon={customIcon}
              >
                <Popup>
                  <div 
                    onClick={() => {
                      setSelectedClient(item);
                      setIsSheetOpen(true); // Открываем bottom sheet на мобилке
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <strong>{item.client}</strong><br />
                    {item.address.city}, {item.address.area}<br />
                    <strong>Количество заявок: {item.count}</strong><br />
                    <em style={{ fontSize: '0.85em', color: '#666' }}>Тицніть для деталей</em>
                  </div>
                </Popup>
              </Marker>
            ))}
          {areApplicationsVisible && showHeatmap && (
            <HeatmapLayer 
              points={applications.map(item => [
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
                <BottomData />
            </div>
        </div>
      </div>
    </div>
  );
}
