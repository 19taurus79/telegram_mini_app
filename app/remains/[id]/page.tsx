"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import BackBtn from "@/components/BackBtn/BackBtn";
import { getRemainsById, getTotalSumOrderByProduct } from "@/lib/api";
import css from "./RemainsList.module.css";
import OrdersByProduct from "@/components/OrdersByProduct/OrderByProduct";
import RemainsCard from "@/components/Remains/RemainsCard";

type Props = {
  params: Promise<{ id: string }>;
};

export default function FilteredRemains({ params }: Props) {
  const [id, setId] = React.useState<string | null>(null);

  React.useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  const { data: remains, isLoading: isLoadingRemains } = useQuery({
    queryKey: ["remains", id],
    queryFn: () => getRemainsById(id!),
    enabled: !!id,
  });

  const { data: sumOrder, isLoading: isLoadingSumOrder } = useQuery({
    queryKey: ["totalSumOrder", id],
    queryFn: () => getTotalSumOrderByProduct(id!),
    enabled: !!id,
  });

  if (!id || isLoadingRemains || isLoadingSumOrder) {
    return <div className={css.remainsList}>Завантаження...</div>;
  }

  if (!remains || remains.length === 0) {
    return <div className={css.remainsList}>Дані не знайдено</div>;
  }

  const remainsSummary = remains.reduce(
    (acc, item) => {
      acc.buh += item.buh;
      acc.skl += item.skl;
      acc.storage += item.storage;
      return acc;
    },
    { buh: 0, skl: 0, storage: 0 }
  );

  const groupedRemains = remains.reduce((groups, item) => {
    const warehouse = item.warehouse || "Інше";
    if (!groups[warehouse]) {
      groups[warehouse] = [];
    }
    groups[warehouse].push(item);
    return groups;
  }, {} as Record<string, typeof remains>);

  const totalOrders = sumOrder?.[0]?.total_orders || 0;

  return (
    <>
      <ul className={css.remainsList}>
        <h2>Номенклатура: {remains[0].nomenclature}</h2>
        <h3>Бух облік: {remainsSummary.buh}</h3>
        <h3>Складський облік: {remainsSummary.skl}</h3>
        {remainsSummary.storage > 0 && (
          <h3>Зберегання: {remainsSummary.storage}</h3>
        )}
        {remainsSummary.buh > remainsSummary.skl ? (
          <h3 className={css.warning}>
            Увага! Бух облік більший за складський облік! Схоже що{" "}
            {remainsSummary.buh - remainsSummary.skl} ще десь в дорозі!
          </h3>
        ) : (
          <h3 className={css.success}>
            Все в порядку ! Вся номенклатура на складі !
          </h3>
        )}
        {totalOrders === 0 ? (
          <h3>
            Немає жодної заявки на цю номенклатуру, тому весь залишок вільний
          </h3>
        ) : (
          <h3>Під всі заявки потрібно: {totalOrders}</h3>
        )}

        {totalOrders > remainsSummary.buh ? (
          <h3 className={css.warning}>
            Увага! Для виконання всіх заявок не вистачає&nbsp;
            {totalOrders - remainsSummary.buh} !
          </h3>
        ) : totalOrders !== 0 ? (
          <h3 className={css.success}>
            Все в порядку! Замовленної кількості вистачає для виконання всіх
            заявок !
          </h3>
        ) : null}
        {remainsSummary.buh > totalOrders ? (
          <h3 className={css.success}>
            Вільного залишку: {remainsSummary.buh - totalOrders}
          </h3>
        ) : (
          <h3 className={css.warning}>
            Вільного залишку немає, всі залишки під заявки !
          </h3>
        )}

        <div style={{ marginTop: "24px" }}>
            {Object.entries(groupedRemains).map(([warehouse, items]) => (
                <div key={warehouse} style={{ marginBottom: "24px" }}>
                    <h4 className={css.warehouseTitle}>{warehouse}</h4>
                    {items.map(item => (
                        <RemainsCard key={item.id} item={item} />
                    ))}
                </div>
            ))}
        </div>

      </ul>
      <BackBtn />
      {totalOrders !== 0 && <OrdersByProduct product={id} />}
    </>
  );
}
