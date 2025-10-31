import styles from "./RecommendationsTable.module.css";

// Інтерфейс для об'єкта рекомендації
interface Recommendation {
  product: string; // Назва продукту
  take_from_division: string; // Підрозділ, з якого потрібно взяти товар
  take_from_warehouse: string; // Склад, з якого потрібно взяти товар
  qty_to_take: number; // Кількість товару, яку потрібно взяти
}

interface RecommendationsTableProps {
  recommendations: Recommendation[];
}

const RecommendationsTable = ({
  recommendations,
}: RecommendationsTableProps) => (
  <div className={styles.tableWrapper}>
    <h2 className={styles.title}>Рекомендації</h2>
    {recommendations.length > 0 ? (
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Номенклатура</th>
            <th className={styles.th}>Підрозділ</th>
            <th className={styles.th}>Склад</th>
            <th className={styles.th}>Кількість</th>
          </tr>
        </thead>
        <tbody>
          {recommendations.map((rec, index) => (
            <tr
              key={`${rec.product}-${rec.take_from_division}-${rec.take_from_warehouse}-${index}`}
            >
              <td className={styles.td} title={rec.product}>{rec.product}</td>
              <td className={styles.td} title={rec.take_from_division}>{rec.take_from_division}</td>
              <td className={styles.td} title={rec.take_from_warehouse}>{rec.take_from_warehouse}</td>
              <td className={styles.td} title={rec.qty_to_take.toString()}>{rec.qty_to_take}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <p>Немає рекомендацій</p>
    )}
  </div>
);

export default RecommendationsTable;
