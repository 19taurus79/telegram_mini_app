"use client";
import styles from "./RecommendationsTable.module.css";
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  flexRender,
} from '@tanstack/react-table';

// Інтерфейс для об'єкта рекомендації
interface Recommendation {
  product: string; // Назва продукту
  take_from_division: string; // Підрозділ, з якого потрібно взяти товар
  take_from_warehouse: string; // Склад, з якого потрібно взяти товар
  qty_to_take: number; // Кількість товару, яку потрібно взяти
}

interface RecommendationsTableProps {
  recommendations: Recommendation[];
  hideTitle?: boolean;
}

const RecommendationsTable = ({
  recommendations,
  hideTitle = false,
}: RecommendationsTableProps) => {
  const columns: ColumnDef<Recommendation>[] = [
    {
      accessorKey: 'product',
      header: 'Номенклатура',
      minSize: 150,
      size: 300,
    },
    {
      accessorKey: 'take_from_division',
      header: 'Підрозділ',
      minSize: 100,
      size: 150,
    },
    {
      accessorKey: 'take_from_warehouse',
      header: 'Склад',
      minSize: 100,
      size: 250,
    },
    {
      accessorKey: 'qty_to_take',
      header: 'Кількість',
      minSize: 80,
      size: 100,
    },
  ];

  const table = useReactTable({
    data: recommendations,
    columns,
    getCoreRowModel: getCoreRowModel(),
    defaultColumn: {
      minSize: 50,
    },
  });

  return (
    <div className={styles.tableWrapper}>
      {!hideTitle && <h2 className={styles.title}>Рекомендації</h2>}
      {recommendations.length > 0 ? (
        <table className={styles.table}>
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className={styles.th}
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    <div
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      className={`${styles.resizer} ${
                        header.column.getIsResizing() ? styles.isResizing : ''
                      }`}
                    />
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    className={styles.td}
                    style={{ width: cell.column.getSize() }}
                    title={String(cell.getValue())}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Немає рекомендацій</p>
      )}
    </div>
  );
};

export default RecommendationsTable;
