"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Warehouse, Package, MapPin } from "lucide-react";
import type { AvRemains } from "@/types/types";
import css from "./AvRemainsList.module.css";

type Props = {
  remains: AvRemains[];
};

export default function AvRemainsListClient({ remains }: Props) {
  const [expandedDivs, setExpandedDivs] = useState<Record<string, boolean>>({});
  const [selectedDivId, setSelectedDivId] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Auto-select first item with warehouses on desktop
  useEffect(() => {
    if (isDesktop && !selectedDivId) {
      const first = remains.find((r) => r.warehouses && r.warehouses.length > 0);
      if (first) setSelectedDivId(first.id);
    }
  }, [isDesktop, selectedDivId, remains]);

  const toggleExpand = (id: string) => {
    setExpandedDivs((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleRowClick = (item: AvRemains) => {
    const hasWarehouses = item.warehouses && item.warehouses.length > 0;
    if (!hasWarehouses) return;

    if (isDesktop) {
      setSelectedDivId(item.id);
    } else {
      toggleExpand(item.id);
    }
  };

  const selectedItem = remains.find((r) => r.id === selectedDivId);
  const totalSelectedQty = selectedItem?.warehouses?.reduce((sum, w) => sum + w.available, 0) ?? 0;

  // ========== DESKTOP LAYOUT ==========
  if (isDesktop) {
    return (
      <div className={css.masterDetail}>
        {/* Master Panel — список подразделений */}
        <div className={css.masterPanel}>
          <div className={css.panelHeader}>
            <MapPin size={16} className={css.panelIcon} />
            <span>Підрозділи</span>
          </div>
          <ul className={css.masterList}>
            {remains.map((item) => {
              const hasWarehouses = item.warehouses && item.warehouses.length > 0;
              const isSelected = selectedDivId === item.id;
              return (
                <li
                  key={item.id}
                  className={`${css.masterItem} ${isSelected ? css.masterItemActive : ""} ${hasWarehouses ? css.masterItemClickable : ""}`}
                  onClick={() => handleRowClick(item)}
                >
                  <span className={css.masterItemName}>{item.division}</span>
                  <span className={css.masterItemQty}>{item.available}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Detail Panel — склады выбранного подразделения */}
        <div className={css.detailPanel}>
          {selectedItem && selectedItem.warehouses && selectedItem.warehouses.length > 0 ? (
            <>
              <div className={css.detailHeader}>
                <div className={css.detailHeaderTop}>
                  <Warehouse size={18} className={css.panelIcon} />
                  <span className={css.detailTitle}>{selectedItem.division}</span>
                </div>
                <div className={css.detailSummary}>
                  <span className={css.detailSummaryLabel}>Разом вільно:</span>
                  <span className={css.detailSummaryValue}>{totalSelectedQty}</span>
                </div>
              </div>
              <ul className={css.detailList}>
                {selectedItem.warehouses.map((wh, idx) => (
                  <li key={idx} className={css.detailItem}>
                    <div className={css.detailItemIcon}>
                      <Package size={14} />
                    </div>
                    <span className={css.detailItemName}>{wh.warehouse}</span>
                    <span className={css.detailItemQty}>{wh.available}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className={css.detailEmpty}>
              <Warehouse size={40} strokeWidth={1} className={css.detailEmptyIcon} />
              <p className={css.detailEmptyText}>
                {selectedItem ? "Немає деталізації по складах" : "Оберіть підрозділ зі списку"}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ========== MOBILE LAYOUT (аккордеон) ==========
  return (
    <ul className={css.table}>
      {remains.map((item) => {
        const isExpanded = !!expandedDivs[item.id];
        const hasWarehouses = item.warehouses && item.warehouses.length > 0;

        return (
          <li key={item.id} className={css.rowContainer}>
            <div
              className={`${css.row} ${hasWarehouses ? css.clickableRow : ""}`}
              onClick={() => handleRowClick(item)}
            >
              <div className={css.divisionWrapper}>
                {hasWarehouses && (
                  <span className={css.chevronIcon}>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </span>
                )}
                <span className={css.cell_division}>{item.division}</span>
              </div>
              <span className={css.cell_available}>{item.available}</span>
            </div>

            {isExpanded && hasWarehouses && (
              <div className={css.warehouseDetails}>
                <ul className={css.warehouseList}>
                  {item.warehouses!.map((wh, idx) => (
                    <li key={idx} className={css.warehouseItem}>
                      <span className={css.warehouseName}>{wh.warehouse}</span>
                      <span className={css.warehouseQty}>{wh.available}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
