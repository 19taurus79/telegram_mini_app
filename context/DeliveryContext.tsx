// Директива Next.js — говорит, что компонент работает на клиенте (обязательно для хуков)
"use client";

// Импортируем React-хуки и типы
import { createContext, useContext, useState, ReactNode, useMemo } from "react";

// Тип: одна позиция товара, который может быть добавлен на доставку
export type OnDelivery = {
  client: string; // имя клиента
  id: string; // уникальный идентификатор товара
  manager: string; // имя менеджера
  order: string; // номер заказа
  product: string; // наименование товара
  quantity: number; // количество (вводится вручную)
};

// Тип: структура для сгруппированных товаров (по клиенту и заказам)
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
  deliveryAddress?: string; // адрес доставки
  contactPerson?: string; // контакт получателя
  deliveryDate?: string; // дата доставки (например, ISO-строка)
};

// Тип: то, что мы будем хранить и передавать через контекст
type DeliveryContextType = {
  onDeliveryArr: OnDelivery[]; // текущие товары на доставке
  groupedByClient: GroupedDelivery[]; // сгруппированный вид (по клиенту и заказу)
  handleRowClick: (item: OnDelivery) => void; // обработка клика по строке (добавить/удалить)
  modalItem: OnDelivery | null; // текущий товар, который отображается в модалке
  setModalItem: (item: OnDelivery | null) => void; // ручное управление отображением модалки
  confirmAddWithQuantity: (quantity: number) => void; // подтверждение добавления товара с количеством
  deliveryDetails: Record<
    string,
    { address: string; contact: string; date: string }
  >;
  setDeliveryDetails: React.Dispatch<
    React.SetStateAction<
      Record<string, { address: string; contact: string; date: string }>
    >
  >;
};

// Создаём сам контекст (сначала без значения, undefined)
const DeliveryContext = createContext<DeliveryContextType | undefined>(
  undefined
);

// Провайдер — компонент, который оборачивает другие компоненты и даёт им доступ к данным
export const DeliveryProvider = ({ children }: { children: ReactNode }) => {
  // Состояние: список товаров, которые пользователь добавил на доставку
  const [onDeliveryArr, setOnDeliveryArr] = useState<OnDelivery[]>([]);

  // Состояние: текущий товар, для которого пользователь должен ввести количество (через модалку)
  const [modalItem, setModalItem] = useState<OnDelivery | null>(null);
  const [deliveryDetails, setDeliveryDetails] = useState<
    Record<string, { address: string; contact: string; date: string }>
  >({});

  // Обработка клика по товару:
  // если товар уже есть — удалить, если нет — открыть модалку
  const handleRowClick = (item: OnDelivery) => {
    const isExist = onDeliveryArr.some((el) => el.id === item.id);

    if (!isExist) {
      // Открываем модалку для подтверждения количества
      setModalItem(item);
    } else {
      // Удаляем товар из списка
      setOnDeliveryArr((prev) => prev.filter((el) => el.id !== item.id));
    }
  };

  // Подтверждение добавления товара: ввод количества, обновление списка и закрытие модалки
  const confirmAddWithQuantity = (quantity: number) => {
    if (modalItem) {
      const updatedItem = { ...modalItem, quantity };
      setOnDeliveryArr((prev) => [...prev, updatedItem]);
      setModalItem(null); // Закрываем модалку после добавления
    }
  };

  // Мемоизированная функция группировки товаров по клиентам и заказам
  const groupedByClient = useMemo(() => {
    const map = new Map<string, GroupedDelivery>();

    for (const item of onDeliveryArr) {
      if (!map.has(item.client)) {
        const info = deliveryDetails[item.client] || {};

        map.set(item.client, {
          client: item.client,
          manager: item.manager,
          orders: [],
          deliveryAddress: info.address,
          contactPerson: info.contact,
          deliveryDate: info.date,
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
  }, [onDeliveryArr, deliveryDetails]);
  console.log("Конечный вариант", groupedByClient);

  // Возвращаем провайдер с данными и функциями
  return (
    <DeliveryContext.Provider
      value={{
        onDeliveryArr,
        groupedByClient,
        handleRowClick,
        modalItem,
        setModalItem,
        confirmAddWithQuantity,
        deliveryDetails,
        setDeliveryDetails,
      }}
    >
      {children}
    </DeliveryContext.Provider>
  );
};

// Хук для использования данных контекста в любом дочернем компоненте
export const useDelivery = () => {
  const ctx = useContext(DeliveryContext);

  // Если провайдер не обёрнут — выбрасываем ошибку (безопасность)
  if (!ctx) throw new Error("useDelivery must be used within DeliveryProvider");

  return ctx; // возвращаем значения контекста
};
