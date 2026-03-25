"use client";

import React, { useState, useEffect } from "react";
import { useDelivery } from "@/context/DeliveryContext";
import styles from "./DeliveryModal.module.css";

// Locally define or import types if they aren't exported. 
// In this case, we can't easily import GroupedDelivery as it's not exported from DeliveryContext.
// Let's define it here to match the Context.
interface GroupedDelivery {
  client: string;
  manager: string;
  orders: {
    order: string;
    products: {
      product: string;
      quantity: number;
    }[];
  }[];
}

export default function DeliveryWithModal() {
  const {
    groupedByClient,
    handleRowClick,
    modalItem,
    setModalItem,
    confirmAddWithQuantity,
  } = useDelivery();

  const [inputQty, setInputQty] = useState(1);

  useEffect(() => {
    if (modalItem) {
      setInputQty(modalItem.quantity);
    }
  }, [modalItem]);

  if (!groupedByClient.length) return <div>Нет данных для доставки</div>;

  return (
    <>
      <div>
        {groupedByClient.map((group: GroupedDelivery) => (
          <div key={group.client} style={{ marginBottom: 20 }}>
            <div>
              <strong>Менеджер:</strong> {group.manager}
            </div>
            <div>
              <strong>Клиент:</strong> {group.client}
            </div>

            {group.orders.map((order: GroupedDelivery["orders"][number]) => (
              <div key={order.order} style={{ marginTop: 10 }}>
                <div>
                  <strong>Заказ:</strong> {order.order}
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Товар</th>
                      <th>Количество</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.products.map((p: GroupedDelivery["orders"][number]["products"][number], idx: number) => (
                      <tr key={idx}>
                        <td>{p.product}</td>
                        <td
                          style={{ cursor: "pointer", color: "blue" }}
                          onClick={() => {
                            handleRowClick({
                              client: group.client,
                              manager: group.manager,
                              order: order.order,
                              product: p.product,
                              quantity: p.quantity,
                              id: order.order + p.product,
                            });
                          }}
                        >
                          {p.quantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ))}
      </div>

      {modalItem && (
        <div className={styles.overlay} onClick={() => setModalItem(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.title}>Изменить количество</h3>
            <p>
              Товар: <b>{modalItem.product}</b>
            </p>
            <input
              type="number"
              min={1}
              className={styles.input}
              value={inputQty}
              onChange={(e) => setInputQty(Number(e.target.value))}
              autoFocus
            />
            <div className={styles.footer}>
              <button 
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setModalItem(null)}
              >
                Отмена
              </button>
              <button 
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => confirmAddWithQuantity(inputQty)}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
