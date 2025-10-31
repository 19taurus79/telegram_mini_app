"use client";
import css from "./StockDetails.module.css";
import { BiOrdersItem } from "@/types/types";
import toast from "react-hot-toast"; // Import toast
// import OrdersTable from "../OrdersTable/OrdersTable"; // Импорт нового компонента

interface StockDetailsProps {
  selectedProduct: BiOrdersItem | null;
}

const StockDetails = ({ selectedProduct }: StockDetailsProps) => {
  const handleCopy = (warehouse: string) => {
    navigator.clipboard.writeText(warehouse).then(
      () => {
        toast.success('Склад скопійовано!'); // Show success toast
      },
      (err) => {
        toast.error('Не вдалося скопіювати склад.'); // Show error toast
        console.error("Could not copy text: ", err);
      }
    );
  };

  return (
    <div className={css.detailsContainer}>
      <h2 className={css.title}>Вільні залишки на складах</h2>
      {selectedProduct ? (
        <>
          <table className={css.table}>
            <thead>
              <tr>
                <th className={`${css.th} ${css.divisionColumn}`}>Підрозділ</th>
                <th className={`${css.th} ${css.divisionColumn}`}>Склад</th>
                <th className={`${css.th} ${css.availableColumn}`}>
                  Доступно
                </th>
              </tr>
            </thead>
            <tbody>
              {selectedProduct.available_stock.map((stock) => (
                <tr
                  key={`${stock.division}-${stock.warehouse}`}
                  onClick={() => handleCopy(stock.warehouse)}
                  className={css.copyableRow}
                >
                  <td className={`${css.td} ${css.divisionColumn}`} title={stock.division}>
                    {stock.division}
                  </td>
                  <td className={`${css.td} ${css.divisionColumn}`} title={stock.warehouse}>
                    {stock.warehouse}
                  </td>
                  <td className={`${css.td} ${css.availableColumn}`} title={stock.available.toString()}>
                    {stock.available}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* <div style={{ marginTop: '20px' }}>
          <OrdersTable orders={selectedProduct.orders} />
        </div> */}
        </>
      ) : (
        <div className={css.placeholder}>
          <p>Оберіть номенклатуру для відображення деталізації</p>
        </div>
      )}
    </div>
  );
};

export default StockDetails;
