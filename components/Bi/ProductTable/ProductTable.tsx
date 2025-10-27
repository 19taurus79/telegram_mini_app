import styles from "./ProductTable.module.css";
import { BiOrdersItem } from "@/types/types";

// --- КОМПОНЕНТ ТАБЛИЦІ (REUSABLE) ---
// Інтерфейс для пропсів компонента ProductTable
interface ProductTableProps {
  title: string; // Заголовок таблиці
  data: BiOrdersItem[]; // Масив даних для відображення в таблиці
  onRowClick?: (product: BiOrdersItem) => void; // Необов'язкова функція-обробник кліку по рядку
  selectedProduct?: BiOrdersItem | null; // Необов'язковий обраний продукт для підсвічування рядка
}

// Компонент для відображення таблиці продуктів
const ProductTable = ({
  title,
  data,
  onRowClick,
  selectedProduct,
}: ProductTableProps) => (
  <div className={styles.tableWrapper}>
    <h2 className={styles.title}>{title}</h2>
    {data && data.length > 0 ? ( // Перевірка, чи є дані для відображення
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={`${styles.th} ${styles.productColumn}`}>
              Номенклатура
            </th>
            <th className={`${styles.th} ${styles.qtyColumn}`}>Залишки</th>
            <th className={`${styles.th} ${styles.qtyColumn}`}>Потрібно</th>
            <th className={`${styles.th} ${styles.qtyColumn}`}>Не вистачає</th>
          </tr>
        </thead>
        <tbody>
          {data.map(
            (
              order // Ітерація по масиву даних для створення рядків таблиці
            ) => (
              <tr
                key={order.product} // Унікальний ключ для кожного рядка
                onClick={() => onRowClick?.(order)} // Обробник кліку по рядку
                className={
                  onRowClick // Визначення стилю рядка: підсвічений, якщо обраний, або звичайний
                    ? selectedProduct?.product === order.product
                      ? styles.selectedRow
                      : styles.row
                    : ""
                }
              >
                <td className={`${styles.td} ${styles.productColumn}`}>
                  {order.product}
                </td>
                <td className={`${styles.td} ${styles.qtyColumn}`}>
                  {order.qty_remain}
                </td>
                <td className={`${styles.td} ${styles.qtyColumn}`}>
                  {order.qty_needed}
                </td>
                <td className={`${styles.td} ${styles.qtyColumn}`}>
                  {order.qty_missing}
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    ) : (
      <p>Немає даних</p> // Повідомлення, якщо дані відсутні
    )}
  </div>
);

export default ProductTable;
