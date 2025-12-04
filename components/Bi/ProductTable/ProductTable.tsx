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
}

// Helper component for Swipeable Row
const SwipeableRow = ({ children, onSwipeLeft, onSwipeRight, onClick, isSelected }: any) => {
  const swipeHandlers = useSwipe({
    onSwipedLeft: onSwipeLeft,
    onSwipedRight: onSwipeRight,
  });

  return (
    <div 
      {...swipeHandlers} 
      onClick={onClick}
      className={`${css.mobileCard} ${isSelected ? css.selectedCard : ''}`}
    >
      {children}
      <div className={css.swipeHint}>
        <div className={css.swipeRightHint}>
          <span>Замовлення</span>
          <span>→</span>
        </div>
        <div className={css.swipeLeftHint}>
          <span>←</span>
          <span>Склад</span>
        </div>
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
}: ProductTableProps) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      <h2 className={css.title}>{title}</h2>
      {sortedData && sortedData.length > 0 ? (
        Object.entries(groupedData).map(([group, orders]) => (
          <div key={group}>
            <h3 className={css.groupTitle}>{group}</h3>
            {isMobile ? (
              <div className={css.mobileList}>
                {orders.map((order) => (
                  <SwipeableRow
                    key={order.product}
                    onSwipeLeft={() => onSwipeLeft?.(order)}
                    onSwipeRight={() => onSwipeRight?.(order)}
                    onClick={() => onRowClick?.(order)}
                    isSelected={selectedProduct?.product === order.product}
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
          </div>
        ))
      ) : (
        <p>Немає даних</p>
      )}
    </div>
  );
};

export default ProductTable;
