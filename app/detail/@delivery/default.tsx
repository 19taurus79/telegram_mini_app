"use client";
import React, { useState, useEffect } from "react";
import { useDelivery } from "@/context/DeliveryContext";
import styles from "./DeliveryTable.module.css";

export default function DeliveryList() {
  const {
    groupedByClient,
    // handleRowClick,
    modalItem,
    setModalItem,
    confirmAddWithQuantity,
  } = useDelivery();

  const [inputQty, setInputQty] = useState<string | number>("1");

  useEffect(() => {
    if (modalItem) {
      setInputQty(modalItem.quantity);
    }
  }, [modalItem]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;

    // Убираем ведущие нули (если не пустое)
    if (val !== "") {
      val = val.replace(/^0+/, "");
      if (val === "") val = "0";
    }

    setInputQty(val);
  };

  const numericQty = Number(inputQty);
  const maxQty = modalItem ? modalItem.quantity : Infinity;

  // Проверки для предупреждений
  const isEmpty = inputQty === "";
  const isTooLarge = numericQty > maxQty;

  const isSaveDisabled =
    isEmpty || isNaN(numericQty) || numericQty < 1 || isTooLarge;

  const handleSaveClick = () => {
    if (!isSaveDisabled) {
      confirmAddWithQuantity(numericQty);
    }
  };

  return (
    <>
      <div className={styles.wrapper}>
        {groupedByClient.map((group) => (
          <div key={group.client} className={styles.clientBlock}>
            <h3 className={styles.rowLabel}>
              {group.client} — Менеджер: {group.manager}
            </h3>
            {group.orders.map((order) => (
              <div key={order.order} className={styles.orderBlock}>
                <strong className={styles.orderTitle}>
                  Доповнення: {order.order}
                </strong>
                <ul className={styles.productList}>
                  {order.products.map((p) => (
                    <li
                      key={p.product}
                      className={styles.productItem}
                      //   onClick={() =>
                      //     handleRowClick({
                      //       client: group.client,
                      //       manager: group.manager,
                      //       order: order.order,
                      //       product: p.product,
                      //       quantity: p.quantity,
                      //       id: order.order + p.product,
                      //     })
                      //   }
                    >
                      <span>{p.product}</span>
                      <span>{p.quantity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>

      {modalItem && (
        <div className={styles.modalOverlay} onClick={() => setModalItem(null)}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={styles.modalTitle}>Изменить количество</h3>
            <p>
              Товар: <b>{modalItem.product}</b>
            </p>
            <input
              type="number"
              min={1}
              max={maxQty}
              value={inputQty}
              onChange={handleInputChange}
              className={styles.modalInput}
            />
            {/* Предупреждения */}
            <div style={{ color: "red", minHeight: 20, marginBottom: 8 }}>
              {isEmpty && "Введите количество"}
              {!isEmpty && isTooLarge && (
                <>Количество не может быть больше {maxQty}</>
              )}
            </div>
            <div className={styles.modalButtons}>
              <button
                onClick={() => setModalItem(null)}
                className={styles.modalButton}
              >
                Отмена
              </button>
              <button
                onClick={handleSaveClick}
                className={styles.modalButton}
                disabled={isSaveDisabled}
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
