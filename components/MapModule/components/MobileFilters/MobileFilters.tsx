"use client";

import React from "react";
import { useMapControlStore } from "../../store/mapControlStore";
import ManagerFilter from "../ManagerFilter/ManagerFilter";
import StatusFilter from "../StatusFilter/StatusFilter";
import LineOfBusinessFilter from "../LineOfBusinessFilter/LineOfBusinessFilter";

import MapControls from "../MapControls/MapControls";

export default function MobileFilters() {
  const {
    areDeliveriesVisible,
    areApplicationsVisible,
    areClientsVisible,
    toggleDeliveries,
    toggleApplications,
    toggleClients,
    isRoutingMode,
    toggleRoutingMode
  } = useMapControlStore();

  return (
    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Управління слоями карти */}
      <div>
        <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "var(--foreground)" }}>Слої карти</div>
        <MapControls 
          areApplicationsVisible={areApplicationsVisible}
          toggleApplications={toggleApplications}
          areClientsVisible={areClientsVisible}
          toggleClients={toggleClients}
          areDeliveriesVisible={areDeliveriesVisible}
          toggleDeliveries={toggleDeliveries}
          isRoutingMode={isRoutingMode}
          toggleRoutingMode={toggleRoutingMode}
          isMobilePanel={true}
        />
      </div>

      {/* Менеджери завжди актуальні для більшості слоїв */}
      <div>
        <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "var(--foreground)" }}>Менеджер</div>
        <ManagerFilter />
      </div>

      {areDeliveriesVisible && (
        <div>
          <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "var(--foreground)" }}>Статус доставки</div>
          <StatusFilter />
        </div>
      )}

      {areApplicationsVisible && (
        <div>
          <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "var(--foreground)" }}>Вид діяльності</div>
          <LineOfBusinessFilter />
        </div>
      )}
      
      {!areDeliveriesVisible && !areApplicationsVisible && !areClientsVisible && (
        <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>
          Оберіть слой карти (доставки, контрагенти або заявки), щоб побачити відповідні фільтри.
        </div>
      )}
    </div>
  );
}
