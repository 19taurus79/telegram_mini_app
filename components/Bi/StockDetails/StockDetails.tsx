import styles from "./StockDetails.module.css";
import { BiOrdersItem } from "@/types/types";

interface StockDetailsProps {
  selectedProduct: BiOrdersItem | null;
}

const StockDetails = ({ selectedProduct }: StockDetailsProps) => (
  <div className={styles.detailsContainer}>
    <h2 className={styles.title}>Вільні залишки на складах</h2>
    {selectedProduct ? (
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={`${styles.th} ${styles.divisionColumn}`}>
              Підрозділ
            </th>
            <th className={`${styles.th} ${styles.divisionColumn}`}>Склад</th>
            <th className={`${styles.th} ${styles.availableColumn}`}>
              Доступно
            </th>
          </tr>
        </thead>
        <tbody>
          {selectedProduct.available_stock.map((stock) => (
            <tr key={`${stock.division}-${stock.warehouse}`}>
              <td className={`${styles.td} ${styles.divisionColumn}`}>
                {stock.division}
              </td>
              <td className={`${styles.td} ${styles.divisionColumn}`}>
                {stock.warehouse}
              </td>
              <td className={`${styles.td} ${styles.availableColumn}`}>
                {stock.available}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <div className={styles.placeholder}>
        <p>Оберіть номенклатуру для відображення деталізації</p>
      </div>
    )}
  </div>
);

export default StockDetails;
