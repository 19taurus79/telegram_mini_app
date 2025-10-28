import css from "./StockDetails.module.css";
import { BiOrdersItem } from "@/types/types";
// import OrdersTable from "../OrdersTable/OrdersTable"; // Импорт нового компонента

interface StockDetailsProps {
  selectedProduct: BiOrdersItem | null;
}

const StockDetails = ({ selectedProduct }: StockDetailsProps) => (
  <div className={css.detailsContainer}>
    <h2 className={css.title}>Вільні залишки на складах</h2>
    {selectedProduct ? (
      <>
        <table className={css.table}>
          <thead>
            <tr>
              <th className={`${css.th} ${css.divisionColumn}`}>Підрозділ</th>
              <th className={`${css.th} ${css.divisionColumn}`}>Склад</th>
              <th className={`${css.th} ${css.availableColumn}`}>Доступно</th>
            </tr>
          </thead>
          <tbody>
            {selectedProduct.available_stock.map((stock) => (
              <tr key={`${stock.division}-${stock.warehouse}`}>
                <td className={`${css.td} ${css.divisionColumn}`}>
                  {stock.division}
                </td>
                <td className={`${css.td} ${css.divisionColumn}`}>
                  {stock.warehouse}
                </td>
                <td className={`${css.td} ${css.availableColumn}`}>
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

export default StockDetails;
