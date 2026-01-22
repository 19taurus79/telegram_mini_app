"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Responsive, WidthProvider, Layout, Layouts } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import styles from "./OrdersDashboard.module.css";
import ClientsWidget from "./components/ClientsWidget";
import ContractsWidget from "./components/ContractsWidget";
import DetailsWidget from "./components/DetailsWidget";
import { useQuery } from "@tanstack/react-query";
import { getContracts } from "@/lib/api";
import { Client, Contract } from "@/types/types";
import { Layers, RotateCcw } from "lucide-react";

const ResponsiveGridLayout = WidthProvider(Responsive);

const STORAGE_KEY = "orders-dashboard-layouts";
const STORAGE_STATE_KEY = "orders-dashboard-state";

const defaultLayouts: Layouts = {
  lg: [
    { i: "clients", x: 0, y: 0, w: 3, h: 12, minW: 2, minH: 6 },
    { i: "contracts", x: 3, y: 0, w: 3, h: 12, minW: 2, minH: 6 },
    { i: "details", x: 6, y: 0, w: 6, h: 12, minW: 4, minH: 6 },
  ],
  md: [
    { i: "clients", x: 0, y: 0, w: 3, h: 12, minW: 2, minH: 6 },
    { i: "contracts", x: 3, y: 0, w: 3, h: 12, minW: 2, minH: 6 },
    { i: "details", x: 6, y: 0, w: 4, h: 12, minW: 4, minH: 6 },
  ],
  sm: [
    { i: "clients", x: 0, y: 0, w: 6, h: 6, minW: 6, minH: 4 },
    { i: "contracts", x: 0, y: 6, w: 6, h: 6, minW: 6, minH: 4 },
    { i: "details", x: 0, y: 12, w: 6, h: 8, minW: 6, minH: 4 },
  ],
};

export default function OrdersDashboard() {
  const [layouts, setLayouts] = useState<Layouts>(defaultLayouts);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedContracts, setSelectedContracts] = useState<Contract[]>([]);
  const [showAllContracts, setShowAllContracts] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Запит на отримання контрактів обраного клієнта (підняли стан сюди)
  const { data: contracts } = useQuery({
    queryKey: ["contracts", selectedClient?.id],
    queryFn: () =>
      selectedClient
        ? getContracts(selectedClient.id)
        : Promise.resolve([]),
    enabled: !!selectedClient,
  });

  // Завантаження збереженого макету та стану з localStorage
  useEffect(() => {
    setIsClient(true);
    const savedLayouts = localStorage.getItem(STORAGE_KEY);
    if (savedLayouts) {
      try {
        const parsed = JSON.parse(savedLayouts);
        setLayouts(parsed);
      } catch (e) {
        console.error("Failed to parse saved layouts:", e);
      }
    }

    const savedState = localStorage.getItem(STORAGE_STATE_KEY);
    if (savedState) {
        try {
            const parsedState = JSON.parse(savedState);
            if (parsedState.selectedClient) setSelectedClient(parsedState.selectedClient);
            if (parsedState.selectedContracts) setSelectedContracts(parsedState.selectedContracts);
            if (parsedState.showAllContracts) setShowAllContracts(parsedState.showAllContracts);
        } catch (e) {
             console.error("Failed to parse saved state:", e);
        }
    }
  }, []);

  // Збереження стану при зміні
  useEffect(() => {
    if (isClient) { // Зберігаємо тільки якщо ми вже на клієнті (після гідратації)
        const stateToSave = {
            selectedClient,
            selectedContracts,
            showAllContracts
        };
        localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(stateToSave));
    }
  }, [selectedClient, selectedContracts, showAllContracts, isClient]);

  // Збереження макету при його зміні
  const handleLayoutChange = useCallback(
    (currentLayout: Layout[], allLayouts: Layouts) => {
      setLayouts(allLayouts);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allLayouts));
    },
    []
  );

  const handleResetLayout = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setSelectedContracts([]); // Скидаємо обрані контракти при зміні клієнта
    setShowAllContracts(false);
  };

  const handleSelectContract = (contract: Contract) => {
      setSelectedContracts((prev) => {
          const isSelected = prev.some(c => c.contract_supplement === contract.contract_supplement);
          if (isSelected) {
              return prev.filter(c => c.contract_supplement !== contract.contract_supplement);
          } else {
              return [...prev, contract];
          }
      });
    setShowAllContracts(false); // Вимикаємо прапорець "Всі", бо це ручний вибір. Хоча логіка може бути іншою.
  };

  const toggleShowAll = () => {
    setShowAllContracts((prev) => !prev);
    if (!showAllContracts) {
      // Якщо вмикаємо "Всі", то виділяємо всі доступні контракти
      if (contracts) {
          setSelectedContracts(contracts);
      }
    } else {
        // Якщо вимикаємо "Всі", скидаємо виділення? Або залишаємо як є?
        // Зазвичай "Select All" -> "Deselect All".
        setSelectedContracts([]);
    }
  };

  if (!isClient) return null;

  // Simple mobile check (render stack if screen width < 768 or based on breakpoint)
  // For now using grid layout's responsive capabilities, but if purely mobile device, maybe stack.
  // We'll stick to ResponsiveGridLayout which handles SM breakpoint.

  return (
    <div className={styles.dashboardContainer}>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px" }}>
        <button
          onClick={handleResetLayout}
          className={styles.toggleButton}
          title="Скинути макет"
        >
            <RotateCcw size={14} /> Скинути макет
        </button>
      </div>
      
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
        margin={[16, 16]}
      >
        <div key="clients">
          <div className={styles.gridItem}>
            <div className={styles.gridItemHeader}>
              <div className={styles.headerLeft}>
                <span className={styles.dragHandle}>⋮⋮</span>
                <span className={styles.gridItemTitle}>Клієнти</span>
              </div>
            </div>
            <div className={styles.gridItemContent}>
              <ClientsWidget
                selectedClient={selectedClient}
                onSelectClient={handleSelectClient}
              />
            </div>
          </div>
        </div>

        <div key="contracts">
          <div className={styles.gridItem}>
            <div className={styles.gridItemHeader}>
              <div className={styles.headerLeft}>
                <span className={styles.dragHandle}>⋮⋮</span>
                <span className={styles.gridItemTitle}>Контракти</span>
              </div>
              <div>
                <button
                  className={`${styles.toggleButton} ${
                    showAllContracts ? styles.toggleButtonActive : ""
                  }`}
                  onClick={toggleShowAll}
                  title="Показати товари по всім контрактам"
                >
                  <Layers size={14} /> Всі
                </button>
              </div>
            </div>
            <div className={styles.gridItemContent}>
              <ContractsWidget
                selectedClient={selectedClient}
                contracts={contracts || []}
                selectedContracts={selectedContracts}
                onSelectContract={handleSelectContract}
              />
            </div>
          </div>
        </div>

        <div key="details">
          <div className={styles.gridItem}>
            <div className={styles.gridItemHeader}>
              <div className={styles.headerLeft}>
                <span className={styles.dragHandle}>⋮⋮</span>
                <span className={styles.gridItemTitle}>
                  Деталі замовлення 
                  {selectedContracts.length > 0 && !showAllContracts ? ` (${selectedContracts.length})` : ""}
                  {showAllContracts ? " (Всі контракти)" : ""}
                </span>
              </div>
            </div>
            <div className={styles.gridItemContent}>
              <DetailsWidget
                selectedClient={selectedClient}
                selectedContracts={selectedContracts}
                showAllContracts={showAllContracts}
              />
            </div>
          </div>
        </div>
      </ResponsiveGridLayout>
    </div>
  );
}
