"use client";
import css from "./StockDetails.module.css";
import { BiOrdersItem } from "@/types/types";
import toast from "react-hot-toast";
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  flexRender,
} from '@tanstack/react-table';

interface StockDetailsProps {
  selectedProduct: BiOrdersItem | null;
}

const StockDetails = ({ selectedProduct }: StockDetailsProps) => {
  const columns: ColumnDef<AvailableStock>[] = [
    {
      accessorKey: 'division',
      header: 'Підрозділ',
      size: 120, // smaller initial size
    },
    {
      accessorKey: 'warehouse',
      header: 'Склад',
      size: 300, // larger initial size, will take up remaining space
    },
    {
      accessorKey: 'available',
      header: 'Доступно',
      cell: info => Number(info.getValue()).toFixed(2),
      size: 100, // smaller initial size
    },
  ];

  const table = useReactTable({
    data: selectedProduct?.available_stock || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    defaultColumn: {
      minSize: 50,
    }
  });

  const handleCopy = (warehouse: string) => {
    navigator.clipboard.writeText(warehouse).then(
      () => {
        toast.success('Склад скопійовано!');
      },
      (err) => {
        toast.error('Не вдалося скопіювати склад.');
        console.error("Could not copy text: ", err);
      }
    );
  };

  return (
    <div className={css.detailsContainer}>
      <h2 className={css.title}>Вільні залишки на складах</h2>
      {selectedProduct ? (
        <div className={css.tableContainer}>
            <table 
              className={css.table}
              style={{ width: '100%' }}
            >
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        className={`${css.th}`}
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
                          className={`${css.resizer} ${
                            header.column.getIsResizing() ? css.isResizing : ''
                          }`}
                        />
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map(row => (
                  <tr 
                    key={row.id}
                    onClick={() => handleCopy(row.original.warehouse)}
                    className={css.copyableRow}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td 
                        key={cell.id}
                        className={css.td}
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
            </div>
      ) : (
        <div className={css.placeholder}>
          <p>Оберіть номенклатуру для відображення деталізації</p>
        </div>
      )}
    </div>
  );
};

export default StockDetails;
