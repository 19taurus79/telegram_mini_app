"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Responsive, WidthProvider, Layout, Layouts } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import styles from "./RemainsDashboard.module.css";
import BottomSheet from "@/components/UI/BottomSheet/BottomSheet";
import SegmentedControl from "@/components/UI/SegmentedControl/SegmentedControl";
import { Boxes, Truck, ClipboardList } from "lucide-react";

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
  headerContent?: React.ReactNode;
  subHeader?: React.ReactNode;
}

const GridItem: React.FC<GridItemProps> = ({ title, children, headerContent, subHeader }) => {
  return (
    <div className={styles.gridItem}>
      <div className={styles.gridItemHeader}>
        <div className={styles.titleContainer}>
          <span className={styles.dragHandle}>⋮⋮</span>
          <h3 className={styles.gridItemTitle}>{title}</h3>
        </div>
        <div className={styles.headerContentContainer}>
          {headerContent}
        </div>
      </div>
      {subHeader && (
        <div className={styles.gridItemSubHeader}>
          {subHeader}
        </div>
      )}
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
  headerContent?: React.ReactNode;
  subHeader?: React.ReactNode;
  selectedProductId?: string | null;
  onClearSelection?: () => void;
}

export default function RemainsDashboard({
  productList,
  detailsRemains,
  detailsOrders,
  detailsMoved,
  isMobile,
  headerContent,
  subHeader,
  selectedProductId,
  onClearSelection,
}: RemainsDashboardProps) {
  const [layouts, setLayouts] = useState<Layouts>(defaultLayouts);
  const [isClient, setIsClient] = useState(false);
  const [activeTab, setActiveTab] = useState("remains");

  // Reset tab when product changes
  useEffect(() => {
    setActiveTab("remains");
  }, [selectedProductId]);

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

  // SSR skeleton
  if (!isClient) {
    return (
      <div className={styles.mobileLayout}>
        {subHeader && <div className={styles.mobileSubHeader}>{subHeader}</div>}
        {productList}
      </div>
    );
  }

  // Mobile layout — Bottom Sheet with tabbed details
  if (isMobile) {
    return (
      <div className={styles.mobileLayout}>
        {subHeader && <div className={styles.mobileSubHeader}>{subHeader}</div>}
        <div className={styles.mobileSection}>{productList}</div>
        
        <BottomSheet
          isOpen={!!selectedProductId}
          onClose={onClearSelection || (() => {})}
          title="Деталі товару"
          isFullHeight={true}
        >
          <SegmentedControl
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { label: "Склади", value: "remains", icon: <Boxes size={16} /> },
              { label: "Переміщено", value: "moved", icon: <Truck size={16} /> },
              { label: "Заявки", value: "orders", icon: <ClipboardList size={16} /> },
            ]}
          />

          <div className={styles.tabContent}>
            {activeTab === "remains" && <div className={styles.mobileSection}>{detailsRemains}</div>}
            {activeTab === "moved" && <div className={styles.mobileSection}>{detailsMoved}</div>}
            {activeTab === "orders" && <div className={styles.mobileSection}>{detailsOrders}</div>}
          </div>
        </BottomSheet>
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
          <GridItem title="Список продуктів" headerContent={headerContent} subHeader={subHeader}>
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
