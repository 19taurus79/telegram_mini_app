"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Responsive, WidthProvider, Layout, Layouts } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import styles from "./MapDashboard.module.css";
import dynamic from "next/dynamic";
import MapSidePanel from "../components/MapSidePanel/MapSidePanel";
import BottomData from "../components/bottomData/bottomData";
import Loader from "@/components/Loader/Loader";
import EditClientModal from "../components/EditClientModal/EditClientModal";
import EditDeliveryModal from "../components/EditDeliveryModal/EditDeliveryModal";
import { useMapControlStore } from "../store/mapControlStore";
import { useApplicationsStore } from "../store/applicationsStore";
import { useDisplayAddressStore } from "../store/displayAddress";
import { ClientAddress, GeocodedAddress } from "@/types/types";

const ResponsiveGridLayout = WidthProvider(Responsive);

const STORAGE_KEY = "map-dashboard-layouts";

const defaultLayouts: Layouts = {
  lg: [
    { i: "top",    x: 0, y: 0,  w: 12, h: 4,  minW: 4, minH: 2 },
    { i: "map",    x: 0, y: 4,  w: 8,  h: 20, minW: 4, minH: 8 },
    { i: "bottom", x: 8, y: 4,  w: 4,  h: 20, minW: 3, minH: 6 },
  ],
  md: [
    { i: "top",    x: 0, y: 0,  w: 10, h: 4,  minW: 4, minH: 2 },
    { i: "map",    x: 0, y: 4,  w: 6,  h: 18, minW: 4, minH: 8 },
    { i: "bottom", x: 6, y: 4,  w: 4,  h: 18, minW: 3, minH: 6 },
  ],
  sm: [
    { i: "top",    x: 0, y: 0,  w: 6,  h: 4,  minW: 6, minH: 2 },
    { i: "map",    x: 0, y: 4,  w: 6,  h: 16, minW: 6, minH: 8 },
    { i: "bottom", x: 0, y: 20, w: 6,  h: 12, minW: 6, minH: 6 },
  ],
};

// Динамический импорт MapFeature (ssr: false — требование Leaflet)
const MapFeature = dynamic(() => import("../MapFeature"), {
  ssr: false,
  loading: () => <Loader />,
});

export default function MapDashboard() {
  const [layouts, setLayouts] = useState<Layouts>(defaultLayouts);
  const [isClient, setIsClient] = useState(false);

  // Глобальное состояние для управления модальным окном клиента
  const setClients = useApplicationsStore(state => state.setClients);
  const selectedClient = useApplicationsStore(state => state.selectedClient);
  const setSelectedClient = useApplicationsStore(state => state.setSelectedClient);
  const setAddressData = useDisplayAddressStore(state => state.setAddressData);
  const editClientRequest = useMapControlStore(state => state.editClientRequest);
  const setEditClientRequest = useMapControlStore(state => state.setEditClientRequest);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientAddress | null>(null);

  // Обробляємо запит на відкриття EditClientModal (від MapSidePanel через Zustand)
  useEffect(() => {
    if (editClientRequest !== null) {
      setEditingClient(editClientRequest?.id === undefined ? null : editClientRequest);
      setIsEditModalOpen(true);
      setEditClientRequest(null); // скидаємо запит
    }
  }, [editClientRequest, setEditClientRequest]);

  /**
   * Сохраняет данные клиента (нового или отредактированного).
   */
  const handleSaveClient = (clientData: ClientAddress) => {
    if (editingClient) {
        // Обновление существующего клиента
        const updatedClient = { ...editingClient, ...clientData };
        setClients((prev: ClientAddress[]) => prev.map(c => c.client === editingClient.client ? updatedClient : c));
        if (selectedClient?.client === editingClient.client) {
          setSelectedClient(updatedClient);
        }
    } else {
        // Добавление нового клиента
        setClients((prev: ClientAddress[]) => [...prev, clientData]);
    }
    setAddressData({} as GeocodedAddress); // Сброс адреса из поиска
  };

  // Загружаем layout из localStorage после монтирования
  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setLayouts(JSON.parse(saved));
      } catch {
        /* ignore */
      }
    }
  }, []);

  const handleLayoutChange = useCallback(
    (_: Layout[], allLayouts: Layouts) => {
      setLayouts(allLayouts);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allLayouts));
    },
    []
  );



  if (!isClient) return null;

  return (
    <div className={styles.dashboardContainer}>


      <ResponsiveGridLayout
        className={styles.gridLayout}
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 10, sm: 6 }}
        rowHeight={30}
        onLayoutChange={handleLayoutChange}
        draggableHandle={`.${styles.dragHandle}`}
        isResizable={true}
        isDraggable={true}
        margin={[8, 8]}
      >
        <div key="top">
          <div className={styles.gridItem}>
            <div className={styles.gridItemHeader}>
              <span className={styles.dragHandle}>⋮⋮</span>
              <h3 className={styles.gridItemTitle}>Список / Пошук</h3>
            </div>
            <div className={styles.gridItemContent}>
              <MapSidePanel />
            </div>
          </div>
        </div>

        {/* ─── Карта ─── */}
        <div key="map">
          <div className={styles.gridItem}>
            <div className={styles.gridItemHeader}>
              <span className={styles.dragHandle}>⋮⋮</span>
              <h3 className={styles.gridItemTitle}>Карта</h3>
            </div>
            <div className={styles.mapContent}>
              <MapFeature onAddressSelect={() => {}} />

            </div>
          </div>
        </div>

        {/* ─── Нижній блок ─── */}
        <div key="bottom">
          <div className={styles.gridItem}>
            <div className={styles.gridItemHeader}>
              <span className={styles.dragHandle}>⋮⋮</span>
              <h3 className={styles.gridItemTitle}>Деталі</h3>
            </div>
            <div className={styles.gridItemContent}>
              <BottomData onEditClient={() => {}} />
            </div>
          </div>
        </div>
      </ResponsiveGridLayout>

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
