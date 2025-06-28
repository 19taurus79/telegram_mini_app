"use client";

import { createContext, useContext, useState, ReactNode, useMemo } from "react";

export type OnDelivery = {
  client: string;
  id: string;
  manager: string;
  order: string;
  product: string;
  quantity: number;
};

type GroupedDelivery = {
  client: string;
  manager: string;
  orders: {
    order: string;
    products: {
      product: string;
      quantity: number;
    }[];
  }[];
};

type DeliveryContextType = {
  onDeliveryArr: OnDelivery[];
  groupedByClient: GroupedDelivery[];
  handleRowClick: (item: OnDelivery) => void;
  modalItem: OnDelivery | null;
  setModalItem: (item: OnDelivery | null) => void;
  confirmAddWithQuantity: (quantity: number) => void;
};

const DeliveryContext = createContext<DeliveryContextType | undefined>(
  undefined
);

export const DeliveryProvider = ({ children }: { children: ReactNode }) => {
  const [onDeliveryArr, setOnDeliveryArr] = useState<OnDelivery[]>([]);
  const [modalItem, setModalItem] = useState<OnDelivery | null>(null);

  const handleRowClick = (item: OnDelivery) => {
    const isExist = onDeliveryArr.some((el) => el.id === item.id);

    if (!isExist) {
      // Открываем модалку для подтверждения количества
      setModalItem(item);
    } else {
      // Удаляем
      setOnDeliveryArr((prev) => prev.filter((el) => el.id !== item.id));
    }
  };

  const confirmAddWithQuantity = (quantity: number) => {
    if (modalItem) {
      const updatedItem = { ...modalItem, quantity };
      setOnDeliveryArr((prev) => [...prev, updatedItem]);
      setModalItem(null); // Закрываем модалку
    }
  };

  const groupedByClient = useMemo(() => {
    const map = new Map<string, GroupedDelivery>();

    for (const item of onDeliveryArr) {
      if (!map.has(item.client)) {
        map.set(item.client, {
          client: item.client,
          manager: item.manager,
          orders: [],
        });
      }

      const group = map.get(item.client)!;

      let order = group.orders.find((o) => o.order === item.order);
      if (!order) {
        order = { order: item.order, products: [] };
        group.orders.push(order);
      }

      order.products.push({
        product: item.product,
        quantity: item.quantity,
      });
    }

    return Array.from(map.values());
  }, [onDeliveryArr]);

  return (
    <DeliveryContext.Provider
      value={{
        onDeliveryArr,
        groupedByClient,
        handleRowClick,
        modalItem,
        setModalItem,
        confirmAddWithQuantity,
      }}
    >
      {children}
    </DeliveryContext.Provider>
  );
};

export const useDelivery = () => {
  const ctx = useContext(DeliveryContext);
  if (!ctx) throw new Error("useDelivery must be used within DeliveryProvider");
  return ctx;
};
