"use client";

import { useState, useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getOrdersByProduct } from "@/lib/api";
import { getInitData } from "@/lib/getInitData";
import css from "./DetailsOrdersByProduct.module.css";
// import DetailsMovedProducts from "@/components/DetailsMovedProduts/DetailsMovedProducts";

export default function DetailsOrdersByProduct({
  selectedProductId,
}: {
  selectedProductId: string | null;
}) {
  const initData = getInitData();
  const [sortDirection, setSortDirection] = useState<
    "ascending" | "descending" | null
  >(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["ordersByProduct", selectedProductId],
    queryFn: () =>
      getOrdersByProduct({ product: selectedProductId!, initData }),
    enabled: !!selectedProductId,
    placeholderData: keepPreviousData,
  });

  const sortedData = useMemo(() => {
    if (!data) return [];
    if (sortDirection === null) return data;

    // Створюємо копію масиву, щоб не мутувати кешовані дані
    return [...data].sort((a, b) => {
      if (a.delivery_status < b.delivery_status) {
        return sortDirection === "ascending" ? -1 : 1;
      }
      if (a.delivery_status > b.delivery_status) {
        return sortDirection === "ascending" ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortDirection]);

  const handleSort = () => {
    if (sortDirection === null) {
      setSortDirection("ascending");
    } else if (sortDirection === "ascending") {
      setSortDirection("descending");
    } else {
      setSortDirection(null);
    }
  };

  if (!selectedProductId) {
    return (
      <div className={css.container}>
        {/* Пустий блок, коли товар не вибрано */}
      </div>
    );
  }

  if (isLoading) {
    return <div className={css.container}>Завантаження заявок...</div>;
  }

  if (isError) {
    return <div className={css.container}>Помилка: {error.message}</div>;
  }

  return (
    <div className={css.container}>
      <h3>Заявки по товару:</h3>
      {sortedData && sortedData.length > 0 ? (
        <table className={css.table}>
          <thead>
            <tr>
              <th>Менеджер</th>
              <th>Клієнт</th>
              <th>Доповнення</th>
              <th onClick={handleSort} className={css.sortableHeader}>
                До постачання{" "}
                {sortDirection === "ascending"
                  ? "↑"
                  : sortDirection === "descending"
                  ? "↓"
                  : ""}
              </th>
              <th>Кількість</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((order) => (
              <tr key={order.id}>
                <td>{order.manager}</td>
                <td>{order.client}</td>
                <td>{order.contract_supplement}</td>
                <td>{order.delivery_status}</td>
                <td>{order.different}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>По цьому товару немає заявок.</p>
      )}
    </div>
  );
}