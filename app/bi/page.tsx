// Вказує, що цей файл є Клієнтським Компонентом в Next.js.
// Це необхідно, оскільки ми використовуємо хуки React (useState, useMemo, useQuery), які працюють лише на клієнті.
"use client";

// Імпорт хуків `useState` та `useMemo` з бібліотеки React.
// `useState` для створення та керування станом.
// `useMemo` для мемоізації (кешування) результатів обчислень.
import { useState, useMemo } from "react";

// Імпорт функції для отримання даних з нашого API.
import { dataForOrderByProduct } from "@/lib/api";

// Імпорт хука `useQuery` з бібліотеки TanStack Query (React Query).
// Використовується для запитів даних, їх кешування, синхронізації та оновлення.
import { useQuery } from "@tanstack/react-query";

// Імпорт модульних стилів для цього компонента.
import styles from "./BiPage.module.css";

// Імпорт типів `BiOrders` та `BiOrdersItem` для типізації даних, що надходять з API.
import { BiOrders, BiOrdersItem } from "@/types/types";

// Імпорт дочірніх компонентів, на які ми розділили сторінку.
import ProductTable from "@/components/Bi/ProductTable/ProductTable";
import StockDetails from "@/components/Bi/StockDetails/StockDetails";
import RecommendationsTable from "@/components/Bi/RecommendationsTable/RecommendationsTable";
import OrdersTable from "@/components/Bi/OrdersTable/OrdersTable";

// Визначення інтерфейсу для об'єкта рекомендації.
// Це допомагає забезпечити однакову структуру для кожної рекомендації.
interface Recommendation {
  product: string; // Назва продукту
  take_from_division: string; // Підрозділ, звідки рекомендується взяти товар
  take_from_warehouse: string; // Конкретний склад, звідки брати
  qty_to_take: number; // Кількість товару для переміщення
}

// --- ПРІОРИТЕТНІ ПІДРОЗДІЛИ ---
// Масив, що визначає пріоритет підрозділів при формуванні рекомендацій.
// Товари будуть братися в першу чергу зі складів цих підрозділів у вказаному порядку.
const priorityDivisions = [
  "Центральний офіс",
  "Київський підрозділ",
  "Полтавський підрозділ",
  "Лубенський підрозділ",
  "Дніпровський підрозділ",
  "Запорізький підрозділ",
];

// --- ГОЛОВНИЙ КОМПОНЕНТ СТОРІНКИ ---
export default function BiPage() {
  // Створення стану `selectedProduct` для зберігання інформації про продукт,
  // який користувач вибрав у таблиці. Початкове значення - `null`.
  // `setSelectedProduct` - функція для оновлення цього стану.
  const [selectedProduct, setSelectedProduct] = useState<BiOrdersItem | null>(
    null
  );

  // Виконання запиту до API за допомогою `useQuery`.
  const { data, isLoading, error } = useQuery<BiOrders, Error>({
    // `queryKey`: унікальний ключ для цього запиту. React Query використовує його для кешування.
    queryKey: ["biOrders"],
    // `queryFn`: асинхронна функція, яка виконує запит і повертає дані.
    queryFn: dataForOrderByProduct,
  });

  // Обчислення рекомендацій за допомогою хука `useMemo`.
  // Код всередині `useMemo` буде виконуватися повторно тільки тоді, коли зміниться залежність `[data]`.
  // Це запобігає зайвим обчисленням при кожному рендері компонента.
  const recommendations = useMemo(() => {
    const newRecommendations: Recommendation[] = []; // Ініціалізація масиву для зберігання рекомендацій.

    // Якщо дані ще не завантажені або відсутній масив `missing_but_available`, повертаємо порожній масив.
    if (!data?.missing_but_available) {
      return newRecommendations;
    }

    // Ітерація по кожному продукту, якого не вистачає, але він є на інших складах.
    for (const product of data.missing_but_available) {
      let needed = product.qty_missing; // Кількість, яку потрібно знайти.
      if (needed <= 0) continue; // Якщо потреба нульова або від'ємна, переходимо до наступного продукту.

      // Створення `Set` з пріоритетних підрозділів для швидкої перевірки (O(1) замість O(n) для indexOf).
      const prioritySet = new Set(priorityDivisions);
      const priorityStock: typeof product.available_stock = []; // Масив для складів з пріоритетних підрозділів.
      const otherStock: typeof product.available_stock = []; // Масив для всіх інших складів.

      // Розподіл наявних залишків на пріоритетні та інші.
      for (const stock of product.available_stock) {
        if (prioritySet.has(stock.division)) {
          priorityStock.push(stock);
        } else {
          otherStock.push(stock);
        }
      }

      // Сортування пріоритетних складів згідно з порядком у масиві `priorityDivisions`.
      priorityStock.sort(
        (a, b) =>
          priorityDivisions.indexOf(a.division) -
          priorityDivisions.indexOf(b.division)
      );

      // 1. Перший прохід: ітерація по пріоритетних складах.
      for (const stock of priorityStock) {
        if (needed <= 0) break; // Якщо потреба повністю закрита, виходимо з циклу.
        if (stock.available > 0) {
          const canTake = Math.min(needed, stock.available); // Визначаємо, скільки можна взяти (не більше, ніж є на складі, і не більше, ніж потрібно).
          newRecommendations.push({
            product: product.product,
            take_from_division: stock.division,
            take_from_warehouse: stock.warehouse,
            qty_to_take: canTake,
          });
          needed -= canTake; // Зменшуємо кількість, яку ще потрібно знайти.
        }
      }

      // 2. Другий прохід: якщо після пріоритетних складів потреба ще не закрита.
      if (needed > 0) {
        // Сортуємо решту складів за алфавітом (спочатку за підрозділом, потім за складом).
        otherStock.sort((a, b) => {
          if (a.division !== b.division) {
            return a.division.localeCompare(b.division);
          }
          return a.warehouse.localeCompare(b.warehouse);
        });

        // Ітерація по відсортованих інших складах.
        for (const stock of otherStock) {
          if (needed <= 0) break;
          if (stock.available > 0) {
            const canTake = Math.min(needed, stock.available);
            newRecommendations.push({
              product: product.product,
              take_from_division: stock.division,
              take_from_warehouse: stock.warehouse,
              qty_to_take: canTake,
            });
            needed -= canTake;
          }
        }
      }
    }
    return newRecommendations; // Повертаємо фінальний масив рекомендацій.
  }, [data]);

  // Якщо дані ще завантажуються, показуємо повідомлення про завантаження.
  if (isLoading) {
    return <p>Loading...</p>;
  }

  // Якщо під час завантаження сталася помилка, показуємо повідомлення про помилку.
  if (error) {
    return <p>Error: {error.message}</p>;
  }

  // Основна JSX-розмітка сторінки.
  return (
    <div className={styles.pageContainer}>
      <h1>BI Data</h1>
      {/* Рендеримо контент тільки тоді, коли дані (`data`) успішно завантажені. */}
      {data && (
        <>
          <div className={styles.topContainer}>
            <div className={styles.mainTableContainer}>
              {/* Перша таблиця: товари, яких не вистачає, але вони є на інших складах. */}
              <ProductTable
                title="Потрібно замовити (є на складах)"
                data={data.missing_but_available}
                onRowClick={setSelectedProduct} // Передаємо функцію для оновлення стану при кліку на рядок.
                selectedProduct={selectedProduct} // Передаємо вибраний продукт для підсвічування.
              />
            </div>
            {/* Компонент, що показує деталізацію по складах для вибраного продукту. */}
            <div className={styles.stockDetailsContainer}>
              <StockDetails selectedProduct={selectedProduct} />
            </div>
            <div className={styles.ordersContainer}>
              <OrdersTable
                orders={selectedProduct ? selectedProduct.orders : []}
              />
            </div>
          </div>

          <div className={styles.bottomContainer}>
            {/* Друга таблиця: товари, яких не вистачає і їх немає на жодному складі. */}
            <ProductTable
              title="Не вистачає під заявки (немає на складах)"
              data={data.missing_and_unavailable}
              // `onRowClick` не передається, тому рядки в цій таблиці не будуть клікабельними.
            />
          </div>

          <div className={styles.bottomContainer}>
            {/* Третя таблиця: згенеровані рекомендації по переміщенню товарів. */}
            <RecommendationsTable recommendations={recommendations} />
          </div>
        </>
      )}
    </div>
  );
}
