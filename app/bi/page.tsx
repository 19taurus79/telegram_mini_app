"use client";

import { useState } from "react";
import { dataForOrderByProduct } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import styles from "./BiPage.module.css";

// Типизация для одного элемента в списке
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

// Типизация для всего ответа API
interface CombinedResponse {
  missing_but_available: CombinedItem[];
  missing_and_unavailable: CombinedItem[];
}

// Переиспользуемый компонент для таблиц
const ProductTable = ({
  title,
  data,
  onRowClick,
  selectedProduct,
}: {
  title: string;
  data: CombinedItem[];
  onRowClick?: (product: CombinedItem) => void; // Сделали опциональным
  selectedProduct?: CombinedItem | null; // Сделали опциональным
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
              // Добавляем обработчик и классы только если onRowClick передан
              onClick={() => onRowClick?.(order)}
              className={
                onRowClick
                  ? selectedProduct?.product === order.product
                    ? styles.selectedRow
                    : styles.row
                  : ""
              }
            >
              <td className={`${styles.td} ${styles.productColumn}`}>
                {order.product}
              </td>
              <td className={`${styles.td} ${styles.qtyColumn}`}>
                {order.qty_remain}
              </td>
              <td className={`${styles.td} ${styles.qtyColumn}`}>
                {order.qty_needed}
              </td>
              <td className={`${styles.td} ${styles.qtyColumn}`}>
                {order.qty_missing}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <p>Нет данных</p>
    )}
  </div>
);

export default function BiPage() {
  const [selectedProduct, setSelectedProduct] = useState<CombinedItem | null>(null);

  // Теперь useQuery ожидает ОДИН объект CombinedResponse
  const { data, isLoading, error } = useQuery<CombinedResponse>({
    queryKey: ["biOrders"],
    queryFn: dataForOrderByProduct,
  });

  return (
    <div className={styles.pageContainer}>
      <h1>BI Data</h1>
      {isLoading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      {data && (
        <>
          <div className={styles.topContainer}>
            {/* Interactive Table */}
            <div className={styles.mainTableContainer}>
              <ProductTable
                title="Нехватка (есть на складах)"
                data={data.missing_but_available}
                onRowClick={setSelectedProduct}
                selectedProduct={selectedProduct}
              />
            </div>

            {/* Details View */}
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
            {/* Non-interactive Table */}
            <ProductTable
              title="Нехватка (нет на складах)"
              data={data.missing_and_unavailable}
            />
          </div>
        </>
      )}
    </div>
  );
}