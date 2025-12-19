"use client";

import { useEffect, useMemo } from "react";
import css from "./DetailsRemains.module.css";
import { getRemainsById } from "@/lib/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDetailsDataStore } from "@/store/DetailsDataStore";
import { useInitData } from "@/store/InitData";
import RemainsCard from "@/components/Remains/RemainsCard";

import Loader from "@/components/Loader/Loader";

export default function DetailsRemains({
  selectedProductId,
}: {
  selectedProductId: string | null;
}) {
  const initData = useInitData((state) => state.initData);
  const setRemains = useDetailsDataStore((state) => state.setRemains);
  const orders = useDetailsDataStore((state) => state.orders);

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["remainsById", selectedProductId],
    queryFn: () => getRemainsById({ productId: selectedProductId!, initData: initData! }),
    enabled: !!selectedProductId,
    placeholderData: keepPreviousData,
  });

  // ВСІ ХУКИ ТА ОБЧИСЛЕННЯ ПЕРЕД УМОВНИМИ RETURN
  const totalOrdered = useMemo(() => {
    if (!orders) return 0;
    return orders.reduce((sum, order) => sum + order.different, 0);
  }, [orders]);

  const totalBuh = data?.reduce((sum, item) => sum + item.buh, 0) || 0;
  const totalSkl = data?.reduce((sum, item) => sum + item.skl, 0) || 0;
  const totalStorage = data?.reduce((sum, item) => sum + item.storage, 0) || 0;
  const availableStock = totalBuh - totalOrdered;

  // Групуємо залишки по складах
  const groupedRemains = useMemo(() => {
    if (!data) return {};
    return data.reduce((groups, item) => {
      const warehouse = item.warehouse || "Інше";
      if (!groups[warehouse]) {
        groups[warehouse] = [];
      }
      groups[warehouse].push(item);
      return groups;
    }, {} as Record<string, typeof data>);
  }, [data]);

  // Записуємо дані в стор при їх оновленні
  useEffect(() => {
    setRemains(data ?? null);
  }, [data, setRemains]);

  // УМОВНІ RETURN ПІСЛЯ ВСІХ ХУКІВ
  if (!selectedProductId) {
    return (
      <div className={css.container}>
        <p>Оберіть товар зі списку, щоб побачити деталі.</p>
      </div>
    );
  }

  if (isFetching) {
    return <Loader />;
  }

  if (isError) {
    return <div className={css.container}>Для вибраного товару не знайдено даних по залишках.</div>;
  }

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
        
        <div className={css.mobileOnly}>
          {/* Надписи-попередження */}
          {totalBuh > totalSkl ? (
            <p className={css.warning}>
              ⚠️ Увага! Бух облік більший за складський облік! Схоже що {totalBuh - totalSkl} ще десь в дорозі!
            </p>
          ) : (
            <p className={css.success}>
              ✓ Все в порядку! Вся номенклатура на складі!
            </p>
          )}

          {totalOrdered === 0 ? (
            <p className={css.info}>
              ℹ️ Немає жодної заявки на цю номенклатуру, тому весь залишок вільний
            </p>
          ) : (
            <>
              {totalOrdered > totalBuh ? (
                <p className={css.warning}>
                  ⚠️ Увага! Для виконання всіх заявок не вистачає {totalOrdered - totalBuh}!
                </p>
              ) : (
                <p className={css.success}>
                  ✓ Все в порядку! Замовленої кількості вистачає для виконання всіх заявок!
                </p>
              )}

              {availableStock > 0 ? (
                <p className={css.success}>
                  ✓ Вільного залишку: {availableStock}
                </p>
              ) : (
                <p className={css.warning}>
                  ⚠️ Вільного залишку немає, всі залишки під заявки!
                </p>
              )}
            </>
          )}
        </div>
      </div>
      
      {data && data.length > 0 ? (
        <>
          {/* Групування по складах */}
          <div className={css.warehouseGroups}>
            {Object.entries(groupedRemains).map(([warehouse, items]) => (
              <div key={warehouse} className={css.warehouseGroup}>
                <h4 className={css.warehouseTitle}>{warehouse}</h4>
                <div className={css.partiesContainer}>
                  {items.map(item => (
                    <RemainsCard key={item.id} item={item} />
                  ))}
                </div>
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
