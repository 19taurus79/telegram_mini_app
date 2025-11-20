"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getOrdersByProduct } from "@/lib/api";
import css from "./DetailsOrdersByProduct.module.css";
import { useDetailsDataStore } from "@/store/DetailsDataStore";
import { useInitData } from "@/store/InitData";
// import DetailsMovedProducts from "@/components/DetailsMovedProduts/DetailsMovedProducts";

export default function DetailsOrdersByProduct({
  selectedProductId,
}: {
  selectedProductId: string | null;
}) {
  const initData = useInitData((state) => state.initData);
  const [sortDirection, setSortDirection] = useState<
    "ascending" | "descending" | null
  >(null);
  const setOrders = useDetailsDataStore((state) => state.setOrders);
  const { movedProducts } = useDetailsDataStore();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["ordersByProduct", selectedProductId],
    queryFn: () =>
      getOrdersByProduct({ product: selectedProductId!, initData: initData! }),
    enabled: !!selectedProductId,
    placeholderData: keepPreviousData,
  });

  // Записуємо дані в стор при їх оновленні
  useEffect(() => {
    setOrders(data ?? null);
  }, [data, setOrders]);

  // Створюємо Map, де ключ - контракт, а значення - сума переміщеної кількості
  const movedContractsMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!movedProducts) {
      return map;
    }
    for (const item of movedProducts) {
      const currentQty = map.get(item.contract) || 0;
      map.set(item.contract, Number(currentQty + item.qt_moved));
    }
    return map;
  }, [movedProducts]);

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
console.log("MOVED",movedProducts)
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
              {/* Нова колонка для галочки */}
              <th className={css.checkmarkHeader}>Переміщено</th>
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
                {/* Ячейка з галочкою */}
                <td className={css.checkmarkCell}>
                  {(() => {
                    const movedQty =
                      movedContractsMap.get(order.contract_supplement) || 0;
                    if (movedQty === 0) return null;

                    if (movedQty >= order.different) {
                      // Якщо переміщено достатньо - зелена галочка
                      return <span className={css.checkmarkGreen}>✓</span>;
                    } else {
                      // Якщо переміщено, але не все - жовта
                      return <span className={css.checkmarkYellow}>✓</span>;
                    }
                  })()}
                </td>
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