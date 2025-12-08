"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Responsive, WidthProvider, Layout, Layouts } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import styles from "./BiDashboard.module.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

// Default layouts for different breakpoints
const defaultLayouts: Layouts = {
  lg: [
    { i: "products-available", x: 0, y: 0, w: 6, h: 8, minW: 4, minH: 4 },
    { i: "stock-details", x: 6, y: 0, w: 6, h: 4, minW: 3, minH: 3 },
    { i: "orders", x: 6, y: 4, w: 6, h: 4, minW: 3, minH: 3 },
    { i: "products-unavailable", x: 0, y: 8, w: 6, h: 6, minW: 4, minH: 4 },
    { i: "recommendations", x: 6, y: 8, w: 6, h: 6, minW: 4, minH: 4 },
  ],
  md: [
    { i: "products-available", x: 0, y: 0, w: 5, h: 8, minW: 3, minH: 4 },
    { i: "stock-details", x: 5, y: 0, w: 5, h: 4, minW: 3, minH: 3 },
    { i: "orders", x: 5, y: 4, w: 5, h: 4, minW: 3, minH: 3 },
    { i: "products-unavailable", x: 0, y: 8, w: 5, h: 6, minW: 3, minH: 4 },
    { i: "recommendations", x: 5, y: 8, w: 5, h: 6, minW: 3, minH: 4 },
  ],
  sm: [
    { i: "products-available", x: 0, y: 0, w: 6, h: 6, minW: 6, minH: 4 },
    { i: "stock-details", x: 0, y: 6, w: 6, h: 4, minW: 6, minH: 3 },
    { i: "orders", x: 0, y: 10, w: 6, h: 4, minW: 6, minH: 3 },
    { i: "products-unavailable", x: 0, y: 14, w: 6, h: 6, minW: 6, minH: 4 },
    { i: "recommendations", x: 0, y: 20, w: 6, h: 6, minW: 6, minH: 4 },
  ],
};

const STORAGE_KEY = "bi-dashboard-layouts";

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

interface BiDashboardProps {
  productsAvailable: React.ReactNode;
  productsUnavailable: React.ReactNode;
  stockDetails: React.ReactNode;
  ordersTable: React.ReactNode;
  recommendations: React.ReactNode;
  isMobile?: boolean;
  onResetLayout?: () => void;
  showRecommendations?: boolean;
}

export default function BiDashboard({
  productsAvailable,
  productsUnavailable,
  stockDetails,
  ordersTable,
  recommendations,
  isMobile = false,
  showRecommendations = false,
}: BiDashboardProps) {
  const [layouts, setLayouts] = useState<Layouts>(defaultLayouts);
  const [isClient, setIsClient] = useState(false);

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
        <h2 className={styles.mobileSectionTitle}>🟢 Необхідно замовити (є на складах)</h2>
        <div className={styles.mobileSection}>{productsAvailable}</div>
        
        <h2 className={styles.mobileSectionTitle}>🔴 Не вистачає (немає на складах)</h2>
        <div className={styles.mobileSection}>{productsUnavailable}</div>
        
        {showRecommendations && (
          <>
            <h2 className={styles.mobileSectionTitle}>📋 Рекомендації</h2>
            <div className={styles.mobileSection}>{recommendations}</div>
          </>
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
        rowHeight={50}
        onLayoutChange={handleLayoutChange}
        draggableHandle={`.${styles.dragHandle}`}
        isResizable={true}
        isDraggable={true}
        margin={[16, 16]}
        containerPadding={[0, 0]}
      >
        <div key="products-available">
          <GridItem title="Потрібно замовити (є на складах)">
            {productsAvailable}
          </GridItem>
        </div>

        <div key="stock-details">
          <GridItem title="Вільні залишки">{stockDetails}</GridItem>
        </div>

        <div key="orders">
          <GridItem title="Деталізація по замовленнях">{ordersTable}</GridItem>
        </div>

        <div key="products-unavailable">
          <GridItem title="Не вистачає під заявки (немає на складах)">
            {productsUnavailable}
          </GridItem>
        </div>

        {showRecommendations && (
          <div key="recommendations">
            <GridItem title="Рекомендації по переміщенню">
              {recommendations}
            </GridItem>
          </div>
        )}
      </ResponsiveGridLayout>
    </div>
  );
}
