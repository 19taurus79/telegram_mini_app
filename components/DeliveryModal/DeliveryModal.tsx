"use client";

import React, { useState, useEffect } from "react";
import { useDelivery } from "@/context/DeliveryContext";

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
        {groupedByClient.map((group) => (
          <div key={group.client} style={{ marginBottom: 20 }}>
            <div>
              <strong>Менеджер:</strong> {group.manager}
            </div>
            <div>
              <strong>Клиент:</strong> {group.client}
            </div>

            {group.orders.map((order) => (
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
                    {order.products.map((p, idx) => (
                      <tr key={idx}>
                        <td>{p.product}</td>
                        <td
                          style={{ cursor: "pointer", color: "blue" }}
                          onClick={() => {
                            // Нам нужен полный OnDelivery объект для открытия модалки
                            // По id и названию, надо найти элемент в onDeliveryArr
                            // Упростим: пусть у тебя есть item для вызова
                            // Но если нет, можно хранить map в контексте
                            // Здесь для примера просто вызываем handleRowClick с данными
                            handleRowClick({
                              client: group.client,
                              manager: group.manager,
                              order: order.order,
                              product: p.product,
                              quantity: p.quantity,
                              id: order.order + p.product, // Собери id так же, как в контексте
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
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.3)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
          onClick={() => setModalItem(null)}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: 20,
              borderRadius: 8,
              minWidth: 300,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Изменить количество</h3>
            <p>
              Товар: <b>{modalItem.product}</b>
            </p>
            <input
              type="number"
              min={1}
              value={inputQty}
              onChange={(e) => setInputQty(Number(e.target.value))}
              style={{
                width: "100%",
                marginBottom: 12,
                padding: 8,
                fontSize: 16,
              }}
            />
            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}
            >
              <button onClick={() => setModalItem(null)}>Отмена</button>
              <button onClick={() => confirmAddWithQuantity(inputQty)}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
