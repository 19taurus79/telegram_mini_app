"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getClients } from "@/lib/api";
import { Client } from "@/types/types";
import styles from "../OrdersDashboard.module.css";
import { Search } from "lucide-react";

interface ClientsWidgetProps {
  initData: string;
  selectedClient: Client | null;
  onSelectClient: (client: Client) => void;
}

export default function ClientsWidget({
  initData,
  selectedClient,
  onSelectClient,
}: ClientsWidgetProps) {
  const [searchValue, setSearchValue] = useState("");

  // Запит на отримання списку клієнтів
  // Використовує React Query для кешування та управління станом завантаження
  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients", searchValue], // Ключ запиту залежить від пошукового рядка
    queryFn: () => getClients({ searchValue, initData }),
    enabled: !!initData, // Запит активний тільки якщо є initData
  });

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative" }}>
        {/* Поле пошуку клієнтів */}
        <input
          type="text"
          placeholder="Пошук клієнта..."
          className={styles.searchInput}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
        <Search
          size={16}
          style={{
            position: "absolute",
            right: "12px",
            top: "10px",
            opacity: 0.5,
          }}
        />
      </div>

      <div className={styles.tableContainer}>
        {isLoading ? (
          <p style={{ padding: "10px", color: "var(--foreground)" }}>
            Завантаження...
          </p>
        ) : (
          <div className={styles.list}>
            {/* Відображення списку клієнтів */}
            {clients?.map((client) => (
              <div
                key={client.id}
                className={`${styles.listItem} ${
                  selectedClient?.id === client.id ? styles.listItemSelected : ""
                }`}
                onClick={() => onSelectClient(client)}
              >
                <span>{client.client}</span>
              </div>
            ))}
            {!clients?.length && (
              <p style={{ padding: "10px", opacity: 0.6 }}>Клієнтів не знайдено</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
