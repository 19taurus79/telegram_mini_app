"use client";
import React, { useState, useEffect } from "react";
import { useDelivery } from "@/context/DeliveryContext";
import styles from "./DeliveryTable.module.css";
import DeliveryDetailsForm from "@/components/DeliveryDetailsForm/DeliveryDetailsForm";

export default function DeliveryList() {
  const [activeClientForDetails, setActiveClientForDetails] = useState<
    string | null
  >(null);
  const { setDeliveryDetails } = useDelivery();

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

  const handleDeliveryDetailsSubmit = (
    client: string,
    data: { address: string; contact: string; date: string }
  ) => {
    setDeliveryDetails((prev) => ({
      ...prev,
      [client]: data,
    }));
    setActiveClientForDetails(null); // закрыть форму
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
                    <li key={p.product} className={styles.productItem}>
                      <span>{p.product}</span>
                      <span>{p.quantity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <button onClick={() => setActiveClientForDetails(group.client)}>
              Надіслати в роботу
            </button>
            {activeClientForDetails === group.client && (
              <DeliveryDetailsForm
                client={group.client}
                onSubmit={handleDeliveryDetailsSubmit}
                onCancel={() => setActiveClientForDetails(null)}
              />
            )}
          </div>
        ))}
      </div>

      {modalItem && (
        <div className={styles.modalOverlay} onClick={() => setModalItem(null)}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={styles.modalTitle}>Змінити кількість</h3>
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
              {isEmpty && "Потрібно ввести кількість"}
              {!isEmpty && isTooLarge && (
                <>Кількіть не може бути більше {maxQty}</>
              )}
            </div>
            <div className={styles.modalButtons}>
              <button
                onClick={() => setModalItem(null)}
                className={styles.modalButton}
              >
                Відміна
              </button>
              <button
                onClick={handleSaveClick}
                className={styles.modalButton}
                disabled={isSaveDisabled}
              >
                Зберегти
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
