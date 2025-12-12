"use client";

import { useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getMovedDataByProduct } from "@/lib/api";
import css from "./DetailsMovedProducts.module.css";
import { useInitData } from "@/store/InitData";
import { useDetailsDataStore } from "@/store/DetailsDataStore";

export default function DetailsMovedProducts({
  selectedProductId,
}: {
  selectedProductId: string | null;
}) {
  const setMovedProducts = useDetailsDataStore((state) => state.setMovedProducts);
  const initData = useInitData((state) => state.initData);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["movedProducts", selectedProductId],
    queryFn: () => getMovedDataByProduct({productId: selectedProductId!, initData: initData!}),
    enabled: !!selectedProductId,
    placeholderData: keepPreviousData,
  });

  // Записуємо дані в стор при їх оновленні
  useEffect(() => {
    setMovedProducts(data ?? null);
  }, [data, setMovedProducts]);

  if (!selectedProductId) {
    return (
      <div className={css.container}>
        {/* Пустий блок, коли товар не вибрано */}
      </div>
    );
  }

  if (isLoading) {
    return <div className={css.container}>Завантаження переміщень...</div>;
  }

  if (isError) {
    return <div className={css.container}>Помилка: {error.message}</div>;
  }

  return (
    <div className={css.container}>
      <h3>Переміщення по товару:</h3>
      {data && data.length > 0 ? (
        <>
        <table className={css.table}>
          <thead>
            <tr>
              <th>Доповнення</th>
              <th>Клієнт</th>
              <th>Менеджер</th>
              <th>Партія</th>
              <th>Кількість</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={`${item.id}-${index}`}>
                <td>{item.contract}</td>
                <td>{item.client}</td>
                <td>{item.manager}</td>
                <td>{item.party_sign_y}</td>
                <td>{item.qt_moved}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Карткове відображення для мобілки */}
        <div className={css.mobileCards}>
          {data.map((item, index) => (
            <div key={`${item.id}-${index}`} className={css.card}>
              <div className={css.cardRow}>
                <span className={css.cardLabel}>Доповнення:</span>
                <span className={css.cardValue}>{item.contract}</span>
              </div>
              <div className={css.cardRow}>
                <span className={css.cardLabel}>Клієнт:</span>
                <span className={css.cardValue}>{item.client}</span>
              </div>
              <div className={css.cardRow}>
                <span className={css.cardLabel}>Менеджер:</span>
                <span className={css.cardValue}>{item.manager}</span>
              </div>
              <div className={css.cardRow}>
                <span className={css.cardLabel}>Партія:</span>
                <span className={css.cardValue}>{item.party_sign_y}</span>
              </div>
              <div className={css.cardRow}>
                <span className={css.cardLabel}>Кількість:</span>
                <span className={css.cardValue}>{item.qt_moved}</span>
              </div>
            </div>
          ))}
        </div>
        </>
      ) : (
        <p>По цьому товару немає переміщень.</p>
      )}
    </div>
  );
}
