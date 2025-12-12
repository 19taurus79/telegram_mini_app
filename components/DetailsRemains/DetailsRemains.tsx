"use client";

import { useEffect, useMemo } from "react";
import css from "./DetailsRemains.module.css";
import { getRemainsById } from "@/lib/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDetailsDataStore } from "@/store/DetailsDataStore";
import { useInitData } from "@/store/InitData";

export default function DetailsRemains({
  selectedProductId,
}: {
  selectedProductId: string | null;
}) {
  const initData = useInitData((state) => state.initData);
  const setRemains = useDetailsDataStore((state) => state.setRemains);
  const orders = useDetailsDataStore((state) => state.orders);

  const { data, isLoading, isError, error } = useQuery({
    // Ключ запиту тепер залежить від ID продукту, що забезпечує кешування та автоматичне оновлення.
    queryKey: ["remainsById", selectedProductId],
    // Функція запиту
    queryFn: () => getRemainsById({ productId: selectedProductId!, initData: initData! }),
    // Дуже важлива опція: запит буде виконано тільки якщо selectedProductId не є null або порожнім рядком.
    enabled: !!selectedProductId,
      placeholderData: keepPreviousData,
  });

  const totalOrdered = useMemo(() => {
        if (!orders) return 0;
        return orders.reduce((sum, order) => sum + order.different, 0);
    }, [orders]);
  // Записуємо дані в стор при їх оновленні
  useEffect(() => {
    setRemains(data ?? null);
  }, [data, setRemains]);

  if (!selectedProductId) {
    return (
      <div className={css.container}>
        <p>Оберіть товар зі списку, щоб побачити деталі.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className={css.container}>Завантаження деталей...</div>;
  }

  if (isError) {
    return <div className={css.container}>Помилка: {error.message}</div>;
  }
    const totalBuh = data?.reduce((sum, item) => sum + item.buh, 0) || 0;
  const totalSkl = data?.reduce((sum, item) => sum + item.skl, 0) || 0;
  const totalStorage = data?.reduce((sum, item) => sum + item.storage, 0) || 0;

    const availableStock = totalBuh - totalOrdered;

  return (
    <div className={css.container}>
        <div className={css.header}>
        <h3>Деталі по товару: {data && data.length>0 ? `${data[0].nomenclature} ${data[0].party_sign} ${data[0].buying_season}`:` `}</h3>
        <br/>
            <h4>
                Всього по Бух: {totalBuh} | Складу: {totalSkl} | {totalStorage>0 && `На збереганні: ${totalStorage} |`} Під заявками: {totalOrdered} | Вільний залишок: {Math.max(0, availableStock)}
                {availableStock < 0 && (
                    <span className={css.deficit}> | Потреба: {-availableStock}</span>
                )}
            </h4>
        </div>
      {data && data.length > 0 ? (
        <>
            {/* Таблиця для десктопу */}
            <table className={css.table}>
                <thead>
            <tr>
              <th>Склад</th>
                        <th>Партія</th>
                        <th>Бух</th>
              <th>Склад</th>
              {totalStorage>0 && <th>Зберегання</th>}
                    </tr>
          </thead>
          <tbody>
          {data.map((item, index) => (
              <tr key={index} >
                <td>{item.warehouse}</td>
                        <td>
                            <details className={css.details}>
                                <summary className={css.summary}>{item.nomenclature_series}</summary>
                                <div className={css.detailsContent}>
                                    <p><strong>Батьківський елемент:</strong> {item.parent_element}</p>
                                    <p><strong>Країна походження:</strong> {item.origin_country}</p>
                                    <p><strong>Рік врожаю:</strong> {item.crop_year}</p>
                                    <p><strong>Схожість:</strong> {item.germination}</p>
                                    <p><strong>МТН:</strong> {item.mtn}</p>
                                    <p><strong>Вага одиниці:</strong> {item.weight}</p>
                                </div>
                            </details>
                        </td>
                        <td>{item.buh}</td>
                        <td>{item.skl}</td>
                        {totalStorage>0 && <td>{item.storage}</td>}
                    </tr>
                ))}
          </tbody>
            </table>

            {/* Карткове відображення для мобілки */}
            <div className={css.mobileCards}>
                {data.map((item, index) => (
                    <div key={index} className={css.card}>
                        <div className={css.cardHeader}>
                            <span className={css.warehouse}>{item.warehouse}</span>
                        </div>
                        
                        <div className={css.cardRow}>
                            <span className={css.cardLabel}>Партія:</span>
                            <span className={css.cardValue}>{item.nomenclature_series}</span>
                        </div>
                        
                        <div className={css.cardRow}>
                            <span className={css.cardLabel}>Бух:</span>
                            <span className={css.cardValue}>{item.buh}</span>
                        </div>
                        
                        <div className={css.cardRow}>
                            <span className={css.cardLabel}>Склад:</span>
                            <span className={css.cardValue}>{item.skl}</span>
                        </div>
                        
                        {totalStorage > 0 && (
                            <div className={css.cardRow}>
                                <span className={css.cardLabel}>Зберегання:</span>
                                <span className={css.cardValue}>{item.storage}</span>
                            </div>
                        )}

                        {/* Додаткова інформація в згорнутому вигляді */}
                        <details className={css.details} style={{ marginTop: '8px' }}>
                            <summary className={css.summary} style={{ fontSize: '0.85rem' }}>
                                Детальна інформація
                            </summary>
                            <div className={css.detailsContent}>
                                <p style={{ fontSize: '0.8rem', margin: '4px 0' }}>
                                    <strong>Батьківський елемент:</strong> {item.parent_element}
                                </p>
                                <p style={{ fontSize: '0.8rem', margin: '4px 0' }}>
                                    <strong>Країна походження:</strong> {item.origin_country}
                                </p>
                                <p style={{ fontSize: '0.8rem', margin: '4px 0' }}>
                                    <strong>Рік врожаю:</strong> {item.crop_year}
                                </p>
                                <p style={{ fontSize: '0.8rem', margin: '4px 0' }}>
                                    <strong>Схожість:</strong> {item.germination}
                                </p>
                                <p style={{ fontSize: '0.8rem', margin: '4px 0' }}>
                                    <strong>МТН:</strong> {item.mtn}
                                </p>
                                <p style={{ fontSize: '0.8rem', margin: '4px 0' }}>
                                    <strong>Вага одиниці:</strong> {item.weight}
                                </p>
                            </div>
                        </details>
                    </div>
                ))}
            </div>
        </>
        ) : (
            <p>Немає даних по залишках.</p>
        )}
    </div>
  );
}