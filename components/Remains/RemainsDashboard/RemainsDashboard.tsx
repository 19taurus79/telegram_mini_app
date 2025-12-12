"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Responsive, WidthProvider, Layout, Layouts } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import styles from "./RemainsDashboard.module.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

// Default layouts for different breakpoints
const defaultLayouts: Layouts = {
  lg: [
    { i: "product-list", x: 0, y: 0, w: 6, h: 10, minW: 4, minH: 6 },
    { i: "remains-details", x: 6, y: 0, w: 6, h: 10, minW: 4, minH: 6 },
    { i: "moved-details", x: 0, y: 10, w: 6, h: 10, minW: 4, minH: 6 },
    { i: "orders-details", x: 6, y: 10, w: 6, h: 10, minW: 4, minH: 6 },
  ],
  md: [
    { i: "product-list", x: 0, y: 0, w: 5, h: 10, minW: 3, minH: 6 },
    { i: "remains-details", x: 5, y: 0, w: 5, h: 10, minW: 3, minH: 6 },
    { i: "moved-details", x: 0, y: 10, w: 5, h: 10, minW: 3, minH: 6 },
    { i: "orders-details", x: 5, y: 10, w: 5, h: 10, minW: 3, minH: 6 },
  ],
  sm: [
    { i: "product-list", x: 0, y: 0, w: 6, h: 8, minW: 6, minH: 4 },
    { i: "remains-details", x: 0, y: 8, w: 6, h: 8, minW: 6, minH: 4 },
    { i: "moved-details", x: 0, y: 16, w: 6, h: 8, minW: 6, minH: 4 },
    { i: "orders-details", x: 0, y: 24, w: 6, h: 8, minW: 6, minH: 4 },
  ],
};

const STORAGE_KEY = "remains-dashboard-layouts";

interface GridItemProps {
  title: string;
  children: React.ReactNode;
}

const GridItem: React.FC<GridItemProps> = ({ title, children }) => {
  return (
    <div className={styles.gridItem}>
      <div className={styles.gridItemHeader}>
        <span className={styles.dragHandle}>⋮⋮</span>
        <h3 className={styles.gridItemTitle}>{title}</h3>
      </div>
      <div className={styles.gridItemContent}>{children}</div>
    </div>
  );
};

interface RemainsDashboardProps {
  productList: React.ReactNode;
  detailsRemains: React.ReactNode;
  detailsOrders: React.ReactNode;
  detailsMoved: React.ReactNode;
  isMobile?: boolean;
  onResetLayout?: () => void;
}

export default function RemainsDashboard({
  productList,
  detailsRemains,
  detailsOrders,
  detailsMoved,
  isMobile = false,
}: RemainsDashboardProps) {
  const [layouts, setLayouts] = useState<Layouts>(defaultLayouts);
  const [isClient, setIsClient] = useState(false);
  const [isRemainsOpen, setIsRemainsOpen] = useState(true);
  const [isMovedOpen, setIsMovedOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);


  // Load layouts from localStorage on mount
  useEffect(() => {
    setIsClient(true);
    const savedLayouts = localStorage.getItem(STORAGE_KEY);
    if (savedLayouts) {
      try {
        const parsed = JSON.parse(savedLayouts);
        setLayouts(parsed);
      } catch (e) {
        console.error("Failed to parse saved layouts:", e);
      }
    }
  }, []);

  // Save layouts to localStorage
  const handleLayoutChange = useCallback(
    (currentLayout: Layout[], allLayouts: Layouts) => {
      setLayouts(allLayouts);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allLayouts));
    },
    []
  );

  // Don't render grid on mobile or during SSR
  if (isMobile || !isClient) {
    return (
      <div className={styles.mobileLayout}>
        <h2 className={styles.mobileSectionTitle}>📦 Список продуктів</h2>
        <div className={styles.mobileSection}>{productList}</div>
        
        {/* Залишки на складах - розгорнутий за замовчуванням */}
        <div className={styles.accordionHeader} onClick={() => setIsRemainsOpen(!isRemainsOpen)}>
          <h2 className={styles.mobileSectionTitle}>🏭 Залишки на складах</h2>
          <span className={`${styles.accordionIcon} ${isRemainsOpen ? styles.open : ''}`}>▼</span>
        </div>
        {isRemainsOpen && (
          <div className={styles.mobileSection}>{detailsRemains}</div>
        )}
        
        {/* Переміщені товари - згорнутий за замовчуванням */}
        <div className={styles.accordionHeader} onClick={() => setIsMovedOpen(!isMovedOpen)}>
          <h2 className={styles.mobileSectionTitle}>🔄 Переміщено під заявки</h2>
          <span className={`${styles.accordionIcon} ${isMovedOpen ? styles.open : ''}`}>▼</span>
        </div>
        {isMovedOpen && (
          <div className={styles.mobileSection}>{detailsMoved}</div>
        )}
        
        {/* Замовлення по продукту - згорнутий за замовчуванням */}
        <div className={styles.accordionHeader} onClick={() => setIsOrdersOpen(!isOrdersOpen)}>
          <h2 className={styles.mobileSectionTitle}>📑 Замовлення по товару</h2>
          <span className={`${styles.accordionIcon} ${isOrdersOpen ? styles.open : ''}`}>▼</span>
        </div>
        {isOrdersOpen && (
          <div className={styles.mobileSection}>{detailsOrders}</div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer}>
      <ResponsiveGridLayout
        className={styles.gridLayout}
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 10, sm: 6 }}
        rowHeight={30}
        onLayoutChange={handleLayoutChange}
        draggableHandle={`.${styles.dragHandle}`}
        isResizable={true}
        isDraggable={true}
        margin={[16, 16]}
        containerPadding={[0, 0]}
      >
        <div key="product-list">
          <GridItem title="Список продуктів">
            {productList}
          </GridItem>
        </div>

        <div key="remains-details">
          <GridItem title="Деталізація залишків">{detailsRemains}</GridItem>
        </div>

        <div key="moved-details">
          <GridItem title="Переміщені товари">{detailsMoved}</GridItem>
        </div>

        <div key="orders-details">
          <GridItem title="Замовлення по продукту">
            {detailsOrders}
          </GridItem>
        </div>
      </ResponsiveGridLayout>
    </div>
  );
}
