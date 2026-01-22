"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getClients } from "@/lib/api";
import { Client } from "@/types/types";
import styles from "../OrdersDashboard.module.css";
import { Search } from "lucide-react";

interface ClientsWidgetProps {
  selectedClient: Client | null;
  onSelectClient: (client: Client) => void;
}

export default function ClientsWidget({
  selectedClient,
  onSelectClient,
}: ClientsWidgetProps) {
  const [searchValue, setSearchValue] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const STORAGE_SCROLL_KEY = "clients-widget-scroll-top";

  // Запит на отримання списку клієнтів
  // Використовує React Query для кешування та управління станом завантаження
  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients", searchValue],
    queryFn: () => getClients(searchValue),
  });

  // Відновлення позиції скролу
  useEffect(() => {
    if (clients && listRef.current) {
        requestAnimationFrame(() => {
            setTimeout(() => {
                const savedScroll = localStorage.getItem(STORAGE_SCROLL_KEY);
                if (savedScroll && listRef.current) {
                    listRef.current.scrollTop = parseInt(savedScroll, 10);
                }
            }, 100);
        });
    }
  }, [clients]);

  const handleScroll = () => {
      if (listRef.current) {
          localStorage.setItem(STORAGE_SCROLL_KEY, listRef.current.scrollTop.toString());
      }
  };

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

      <div 
        className={styles.tableContainer}
        ref={listRef}
        onScroll={handleScroll}
      >
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
