import css from "./ProductTable.module.css";
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
  <div className={css.tableWrapper}>
    <h2 className={css.title}>{title}</h2>
    {data && data.length > 0 ? ( // Перевірка, чи є дані для відображення
      <table className={css.table}>
        <thead>
          <tr>
            <th className={`${css.th} ${css.productColumn}`}>Номенклатура</th>
            <th className={`${css.th} ${css.qtyColumn}`}>Залишки</th>
            <th className={`${css.th} ${css.qtyColumn}`}>Потрібно</th>
            <th className={`${css.th} ${css.qtyColumn}`}>Не вистачає</th>
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
                      ? css.selectedRow
                      : css.row
                    : ""
                }
              >
                <td className={`${css.td} ${css.productColumn}`}>
                  {order.product}
                </td>
                <td className={`${css.td} ${css.qtyColumn}`}>
                  {order.qty_remain}
                </td>
                <td className={`${css.td} ${css.qtyColumn}`}>
                  {order.qty_needed}
                </td>
                <td className={`${css.td} ${css.qtyColumn}`}>
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
