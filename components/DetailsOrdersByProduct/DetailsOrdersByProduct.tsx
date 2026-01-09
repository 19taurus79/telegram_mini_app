"use client";

import { useMemo } from "react";
import css from "./DetailsOrdersByProduct.module.css";
import { getOrdersByProduct } from "@/lib/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useInitData } from "@/store/InitData";

export default function DetailsOrdersByProduct({
  selectedProductId,
}: {
  selectedProductId: string | null;
}) {
  const initData = useInitData((state) => state.initData);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["ordersByProduct", selectedProductId],
    queryFn: () =>
      getOrdersByProduct({ product: selectedProductId!, initData: initData! }),
    enabled: !!selectedProductId,
    placeholderData: keepPreviousData,
  });

  const groupedOrders = useMemo(() => {
    if (!data) return {};
    return data.reduce((acc, order) => {
      const client = order.client || "Невідомий клієнт";
      if (!acc[client]) {
        acc[client] = [];
      }
      acc[client].push(order);
      return acc;
    }, {} as Record<string, typeof data>);
  }, [data]);

  if (!selectedProductId) {
    return (
      <div className={css.container}>
        <p>Оберіть товар зі списку, щоб побачити деталі.</p>
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
      <h3>Заявки по товару</h3>
      {Object.keys(groupedOrders).length > 0 ? (
        <div className={css.clientsContainer}>
          {Object.entries(groupedOrders).map(([client, orders]) => (
            <div key={client} className={css.clientGroup}>
              <h4 className={css.clientName}>{client}</h4>
              <ul className={css.ordersList}>
                {orders.map((order) => (
                  <li key={order.id} className={css.orderItem}>
                    <span>{order.contract_supplement}</span>
                    <span>К-ть: {order.different}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p>Немає заявок на цей товар.</p>
      )}
    </div>
  );
}
