import css from "./ProductTable.module.css";
import { BiOrdersItem } from "@/types/types";
import useSwipe from "@/hooks/useSwipe";
import { useState, useEffect, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  flexRender,
} from '@tanstack/react-table';

// --- КОМПОНЕНТ ТАБЛИЦІ (REUSABLE) ---
interface ProductTableProps {
  title: string;
  data: BiOrdersItem[];
  onRowClick?: (product: BiOrdersItem) => void;
  onSwipeLeft?: (product: BiOrdersItem) => void;
  onSwipeRight?: (product: BiOrdersItem) => void;
  selectedProduct?: BiOrdersItem | null;
  hideTitle?: boolean;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onClick?: () => void;
  isSelected: boolean;
  hasStock?: boolean; // Whether product has available stock
  isGreen?: boolean;
}

// Helper component for Swipeable Row
const SwipeableRow = ({ children, onSwipeLeft, onSwipeRight, onClick, isSelected, hasStock = true, isGreen = false }: SwipeableRowProps) => {
  const swipeHandlers = useSwipe({
    onSwipedLeft: hasStock ? onSwipeLeft : undefined,
    onSwipedRight: onSwipeRight,
  });

  return (
    <div 
      {...swipeHandlers} 
      onClick={onClick}
      className={`${css.mobileCard} ${isSelected ? css.selectedCard : ''} ${hasStock ? css.hasStockCard : css.noStockCard}`}
      style={isGreen ? { 
        borderLeft: '4px solid #4ade80', 
        background: isSelected ? 'rgba(74, 222, 128, 0.15)' : 'rgba(74, 222, 128, 0.05)' 
      } : {}}
    >
      {children}
      <div className={css.swipeHint}>
        <div className={css.swipeRightHint}>
          <span>Замовлення</span>
          <span className={css.swipeArrow}>»»</span>
        </div>
        {hasStock && (
          <div className={css.swipeLeftHint}>
            <span className={css.swipeArrow}>««</span>
            <span>Склад</span>
          </div>
        )}
      </div>
    </div>
  );
};

// --- КОМПОНЕНТ ДЛЯ ДЕСКТОПНОЇ ТАБЛИЦІ З РЕСАЙЗОМ ---
interface ProductDesktopTableGroupProps {
  orders: BiOrdersItem[];
  onRowClick?: (product: BiOrdersItem) => void;
  selectedProduct?: BiOrdersItem | null;
  showSelectedDetails?: boolean;
}

const ProductDesktopTableGroup = ({ orders, onRowClick, selectedProduct, showSelectedDetails = false }: ProductDesktopTableGroupProps) => {
  const columns = useMemo<ColumnDef<BiOrdersItem>[]>(
    () => {
      if (showSelectedDetails) {
        return [
          {
            accessorKey: 'product',
            header: 'Номенклатура',
            size: 240,
            minSize: 150,
          },
          {
            accessorKey: 'qty_remain',
            header: 'Залишки (Бух / Скл)',
            size: 150,
            minSize: 100,
            cell: info => {
              const row = info.row.original;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 600 }}>{row.qty_remain.toFixed(2)}</span>
                  <span style={{ opacity: 0.3 }}>/</span>
                  <span style={{ opacity: 0.6 }}>{(row.qty_remain_skl || 0).toFixed(2)}</span>
                </div>
              );
            }
          },
          {
            id: 'qty_needed_combined',
            header: 'Потрібно (Доп / Все)',
            size: 160,
            minSize: 100,
            cell: info => {
              const row = info.row.original;
              const sel = row.qty_needed_selected || 0;
              const tot = row.qty_needed_total || 0;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--accent-green)' }}>{sel.toFixed(2)}</span>
                  <span style={{ opacity: 0.3 }}>/</span>
                  <span style={{ opacity: 0.6 }}>{tot.toFixed(2)}</span>
                </div>
              );
            }
          },
          {
            id: 'qty_missing_combined',
            header: 'Дефіцит (Доп / Все)',
            size: 160,
            minSize: 100,
            cell: info => {
              const row = info.row.original;
              const sel = row.qty_missing_selected || 0;
              const tot = row.qty_missing_total || 0;
              const isSelZero = sel <= 0;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ 
                    fontWeight: 600, 
                    color: isSelZero ? '#4ade80' : '#ef4444' 
                  }}>
                    {sel.toFixed(2)}
                  </span>
                  <span style={{ opacity: 0.3 }}>/</span>
                  <span style={{ opacity: 0.6 }}>{tot.toFixed(2)}</span>
                </div>
              );
            }
          },
        ];
      }
      return [
        {
          accessorKey: 'product',
          header: 'Номенклатура',
          size: 300,
          minSize: 150,
        },
        {
          accessorKey: 'qty_remain',
          header: 'Залишки',
          size: 100,
          minSize: 60,
          cell: info => Number(info.getValue()).toFixed(2),
        },
        {
          accessorKey: 'qty_needed',
          header: 'Потрібно',
          size: 100,
          minSize: 60,
          cell: info => Number(info.getValue()).toFixed(2),
        },
        {
          accessorKey: 'qty_missing',
          header: 'Не вистачає',
          size: 100,
          minSize: 60,
          cell: info => Number(info.getValue()).toFixed(2),
        },
      ];
    },
    [showSelectedDetails]
  );

  const table = useReactTable({
    data: orders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    defaultColumn: {
      minSize: 50,
    },
  });

  return (
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
          const isSelected = onRowClick ? selectedProduct?.product === order.product : false;
          const isGreen = showSelectedDetails
            ? (order.qty_missing_selected !== undefined ? order.qty_missing_selected <= 0 : order.qty_missing <= 0)
            : order.qty_missing <= 0;
          const rowStyle: React.CSSProperties = isGreen 
            ? { 
                background: isSelected ? 'rgba(74, 222, 128, 0.25)' : 'rgba(74, 222, 128, 0.1)',
                color: '#4ade80',
                fontWeight: 600
              }
            : {};
          return (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(order)}
              className={onRowClick ? (isSelected ? css.selectedRow : css.row) : ""}
              style={rowStyle}
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
          );
        })}
      </tbody>
    </table>
  );
};

const ProductTable = ({
  title,
  data,
  onRowClick,
  onSwipeLeft,
  onSwipeRight,
  selectedProduct,
  hideTitle = false,
}: ProductTableProps) => {
  const [isMobile, setIsMobile] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const showSelectedDetails = useMemo(() => {
    return data ? data.some(item => item.qty_needed_selected !== undefined) : false;
  }, [data]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(group)) {
        newSet.delete(group);
      } else {
        newSet.add(group);
      }
      return newSet;
    });
  };

  const sortedData = data
    ? [...data].sort((a, b) => {
        const lineA = a.line_of_business || "";
        const lineB = b.line_of_business || "";
        const lineCompare = lineA.localeCompare(lineB);
        if (lineCompare !== 0) return lineCompare;
        const productA = a.product || "";
        const productB = b.product || "";
        return productA.localeCompare(productB);
      })
    : [];

  const groupedData = sortedData.reduce<Record<string, BiOrdersItem[]>>(
    (acc, order) => {
      const group = order.line_of_business || "Інше";
      if (!acc[group]) acc[group] = [];
      acc[group].push(order);
      return acc;
    },
    {}
  );

  return (
    <div className={css.tableWrapper}>
      {!hideTitle && <h2 className={css.title}>{title}</h2>}
      {sortedData && sortedData.length > 0 ? (
        Object.entries(groupedData).map(([group, orders]) => {
          const isExpanded = expandedGroups.has(group);
          return (
            <div key={group} className={css.groupContainer}>
              <h3 
                className={css.groupTitle} 
                onClick={() => toggleGroup(group)}
              >
                <span className={css.groupToggle}>{isExpanded ? '▼' : '▶'}</span>
                {group}
                <span className={css.groupCount}>({orders.length})</span>
              </h3>
              {isExpanded && (
                <>
                  {isMobile ? (
                    <div className={css.mobileList}>
                      {orders.map((order) => {
                        const isGreen = showSelectedDetails
                          ? (order.qty_missing_selected !== undefined ? order.qty_missing_selected <= 0 : order.qty_missing <= 0)
                          : order.qty_missing <= 0;
                        return (
                          <SwipeableRow
                            key={order.product}
                            onSwipeLeft={() => onSwipeLeft?.(order)}
                            onSwipeRight={() => onSwipeRight?.(order)}
                            onClick={() => onRowClick?.(order)}
                            isSelected={selectedProduct?.product === order.product}
                            hasStock={order.available_stock && order.available_stock.length > 0}
                            isGreen={isGreen}
                          >
                            <div className={css.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                              <span className={css.productName}>{order.product}</span>
                              {isGreen && (
                                <span style={{ 
                                  fontSize: '10px', 
                                  color: '#4ade80', 
                                  background: 'rgba(74,222,128,0.15)', 
                                  padding: '2px 6px', 
                                  borderRadius: '4px',
                                  fontWeight: 700 
                                }}>
                                  В наявності
                                </span>
                              )}
                            </div>
                            
                            {showSelectedDetails ? (
                              <div className={css.cardStats} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginTop: '12px', width: '100%' }}>
                                <div className={css.statItem} style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%', padding: '8px 12px' }}>
                                  <span className={css.statLabel} style={{ margin: 0 }}>Залишки (Бух / Скл)</span>
                                  <span className={css.statValue}>
                                    {order.qty_remain.toFixed(2)} <span style={{ opacity: 0.3 }}>/</span> {order.qty_remain_skl?.toFixed(2) || "0.00"}
                                  </span>
                                </div>
                                <div className={css.statItem} style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%', padding: '8px 12px' }}>
                                  <span className={css.statLabel} style={{ margin: 0 }}>Потрібно (Доп / Все)</span>
                                  <span className={css.statValue}>
                                    <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>{order.qty_needed_selected?.toFixed(2) || "0.00"}</span> <span style={{ opacity: 0.3 }}>/</span> {order.qty_needed_total?.toFixed(2) || "0.00"}
                                  </span>
                                </div>
                                <div className={css.statItem} style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%', padding: '8px 12px' }}>
                                  <span className={css.statLabel} style={{ margin: 0 }}>Дефіцит (Доп / Все)</span>
                                  <span className={css.statValue}>
                                    <span style={{ color: (order.qty_missing_selected || 0) <= 0 ? '#4ade80' : '#ef4444', fontWeight: 'bold' }}>{(order.qty_missing_selected || 0).toFixed(2)}</span> <span style={{ opacity: 0.3 }}>/</span> {(order.qty_missing_total || 0).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className={css.cardStats}>
                                <div className={css.statItem}>
                                  <span className={css.statLabel}>Залишки</span>
                                  <span className={css.statValue} style={isGreen ? { color: '#4ade80' } : {}}>{order.qty_remain.toFixed(2)}</span>
                                </div>
                                <div className={css.statItem}>
                                  <span className={css.statLabel}>Потрібно</span>
                                  <span className={css.statValue}>{order.qty_needed.toFixed(2)}</span>
                                </div>
                                <div className={css.statItem}>
                                  <span className={css.statLabel}>Не вистачає</span>
                                  <span className={`${css.statValue} ${css.missingValue}`} style={isGreen ? { color: '#4ade80', opacity: 0.8 } : {}}>
                                    {order.qty_missing.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </SwipeableRow>
                        );
                      })}
                    </div>
                  ) : (
                    <ProductDesktopTableGroup 
                      orders={orders} 
                      onRowClick={onRowClick} 
                      selectedProduct={selectedProduct} 
                      showSelectedDetails={showSelectedDetails}
                    />
                  )}
                </>
              )}
            </div>
          );
        })
      ) : (
        <p>Немає даних</p>
      )}
    </div>
  );
};

export default ProductTable;
