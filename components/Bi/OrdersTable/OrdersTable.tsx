"use client";
import css from "./OrdersTable.module.css";
import { BiOrdersItem } from "@/types/types";
import toast from "react-hot-toast"; // Import toast

// Интерфейс для пропсов компонента
interface OrdersTableProps {
  orders: BiOrdersItem["orders"]; // Массив заказов
}

// Компонент для отображения таблицы заказов
const OrdersTable = ({ orders }: OrdersTableProps) => {
  const handleCopy = (contract: string, qty: number) => {
    const textToCopy = `${contract}-${qty}`;
    navigator.clipboard.writeText(textToCopy).then(
      () => {
        toast.success(`Скопійовано: ${textToCopy}`);
      },
      (err) => {
        toast.error('Не вдалося скопіювати.');
        console.error("Could not copy text: ", err);
      }
    );
  };

  return (
    <div className={css.tableWrapper}>
      <h2 className={css.title}>Деталізація по заказах</h2>
      {orders && orders.length > 0 ? (
        <table className={css.table}>
          <thead>
            <tr>
              <th className={css.th}>Менеджер</th>
              <th className={css.th}>Контрагент</th>
              <th className={css.th}>Доповнення</th>
              <th className={css.th}>Період</th>
              <th className={css.th}>Статус</th>
              <th className={css.th}>До постачання</th>
              <th className={css.th}>Кількість</th>
              <th className={css.th}>Переміщено</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, index) => (
              <tr
                key={index}
                className={`${css.row} ${css.copyableRow}`}
                onClick={() => handleCopy(order.contract_supplement, order.qty)}
              >
                <td className={css.td} title={order.manager}>{order.manager}</td>
                <td className={css.td} title={order.client}>{order.client}</td>
                <td className={css.td} title={order.contract_supplement}>{order.contract_supplement}</td>
                <td className={css.td} title={order.period}>{order.period}</td>
                <td className={css.td} title={order.document_status}>{order.document_status}</td>
                <td className={css.td} title={order.delivery_status}>{order.delivery_status}</td>
                <td className={css.td} title={order.qty.toString()}>{order.qty}</td>
                <td className={css.td} title={order.moved_qty.toString()}>{order.moved_qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Данні відсутні.</p>
      )}
    </div>
  );
};

export default OrdersTable;
