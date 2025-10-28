import css from "./OrdersTable.module.css";
import { BiOrdersItem } from "@/types/types";

// Интерфейс для пропсов компонента
interface OrdersTableProps {
  orders: BiOrdersItem["orders"]; // Массив заказов
}

// Компонент для отображения таблицы заказов
const OrdersTable = ({ orders }: OrdersTableProps) => (
  <div className={css.tableWrapper}>
    <h2 className={css.title}>Детализация по заказам</h2>
    {orders && orders.length > 0 ? (
      <table className={css.table}>
        <thead>
          <tr>
            <th className={css.th}>Менеджер</th>
            <th className={css.th}>Клиент</th>
            <th className={css.th}>Договор</th>
            <th className={css.th}>Период</th>
            <th className={css.th}>Статус</th>
            <th className={css.th}>Кол-во</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, index) => (
            <tr key={index} className={css.row}>
              <td className={css.td}>{order.manager}</td>
              <td className={css.td}>{order.client}</td>
              <td className={css.td}>{order.contract_supplement}</td>
              <td className={css.td}>{order.period}</td>
              <td className={css.td}>{order.document_status}</td>
              <td className={css.td}>{order.qty}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <p>Нет данных по заказам</p>
    )}
  </div>
);

export default OrdersTable;
