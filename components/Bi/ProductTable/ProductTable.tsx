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
}: ProductTableProps) => {
  const sortedData = data
    ? [...data].sort((a, b) => {
        const lineA = a.line_of_business || "";
        const lineB = b.line_of_business || "";
        // Сначала сортируем по line_of_bussines
        const lineCompare = lineA.localeCompare(lineB);
        if (lineCompare !== 0) {
          return lineCompare;
        }
        // Если line_of_bussines равны, сортируем по product
        const productA = a.product || "";
        const productB = b.product || "";
        return productA.localeCompare(productB);
      })
    : [];

  const groupedData = sortedData.reduce<Record<string, BiOrdersItem[]>>(
    (acc, order) => {
      const group = order.line_of_business || "Інше";
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(order);
      return acc;
    },
    {}
  );

  return (
    <div className={css.tableWrapper}>
      <h2 className={css.title}>{title}</h2>
      {sortedData && sortedData.length > 0 ? (
        Object.entries(groupedData).map(([group, orders]) => (
          <div key={group}>
            <h3 className={css.groupTitle}>{group}</h3>
            <table className={css.table}>
              <thead>
                <tr>
                  <th className={`${css.th} ${css.productColumn}`}>
                    Номенклатура
                  </th>
                  <th className={`${css.th} ${css.qtyColumn}`}>Залишки</th>
                  <th className={`${css.th} ${css.qtyColumn}`}>Потрібно</th>
                  <th className={`${css.th} ${css.qtyColumn}`}>Не вистачає</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.product} // Унікальний ключ для кожного рядка
                    onClick={() => {
                      console.log("Row clicked:", order.product); // Debug log
                      onRowClick?.(order);
                    }}
                    className={
                      onRowClick // Визначення стилю рядка: підсвічений, якщо обраний, або звичайний
                        ? selectedProduct?.product === order.product
                          ? css.selectedRow
                          : css.row
                        : ""
                    }
                  >
                    <td
                      className={`${css.td} ${css.productColumn}`}
                      title={order.product}
                    >
                      {order.product}
                    </td>
                    <td
                      className={`${css.td} ${css.qtyColumn}`}
                      title={order.qty_remain.toString()}
                    >
                      {order.qty_remain.toFixed(2)}
                    </td>
                    <td
                      className={`${css.td} ${css.qtyColumn}`}
                      title={order.qty_needed.toString()}
                    >
                      {order.qty_needed.toFixed(2)}
                    </td>
                    <td
                      className={`${css.td} ${css.qtyColumn}`}
                      title={order.qty_missing.toString()}
                    >
                      {order.qty_missing.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      ) : (
        <p>Немає даних</p> // Повідомлення, якщо дані відсутні
      )}
    </div>
  );
};

export default ProductTable;
