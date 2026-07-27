"use client";

import React, { useMemo } from "react";
import styles from "./ExportPrintModal.module.css";
import { Download, Printer, X } from "lucide-react";
import { ApplicationItem, DeliveryItem } from "../../utils/filterUtils";
import {
  exportApplicationsToExcel,
  exportDeliveriesToExcel,
  printApplicationsReport,
  printDeliveriesReport,
  FilterSummaryInfo,
  parseWeight,
} from "../../utils/exportUtils";

export interface ExportPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataType: "applications" | "deliveries";
  applicationsData?: ApplicationItem[];
  deliveriesData?: DeliveryItem[];
  filtersInfo?: FilterSummaryInfo;
}

export default function ExportPrintModal({
  isOpen,
  onClose,
  dataType,
  applicationsData = [],
  deliveriesData = [],
  filtersInfo,
}: ExportPrintModalProps) {
  const isApps = dataType === "applications";

  const stats = useMemo(() => {
    let count = 0;
    let weight = 0;

    if (isApps) {
      count = applicationsData.length;
      applicationsData.forEach((app) => {
        const orders = Array.isArray(app.orders) && app.orders.length > 0 ? app.orders : [];
        if (orders.length > 0) {
          orders.forEach((o) => {
            weight += parseWeight(o.total_weight || o.totalWeight || o.weight || app.totalWeight || app.weight);
          });
        } else {
          weight += parseWeight(app.totalWeight || app.weight || app.total_weight);
        }
      });
    } else {
      count = deliveriesData.length;
      deliveriesData.forEach((d) => {
        const items = Array.isArray(d.items) ? d.items : [];
        if (items.length > 0) {
          items.forEach((it) => {
            weight += parseWeight(it.weight || it.total_weight || d.total_weight);
          });
        } else {
          weight += parseWeight(d.total_weight || d.weight);
        }
      });
    }

    return {
      count,
      weightKg: Math.round(weight),
      weightTons: (weight / 1000).toFixed(2),
    };
  }, [isApps, applicationsData, deliveriesData]);

  if (!isOpen) return null;

  const handleExportExcel = () => {
    if (isApps) {
      exportApplicationsToExcel(applicationsData, filtersInfo);
    } else {
      exportDeliveriesToExcel(deliveriesData, filtersInfo);
    }
    onClose();
  };

  const handlePrint = () => {
    if (isApps) {
      printApplicationsReport(applicationsData, filtersInfo);
    } else {
      printDeliveriesReport(deliveriesData, filtersInfo);
    }
    onClose();
  };

  const activeFilterTexts: string[] = [];
  if (filtersInfo?.managers && filtersInfo.managers.length > 0) {
    activeFilterTexts.push(`Менеджери: ${filtersInfo.managers.join(", ")}`);
  }
  if (filtersInfo?.lobs && filtersInfo.lobs.length > 0) {
    activeFilterTexts.push(`Вид діяльності: ${filtersInfo.lobs.join(", ")}`);
  }
  if (filtersInfo?.statuses && filtersInfo.statuses.length > 0) {
    activeFilterTexts.push(`Статуси: ${filtersInfo.statuses.join(", ")}`);
  }
  if (filtersInfo?.dates && filtersInfo.dates.length > 0) {
    activeFilterTexts.push(`Дати: ${filtersInfo.dates.join(", ")}`);
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            {isApps ? "📤 Експорт та друк заявок" : "📤 Експорт та друк доставок"}
          </h3>
          <button className={styles.closeBtn} onClick={onClose} title="Закрити">
            <X size={18} />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.filterCard}>
            <div className={styles.filterTitle}>Активні фільтри списку:</div>
            <div className={styles.filterText}>
              {activeFilterTexts.length > 0
                ? activeFilterTexts.join(" • ")
                : "Відображено всі елементи списку (без фільтрів)"}
            </div>
          </div>

          <div className={styles.summaryRow}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryLabel}>
                {isApps ? "Всього клієнтів" : "Всього доставок"}
              </div>
              <div className={styles.summaryValue}>{stats.count}</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryLabel}>Загальна вага</div>
              <div className={styles.summaryValue}>
                {stats.weightTons} т ({stats.weightKg} кг)
              </div>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={`${styles.btn} ${styles.cancelBtn}`} onClick={onClose}>
            Скасувати
          </button>
          <button
            className={`${styles.btn} ${styles.excelBtn}`}
            onClick={handleExportExcel}
            disabled={stats.count === 0}
          >
            <Download size={16} /> Excel (.xlsx)
          </button>
          <button
            className={`${styles.btn} ${styles.printBtn}`}
            onClick={handlePrint}
            disabled={stats.count === 0}
          >
            <Printer size={16} /> Друк
          </button>
        </div>
      </div>
    </div>
  );
}
