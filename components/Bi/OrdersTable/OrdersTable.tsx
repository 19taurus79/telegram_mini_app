"use client";
import css from "./OrdersTable.module.css";
import { BiOrdersItem } from "@/types/types";
import toast from "react-hot-toast";
import { useState, useEffect } from "react";
import OrderCommentBadge from "@/components/Orders/OrderCommentBadge/OrderCommentBadge";
import OrderCommentModal from "@/components/Orders/OrderCommentModal/OrderCommentModal";
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  flexRender,
} from '@tanstack/react-table';

interface OrdersTableProps {
  orders: BiOrdersItem["orders"];
  productName?: string;
}

const OrdersTable = ({ orders, productName }: OrdersTableProps) => {
  const [isMobile, setIsMobile] = useState(false);
  const [commentModalData, setCommentModalData] = useState<{
    orderRef: string;
    productId?: string;
    productName?: string;
  } | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const columns: ColumnDef<BiOrdersItem["orders"][0]>[] = [
    {
      accessorKey: 'manager',
      header: 'Менеджер',
      size: 150,
      minSize: 80,
    },
    {
      accessorKey: 'client',
      header: 'Контрагент',
      size: 200,
      minSize: 100,
    },
    {
      accessorKey: 'contract_supplement',
      header: 'Доповнення',
      size: 150,
      minSize: 100,
    },
    {
      accessorKey: 'period',
      header: 'Період',
      size: 100,
      minSize: 80,
    },
    {
      accessorKey: 'document_status',
      header: 'Статус',
      size: 120,
      minSize: 80,
    },
    {
      accessorKey: 'delivery_status',
      header: 'До постачання',
      size: 140,
      minSize: 100,
    },
    {
      accessorKey: 'qty',
      header: 'Кількість',
      size: 100,
      minSize: 60,
    },
    {
      accessorKey: 'moved_qty',
      header: 'Переміщено',
      size: 100,
      minSize: 60,
    },
    {
      id: 'actions',
      header: '💬',
      size: 60,
      minSize: 60,
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div 
            className={css.commentCell}
            onClick={(e) => {
              e.stopPropagation();
              setCommentModalData({ 
                orderRef: order.contract_supplement,
                productId: productName,
                productName: productName
              });
            }}
          >
            <OrderCommentBadge
              orderRef={order.contract_supplement}
              productName={productName}
              onClick={() => {}}
              onCommentCountChange={(count) => {
                setCommentCounts(prev => ({
                  ...prev,
                  [order.contract_supplement]: count
                }));
              }}
            />
          </div>
        );
      }
    }
  ];

  const table = useReactTable({
    data: orders || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    defaultColumn: {
      minSize: 50,
    },
  });

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
        <>
          {isMobile ? (
            <div className={css.mobileList}>
              {orders.map((order, index) => (
                <div
                  key={index}
                  className={`${css.mobileCard} ${commentCounts[order.contract_supplement] > 0 ? css.hasComments : ''}`}
                  onClick={() => handleCopy(order.contract_supplement, order.qty)}
                >
                  <div className={css.cardHeader}>
                    <div className={css.clientName}>{order.client}</div>
                    <div className={css.contractInfo}>{order.contract_supplement}</div>
                    <div 
                      className={css.commentBadgeWrapper}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCommentModalData({ 
                          orderRef: order.contract_supplement,
                          productId: productName,  // В BI використовуємо назву як ID
                          productName: productName
                        });
                      }}
                    >
                      <OrderCommentBadge
                        orderRef={order.contract_supplement}
                        productName={productName}
                        onClick={() => {}}
                        onCommentCountChange={(count) => {
                          setCommentCounts(prev => ({
                            ...prev,
                            [order.contract_supplement]: count
                          }));
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className={css.cardGrid}>
                    <div className={css.gridItem}>
                      <span className={css.label}>Менеджер</span>
                      <span className={css.value}>{order.manager}</span>
                    </div>
                    <div className={css.gridItem}>
                      <span className={css.label}>Період</span>
                      <span className={css.value}>{order.period}</span>
                    </div>
                    <div className={css.gridItem}>
                      <span className={css.label}>Статус</span>
                      <span className={css.value}>{order.document_status}</span>
                    </div>
                    <div className={css.gridItem}>
                      <span className={css.label}>До постачання</span>
                      <span className={css.value}>{order.delivery_status}</span>
                    </div>
                    <div className={css.gridItem}>
                      <span className={css.label}>Кількість</span>
                      <span className={`${css.value} ${css.qtyValue}`}>{order.qty}</span>
                    </div>
                    <div className={css.gridItem}>
                      <span className={css.label}>Переміщено</span>
                      <span className={css.value}>{order.moved_qty}</span>
                    </div>
                  </div>
                  
                  <div className={css.copyHint}>Натисніть для копіювання</div>
                </div>
              ))}
            </div>
          ) : (
            <table className={css.table}>
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        className={css.th}
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
                {table.getRowModel().rows.map(row => {
                  const order = row.original;
                  return (
                    <tr
                      key={row.id}
                      className={`${css.row} ${css.copyableRow} ${commentCounts[order.contract_supplement] > 0 ? css.hasComments : ''}`}
                      onClick={() => handleCopy(order.contract_supplement, order.qty)}
                    >
                      {row.getVisibleCells().map(cell => (
                        <td
                          key={cell.id}
                          className={css.td}
                          style={{ 
                            width: cell.column.getSize(),
                            textAlign: cell.column.id === 'actions' ? 'center' : 'left' 
                          }}
                          title={cell.column.id !== 'actions' ? String(cell.getValue()) : ''}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </>
      ) : (
        <p>Дані відсутні.</p>
      )}

      {commentModalData && (
        <OrderCommentModal
          orderRef={commentModalData.orderRef}
          commentType={commentModalData.productId ? "product" : "order"}
          productId={commentModalData.productId}
          productName={commentModalData.productName}
          onClose={() => setCommentModalData(null)}
          readOnly={true}
        />
      )}
    </div>
  );
};

export default OrdersTable;
