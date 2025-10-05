"use client";
import { getRemainsForBi } from "@/lib/api";
import { BiRemains } from "@/types/types";
import { useQuery } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  ColumnMeta, // Импортируем ColumnMeta
} from "@tanstack/react-table";
import styles from "./BiPage.module.css";

// Расширяем интерфейс для TypeScript
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    width?: string;
  }
}

type RowData = {
  product: string;
  buh: number;
  skl: number;
};

const columnHelper = createColumnHelper<RowData>();

// Определяем столбцы, используя meta
const columns = [
  columnHelper.accessor("product", {
    header: "Номенклатура",
    cell: (info) => info.getValue(),
    meta: {
      // Используем meta
      width: "60%",
    },
  }),
  columnHelper.accessor("buh", {
    header: "Бух",
    cell: (info) => info.getValue(),
    meta: {
      // Используем meta
      width: "20%",
    },
  }),
  columnHelper.accessor("skl", {
    header: "Склад",
    cell: (info) => info.getValue(),
    meta: {
      // Используем meta
      width: "20%",
    },
  }),
];

export default function BiPage() {
  const { data, isLoading, error } = useQuery<BiRemains>({
    queryKey: ["biDataRemains"],
    queryFn: getRemainsForBi,
  });

  const tableData = data?.remains_total ?? [];

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>BI Data</h1>
      {isLoading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      {tableData.length > 0 && (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={styles.th}
                      style={{ width: header.column.columnDef.meta?.width }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className={styles.td}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
