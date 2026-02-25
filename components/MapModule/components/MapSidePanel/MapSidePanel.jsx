"use client";

import { useApplicationsStore } from "../../store/applicationsStore";
import { useMapControlStore } from "../../store/mapControlStore";
import DeliveriesList from "../DeliveriesList/DeliveriesList";
import ApplicationsList from "../ApplicationsList/ApplicationsList";
import ClientsList from "../ClientsList/ClientsList";
import InputAddress from "../inputAddress/InputAddress";

/**
 * MapSidePanel — панель зі списками доставок / заявок / клієнтів або пошуком адреси.
 * Рендериться як окремий блок у MapDashboard.
 * Комунікація з картою — через Zustand stores.
 */
export default function MapSidePanel() {
  const {
    deliveries,
    clients,
    setSelectedDelivery,
    setSelectedClient,
  } = useApplicationsStore();

  const {
    areDeliveriesVisible,
    areApplicationsVisible,
    areClientsVisible,
    selectedStatuses,
    setFlyToCoords,
    setEditClientRequest,
  } = useMapControlStore();

  const handleFlyTo = (lat, lon) => setFlyToCoords([lat, lon]);


  const handleAddClient = (initialData = null) => {
    setEditClientRequest(initialData ? { ...initialData, id: null } : null);
  };

  if (areDeliveriesVisible) {
    return (
      <DeliveriesList
        deliveries={deliveries}
        onClose={() => {}}
        onFlyTo={handleFlyTo}
        onSelectDelivery={(delivery) => setSelectedDelivery(delivery)}
        selectedStatuses={selectedStatuses}
      />
    );
  }

  if (areApplicationsVisible) {
    return (
      <ApplicationsList
        onClose={() => {}}
        onFlyTo={handleFlyTo}
        onAddClient={handleAddClient}
      />
    );
  }

  if (areClientsVisible) {
    return (
      <ClientsList
        clients={clients || []}
        onClose={() => {}}
        onFlyTo={handleFlyTo}
        onClientSelect={(client) => setSelectedClient(client)}
        onAddClient={handleAddClient}
      />
    );
  }

  // Default: address search
  return (
    <InputAddress
      onAddressSelect={(data) => {
        if (data?.lat && data?.lon) {
          handleFlyTo(data.lat, data.lon);
        }
      }}
    />
  );
}
