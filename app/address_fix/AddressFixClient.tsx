"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import css from "./AddressFix.module.css";
import { fetchOrdersHeatmapData } from "@/components/MapModule/fetchOrdersWithAddresses";
import { useApplicationsStore } from "@/components/MapModule/store/applicationsStore";
import { filterApplicationsList } from "@/components/MapModule/utils/filterUtils";
import dynamic from "next/dynamic";
import ManagerFilter from "@/components/MapModule/components/ManagerFilter/ManagerFilter";
import { MapPin, AlertTriangle, CheckCircle2 } from "lucide-react";

const EditClientModal = dynamic(
  () => import("@/components/MapModule/components/EditClientModal/EditClientModal"),
  { ssr: false }
);

export default function AddressFixClient() {
  const { selectedManagers, selectedLoBs } = useApplicationsStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientForEdit, setSelectedClientForEdit] = useState<{
    client: string;
    manager: string;
  } | null>(null);

  // Загрузка заявок и сопоставленных адресов
  const { data: applicationsData, isLoading, refetch } = useQuery({
    queryKey: ["ordersAndAddresses"],
    queryFn: async () => {
      return await fetchOrdersHeatmapData();
    },
    staleTime: 60 * 1000,
  });

  // Несопоставленные заявки (без адреса в справочнике)
  const unmappedApps = useMemo(() => {
    return applicationsData?.unmappedData || [];
  }, [applicationsData]);

  // Фильтрация по менеджерам, видам деятельности и поисковой строке
  const filteredUnmapped = useMemo(() => {
    let result = filterApplicationsList(unmappedApps, selectedManagers, selectedLoBs);

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter(item => {
        const clientName = (item.client || "").toLowerCase();
        const managerName = (item.orders?.[0]?.manager || "").toLowerCase();
        return clientName.includes(query) || managerName.includes(query);
      });
    }

    return result.sort((a, b) => a.client.localeCompare(b.client, "uk"));
  }, [unmappedApps, selectedManagers, selectedLoBs, searchQuery]);

  const handleOpenEditModal = (clientName: string, managerName: string) => {
    setSelectedClientForEdit({
      client: clientName,
      manager: managerName,
    });
  };

  const handleCloseModal = () => {
    setSelectedClientForEdit(null);
  };

  const handleSaveModal = () => {
    refetch();
  };

  return (
    <div className={css.container}>
      <div className={css.headerSection}>
        <div className={css.headerTitle}>
          <h1>
            <MapPin size={26} color="#e53e3e" />
            Уточнення адрес контрагентів
          </h1>
          <span className={css.countBadge}>
            Потрібно уточнити: {filteredUnmapped.length}
          </span>
        </div>
        <p className={css.subtitle}>
          Нижче наведено список контрагентів із заявок, для яких в довіднику відсутні дані про адресу вигрузки. 
          Натисніть <strong>«Внести адресу»</strong>, щоб зберегти адресу в довідник контрагента по замовчуванню.
        </p>

        <div className={css.controls}>
          <ManagerFilter />
          <div style={{ position: "relative", flex: 1, minWidth: "240px" }}>
            <input
              type="text"
              className={css.searchInput}
              placeholder="Пошук контрагента або менеджера..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className={css.emptyState}>
          <div className={css.emptyIcon}>⌛</div>
          <div className={css.emptyTitle}>Завантаження даних...</div>
        </div>
      ) : filteredUnmapped.length === 0 ? (
        <div className={css.emptyState}>
          <CheckCircle2 size={48} color="#0ef18e" />
          <div className={css.emptyTitle}>Усі адреси уточнені!</div>
          <div className={css.emptyDesc}>
            Для всіх відфільтрованих контрагентів в довіднику вже вказано адреси вигрузки.
          </div>
        </div>
      ) : (
        <div className={css.listGrid}>
          {filteredUnmapped.map((item) => {
            const managerName = item.orders?.[0]?.manager || "Не вказано";
            return (
              <div key={item.client} className={css.card}>
                <div className={css.clientName}>{item.client}</div>
                <div className={css.managerInfo}>
                  Менеджер: <strong>{managerName}</strong>
                </div>
                <div className={css.statusText}>
                  <AlertTriangle size={15} color="#e53e3e" />
                  Адреса відсутня в довіднику
                </div>

                <div className={css.cardFooter}>
                  <span className={css.ordersCount}>
                    Заявок: <strong>{item.count}</strong>
                  </span>
                  <button
                    className={css.addBtn}
                    onClick={() => handleOpenEditModal(item.client, managerName)}
                  >
                    📍 Внести адресу
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedClientForEdit && (
        <EditClientModal
          isOpen={Boolean(selectedClientForEdit)}
          onClose={handleCloseModal}
          onSave={handleSaveModal}
          client={selectedClientForEdit}
        />
      )}
    </div>
  );
}
