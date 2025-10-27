"use client";

import { useState, useMemo } from "react";
import { dataForOrderByProduct } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import styles from "./BiPage.module.css";
import { BiOrders, BiOrdersItem } from "@/types/types";
import ProductTable from "@/components/Bi/ProductTable/ProductTable";
import StockDetails from "@/components/Bi/StockDetails/StockDetails";
import RecommendationsTable from "@/components/Bi/RecommendationsTable/RecommendationsTable";

interface Recommendation {
  product: string;
  take_from_division: string;
  take_from_warehouse: string;
  qty_to_take: number;
}

// --- PRIORITY DIVISIONS ---
const priorityDivisions = [
  "Центральний офіс",
  "Київський підрозділ",
  "Полтавський підрозділ",
  "Лубенський підрозділ",
  "Дніпровський підрозділ",
  "Запорізький підрозділ",
];

// --- MAIN PAGE COMPONENT ---
export default function BiPage() {
  const [selectedProduct, setSelectedProduct] = useState<BiOrdersItem | null>(
    null
  );

  const { data, isLoading, error } = useQuery<BiOrders, Error>({
    queryKey: ["biOrders"],
    queryFn: dataForOrderByProduct,
  });

  const recommendations = useMemo(() => {
    const newRecommendations: Recommendation[] = [];
    if (!data?.missing_but_available) {
      return newRecommendations;
    }

    for (const product of data.missing_but_available) {
      let needed = product.qty_missing;
      if (needed <= 0) continue;

      const prioritySet = new Set(priorityDivisions);
      const priorityStock: typeof product.available_stock = [];
      const otherStock: typeof product.available_stock = [];

      for (const stock of product.available_stock) {
        if (prioritySet.has(stock.division)) {
          priorityStock.push(stock);
        } else {
          otherStock.push(stock);
        }
      }

      priorityStock.sort(
        (a, b) =>
          priorityDivisions.indexOf(a.division) -
          priorityDivisions.indexOf(b.division)
      );

      // 1. Iterate through priority stock
      for (const stock of priorityStock) {
        if (needed <= 0) break;
        if (stock.available > 0) {
          const canTake = Math.min(needed, stock.available);
          newRecommendations.push({
            product: product.product,
            take_from_division: stock.division,
            take_from_warehouse: stock.warehouse,
            qty_to_take: canTake,
          });
          needed -= canTake;
        }
      }

      // 2. If still needed, iterate through remaining warehouses alphabetically
      if (needed > 0) {
        otherStock.sort((a, b) => {
          if (a.division !== b.division) {
            return a.division.localeCompare(b.division);
          }
          return a.warehouse.localeCompare(b.warehouse);
        });

        for (const stock of otherStock) {
          if (needed <= 0) break;
          if (stock.available > 0) {
            const canTake = Math.min(needed, stock.available);
            newRecommendations.push({
              product: product.product,
              take_from_division: stock.division,
              take_from_warehouse: stock.warehouse,
              qty_to_take: canTake,
            });
            needed -= canTake;
          }
        }
      }
    }
    return newRecommendations;
  }, [data]);

  if (isLoading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>Error: {error.message}</p>;
  }

  return (
    <div className={styles.pageContainer}>
      <h1>BI Data</h1>
      {data && (
        <>
          <div className={styles.topContainer}>
            <div className={styles.mainTableContainer}>
              <ProductTable
                title="Потрібно замовити (є на складах)"
                data={data.missing_but_available}
                onRowClick={setSelectedProduct}
                selectedProduct={selectedProduct}
              />
            </div>
            <StockDetails selectedProduct={selectedProduct} />
          </div>

          <div className={styles.bottomContainer}>
            <ProductTable
              title="Не вистачає під заявки (немає на складах)"
              data={data.missing_and_unavailable}
            />
          </div>

          <div className={styles.bottomContainer}>
            <RecommendationsTable recommendations={recommendations} />
          </div>
        </>
      )}
    </div>
  );
}
