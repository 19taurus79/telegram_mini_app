import css from "./ProductTable.module.css";
import { BiOrdersItem } from "@/types/types";
import useSwipe from "@/hooks/useSwipe";
import { useState, useEffect } from "react";

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
}

// Helper component for Swipeable Row
const SwipeableRow = ({ children, onSwipeLeft, onSwipeRight, onClick, isSelected, hasStock = true }: SwipeableRowProps) => {
  const swipeHandlers = useSwipe({
    onSwipedLeft: hasStock ? onSwipeLeft : undefined,
    onSwipedRight: onSwipeRight,
  });

  return (
    <div 
      {...swipeHandlers} 
      onClick={onClick}
      className={`${css.mobileCard} ${isSelected ? css.selectedCard : ''} ${hasStock ? css.hasStockCard : css.noStockCard}`}
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
                      {orders.map((order) => (
                        <SwipeableRow
                          key={order.product}
                          onSwipeLeft={() => onSwipeLeft?.(order)}
                          onSwipeRight={() => onSwipeRight?.(order)}
                          onClick={() => onRowClick?.(order)}
                          isSelected={selectedProduct?.product === order.product}
                          hasStock={order.available_stock && order.available_stock.length > 0}
                        >
                          <div className={css.cardHeader}>
                            <span className={css.productName}>{order.product}</span>
                          </div>
                          <div className={css.cardStats}>
                            <div className={css.statItem}>
                              <span className={css.statLabel}>Залишки</span>
                              <span className={css.statValue}>{order.qty_remain.toFixed(2)}</span>
                            </div>
                            <div className={css.statItem}>
                              <span className={css.statLabel}>Потрібно</span>
                              <span className={css.statValue}>{order.qty_needed.toFixed(2)}</span>
                            </div>
                            <div className={css.statItem}>
                              <span className={css.statLabel}>Не вистачає</span>
                              <span className={`${css.statValue} ${css.missingValue}`}>
                                {order.qty_missing.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </SwipeableRow>
                      ))}
                    </div>
                  ) : (
                    <table className={css.table}>
                      <thead>
                        <tr>
                          <th className={`${css.th} ${css.productColumn}`}>Номенклатура</th>
                          <th className={`${css.th} ${css.qtyColumn}`}>Залишки</th>
                          <th className={`${css.th} ${css.qtyColumn}`}>Потрібно</th>
                          <th className={`${css.th} ${css.qtyColumn}`}>Не вистачає</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => (
                          <tr
                            key={order.product}
                            onClick={() => onRowClick?.(order)}
                            className={
                              onRowClick
                                ? selectedProduct?.product === order.product
                                  ? css.selectedRow
                                  : css.row
                                : ""
                            }
                          >
                            <td className={`${css.td} ${css.productColumn}`} title={order.product}>
                              {order.product}
                            </td>
                            <td className={`${css.td} ${css.qtyColumn}`} title={order.qty_remain.toString()}>
                              {order.qty_remain.toFixed(2)}
                            </td>
                            <td className={`${css.td} ${css.qtyColumn}`} title={order.qty_needed.toString()}>
                              {order.qty_needed.toFixed(2)}
                            </td>
                            <td className={`${css.td} ${css.qtyColumn}`} title={order.qty_missing.toString()}>
                              {order.qty_missing.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
