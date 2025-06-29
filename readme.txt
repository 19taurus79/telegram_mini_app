// Обязательная директива Next.js, чтобы указать, что компонент рендерится на клиенте
"use client";
tsx
Копіювати
Редагувати
// Импортируем необходимые хуки и типы
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
} from "react";
🧩 Типы
tsx
Копіювати
Редагувати
// Тип отдельной строки: товар в доставке
export type OnDelivery = {
  client: string;
  id: string;
  manager: string;
  order: string;
  product: string;
  quantity: number;
};

// Тип сгруппированных данных по клиенту, для отображения заказов и товаров
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

// Тип контекста — какие значения и функции он будет предоставлять
type DeliveryContextType = {
  onDeliveryArr: OnDelivery[]; // список всех товаров, добавленных в доставку
  groupedByClient: GroupedDelivery[]; // сгруппированный список для отображения
  handleRowClick: (item: OnDelivery) => void; // обработка клика по строке
  modalItem: OnDelivery | null; // товар, который сейчас открыт в модалке
  setModalItem: (item: OnDelivery | null) => void; // функция для управления модалкой
  confirmAddWithQuantity: (quantity: number) => void; // подтверждение добавления товара с количеством
};
☑️ Создание контекста
tsx
Копіювати
Редагувати
// Создаём контекст, но пока без значений (undefined)
const DeliveryContext = createContext<DeliveryContextType | undefined>(undefined);
🧩 Провайдер (оборачивает приложение или страницу)
tsx
Копіювати
Редагувати
export const DeliveryProvider = ({ children }: { children: ReactNode }) => {
  // Состояние: список всех товаров на доставке
  const [onDeliveryArr, setOnDeliveryArr] = useState<OnDelivery[]>([]);

  // Состояние: текущий товар, для которого открыта модалка
  const [modalItem, setModalItem] = useState<OnDelivery | null>(null);
🔘 Обработка клика по товару
tsx
Копіювати
Редагувати
  const handleRowClick = (item: OnDelivery) => {
    const isExist = onDeliveryArr.some((el) => el.id === item.id);

    if (!isExist) {
      // Если товара ещё нет — открываем модалку (пользователь введёт количество)
      setModalItem(item);
    } else {
      // Если уже есть — удаляем из списка
      setOnDeliveryArr((prev) => prev.filter((el) => el.id !== item.id));
    }
  };
✅ Подтверждение добавления товара (с количеством)
tsx
Копіювати
Редагувати
  const confirmAddWithQuantity = (quantity: number) => {
    if (modalItem) {
      // Обновляем товар с количеством
      const updatedItem = { ...modalItem, quantity };

      // Добавляем в список доставляемых
      setOnDeliveryArr((prev) => [...prev, updatedItem]);

      // Закрываем модалку
      setModalItem(null);
    }
  };
📊 Сгруппировать товары по клиенту и заказу
tsx
Копіювати
Редагувати
  const groupedByClient = useMemo(() => {
    const map = new Map<string, GroupedDelivery>();

    for (const item of onDeliveryArr) {
      // Если для клиента ещё нет группы — создаём
      if (!map.has(item.client)) {
        map.set(item.client, {
          client: item.client,
          manager: item.manager,
          orders: [],
        });
      }

      const group = map.get(item.client)!;

      // Ищем, есть ли уже заказ в этой группе
      let order = group.orders.find((o) => o.order === item.order);

      if (!order) {
        // Если заказа ещё нет — добавляем
        order = { order: item.order, products: [] };
        group.orders.push(order);
      }

      // Добавляем продукт к заказу
      order.products.push({
        product: item.product,
        quantity: item.quantity,
      });
    }

    // Возвращаем массив сгруппированных данных
    return Array.from(map.values());
  }, [onDeliveryArr]); // пересчёт при изменении массива доставок
🔁 Возвращаем провайдер
tsx
Копіювати
Редагувати
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
📦 Этот компонент нужно обернуть вокруг других компонентов, чтобы они могли использовать контекст:

tsx
Копіювати
Редагувати
<DeliveryProvider>
  <App />
</DeliveryProvider>
🧲 Хук для использования контекста
tsx
Копіювати
Редагувати
export const useDelivery = () => {
  const ctx = useContext(DeliveryContext);

  // Безопасность: если провайдер не используется — бросаем ошибку
  if (!ctx) throw new Error("useDelivery must be used within DeliveryProvider");

  return ctx;
};
📌 Использование в компонентах:

tsx
Копіювати
Редагувати
const { onDeliveryArr, handleRowClick } = useDelivery();
📦 Что в итоге делает этот контекст?
Позволяет другим компонентам:

отслеживать список товаров на доставку

группировать по клиенту и заказу

открывать модалку по товару

подтверждать добавление товара с количеством

Работает через useContext + useState + useMemo

