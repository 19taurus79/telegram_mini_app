"use client";

import { useQuery } from "@tanstack/react-query";
import { getOrders, getRemainsForBi, getOrdersDetailsById } from "@/lib/api";
import { Client, Contract, Order } from "@/types/types";
import styles from "../OrdersDashboard.module.css";
import { useMemo } from "react";

interface DetailsWidgetProps {
  initData: string;
  selectedClient: Client | null;
  selectedContract: Contract | null;
  showAllContracts: boolean;
}

// Підкомпонент для ефективного завантаження деталей рядка
const OrderRow = ({
  order,
  initData,
  remainsMap,
}: {
  order: Order;
  initData: string;
  remainsMap: Map<string, { buh: number; skl: number }>;
}) => {
  // Кожен рядок сам завантажує свої деталі (партії)
  // Це дозволяє розпаралелити запити і не блокувати відображення основної таблиці
  const { data: details } = useQuery({
    queryKey: ["orderDetails", order.id],
    queryFn: () => getOrdersDetailsById({ orderId: order.id, initData }),
    enabled: !!order.id && !!initData,
  });

  // Отримуємо залишки з глобальної мапи (O(1) доступ)
  const productRemains = remainsMap.get(order.product) || { buh: 0, skl: 0 };

  // Обчислюємо переміщені партії
  const movedParties = details?.[0]?.parties || [];
  
  return (
    <tr>
      <td className={styles.td} title={order.product}>
        {order.product}
      </td>
      <td className={styles.td}>{order.plan}</td>
      <td className={styles.td}>{order.fact}</td>
      <td className={styles.td}>
        {/* Відображення партій, якщо вони є */}
        {movedParties.length > 0 ? (
          <div style={{ fontSize: "11px" }}>
            {movedParties.map((p, i) => (
              <div key={i}>
                {p.moved_q} ({p.party})
              </div>
            ))}
          </div>
        ) : (
          <span style={{ opacity: 0.5 }}>-</span>
        )}
      </td>
      <td className={styles.td}>
        {/* Відображення залишків (Бухгалтерських та Складських) */}
        <div style={{ fontSize: "11px" }}>
          <div>Бух: {productRemains.buh}</div>
          <div>Скл: {productRemains.skl}</div>
        </div>
      </td>
    </tr>
  );
};

export default function DetailsWidget({
  initData,
  selectedClient,
  selectedContract,
  showAllContracts,
}: DetailsWidgetProps) {
  // Завантажуємо ВСІ замовлення клієнта
  const { data: orders, isLoading: isLoadingOrders } = useQuery({
    queryKey: ["orders", selectedClient?.id],
    queryFn: () =>
      selectedClient
        ? getOrders({ client: selectedClient.client, initData })
        : Promise.resolve([]),
    enabled: !!selectedClient && !!initData,
  });

  // Завантажуємо глобальні залишки (один раз для всієї таблиці)
  const { data: remains } = useQuery({
    queryKey: ["biRemains"],
    queryFn: () => getRemainsForBi(),
  });

  // Перетворюємо масив залишків у Map для швидкого пошуку
  const remainsMap = useMemo(() => {
    const map = new Map<string, { buh: number; skl: number }>();
    if (remains?.remains_total) {
      remains.remains_total.forEach((r) => {
        map.set(r.product, { buh: r.buh, skl: r.skl });
      });
    }
    return map;
  }, [remains]);

  // Фільтруємо замовлення в залежності від режиму (конкретний контракт чи всі)
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (showAllContracts) return orders;
    if (selectedContract) {
      return orders.filter(
        (o) => o.contract_supplement === selectedContract.contract_supplement
      );
    }
    return [];
  }, [orders, selectedContract, showAllContracts]);

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Товар</th>
            <th className={styles.th} style={{ width: "60px" }}>План</th>
            <th className={styles.th} style={{ width: "60px" }}>Факт</th>
            <th className={styles.th}>Переміщено (Партії)</th>
            <th className={styles.th}>Залишки (Загальні)</th>
          </tr>
        </thead>
        <tbody>
            {isLoadingOrders && (
                <tr>
                    <td colSpan={5} style={{padding: '10px', textAlign: 'center'}}>Завантаження замовлень...</td>
                </tr>
            )}
          {filteredOrders.map((order, idx) => (
            <OrderRow
              key={order.id || idx}
              order={order}
              initData={initData}
              remainsMap={remainsMap}
            />
          ))}
          {!isLoadingOrders && filteredOrders.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: "20px", textAlign: "center", opacity: 0.6 }}>
                {selectedContract || showAllContracts
                  ? "Замовлень не знайдено"
                  : "Оберіть контракт або натисніть 'Всі'"}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
