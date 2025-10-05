"use client";

import { useState, useEffect } from "react";
import { dataForOrderByProduct } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import styles from "./BiPage.module.css";

// --- TYPES ---
interface CombinedItem {
  product: string;
  qty_needed: number;
  qty_remain: number;
  qty_missing: number;
  available_stock: {
    division: string;
    available: number;
  }[];
}

interface CombinedResponse {
  missing_but_available: CombinedItem[];
  missing_and_unavailable: CombinedItem[];
}

interface Recommendation {
  product: string;
  take_from_division: string;
  qty_to_take: number;
}

// --- PRIORITY WAREHOUSES ---
const priorityWarehouses = [
  "Центральний офіс",
  "Київський підрозділ",
  "Полтавський підрозділ",
  "Лубенський підрозділ",
  "Дніпровський підрозділ",
  "Запорізький підрозділ",
];

// --- REUSABLE COMPONENTS ---
const ProductTable = ({
  title,
  data,
  onRowClick,
  selectedProduct,
}: {
  title: string;
  data: CombinedItem[];
  onRowClick?: (product: CombinedItem) => void;
  selectedProduct?: CombinedItem | null;
}) => (
  <div className={styles.tableWrapper}>
    <h2 className={styles.title}>{title}</h2>
    {data && data.length > 0 ? (
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={`${styles.th} ${styles.productColumn}`}>Product</th>
            <th className={`${styles.th} ${styles.qtyColumn}`}>Remain</th>
            <th className={`${styles.th} ${styles.qtyColumn}`}>Needed</th>
            <th className={`${styles.th} ${styles.qtyColumn}`}>Missing</th>
          </tr>
        </thead>
        <tbody>
          {data.map((order) => (
            <tr
              key={order.product}
              onClick={() => onRowClick?.(order)}
              className={onRowClick ? (selectedProduct?.product === order.product ? styles.selectedRow : styles.row) : ""}
            >
              <td className={`${styles.td} ${styles.productColumn}`}>{order.product}</td>
              <td className={`${styles.td} ${styles.qtyColumn}`}>{order.qty_remain}</td>
              <td className={`${styles.td} ${styles.qtyColumn}`}>{order.qty_needed}</td>
              <td className={`${styles.td} ${styles.qtyColumn}`}>{order.qty_missing}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <p>Нет данных</p>
    )}
  </div>
);

// --- MAIN PAGE COMPONENT ---
export default function BiPage() {
  const [selectedProduct, setSelectedProduct] = useState<CombinedItem | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const { data, isLoading, error } = useQuery<CombinedResponse>({ // Expects the object with two lists
    queryKey: ["biOrders"],
    queryFn: dataForOrderByProduct,
  });

  useEffect(() => {
    if (data?.missing_but_available) {
      const newRecommendations: Recommendation[] = [];

      for (const product of data.missing_but_available) {
        let needed = product.qty_missing;
        if (needed <= 0) continue; // Skip if no need

        const stockByDivision = new Map(product.available_stock.map(s => [s.division, s.available]));
        const prioritySet = new Set(priorityWarehouses);

        // 1. Iterate through priority warehouses
        for (const warehouse of priorityWarehouses) {
          if (needed <= 0) break;
          const available = stockByDivision.get(warehouse);
          if (available && available > 0) {
            const canTake = Math.min(needed, available);
            newRecommendations.push({
              product: product.product,
              take_from_division: warehouse,
              qty_to_take: canTake,
            });
            needed -= canTake;
          }
        }

        // 2. If still needed, iterate through remaining warehouses alphabetically
        if (needed > 0) {
          const remainingStock = product.available_stock
            .filter(s => !prioritySet.has(s.division)) // Filter out priority warehouses
            .sort((a, b) => a.division.localeCompare(b.division)); // Sort alphabetically

          for (const stock of remainingStock) {
            if (needed <= 0) break;
            if (stock.available > 0) {
              const canTake = Math.min(needed, stock.available);
              newRecommendations.push({
                product: product.product,
                take_from_division: stock.division,
                qty_to_take: canTake,
              });
              needed -= canTake;
            }
          }
        }
      }
      setRecommendations(newRecommendations);
    }
  }, [data]);

  return (
    <div className={styles.pageContainer}>
      <h1>BI Data</h1>
      {isLoading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      {data && (
        <>
          <div className={styles.topContainer}>
            <div className={styles.mainTableContainer}>
              <ProductTable
                title="Нехватка (есть на складах)"
                data={data.missing_but_available}
                onRowClick={setSelectedProduct}
                selectedProduct={selectedProduct}
              />
            </div>
            <div className={styles.detailsContainer}>
              <h2 className={styles.title}>Детали по складам</h2>
              {selectedProduct ? (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={`${styles.th} ${styles.divisionColumn}`}>Division</th>
                      <th className={`${styles.th} ${styles.availableColumn}`}>Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProduct.available_stock?.map((stock) => (
                      <tr key={stock.division}>
                        <td className={`${styles.td} ${styles.divisionColumn}`}>{stock.division}</td>
                        <td className={`${styles.td} ${styles.availableColumn}`}>{stock.available}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className={styles.placeholder}>
                  <p>Выберите продукт для просмотра деталей</p>
                </div>
              )}
            </div>
          </div>

          <div className={styles.bottomContainer}>
            <ProductTable
              title="Нехватка (нет на складах)"
              data={data.missing_and_unavailable}
            />
          </div>

          {/* Recommendations Table */}
          <div className={styles.bottomContainer}>
             <div className={styles.tableWrapper}>
                <h2 className={styles.title}>Рекомендации</h2>
                {recommendations.length > 0 ? (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.th}>Продукт</th>
                        <th className={styles.th}>Взять со склада</th>
                        <th className={styles.th}>Количество</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recommendations.map((rec, index) => (
                        <tr key={`${rec.product}-${rec.take_from_division}-${index}`}>
                          <td className={styles.td}>{rec.product}</td>
                          <td className={styles.td}>{rec.take_from_division}</td>
                          <td className={styles.td}>{rec.qty_to_take}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>Нет рекомендаций для формирования.</p>
                )}
              </div>
          </div>
        </>
      )}
    </div>
  );
}
