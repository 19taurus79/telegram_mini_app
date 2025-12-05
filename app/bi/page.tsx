// Вказує, що цей файл є Клієнтським Компонентом в Next.js.
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { dataForOrderByProduct } from "@/lib/api";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import toast from "react-hot-toast";
import styles from "./BiPage.module.css";
import { BiOrders, BiOrdersItem, FiltersState } from "@/types/types";
import ProductTable from "@/components/Bi/ProductTable/ProductTable";
import StockDetails from "@/components/Bi/StockDetails/StockDetails";
import RecommendationsTable from "@/components/Bi/RecommendationsTable/RecommendationsTable";
import OrdersTable from "@/components/Bi/OrdersTable/OrdersTable";
import FilterPanel from "@/components/Bi/FilterPanel/FilterPanel";
import Loader from "@/components/Loader/Loader";
import MobileDrawer from "@/components/Bi/MobileDrawer/MobileDrawer";

interface Recommendation {
  product: string;
  take_from_division: string;
  take_from_warehouse: string;
  qty_to_take: number;
}

const priorityDivisions = [
  "Центральний офіс",
  "Київський підрозділ",
  "Полтавський підрозділ",
  "Лубенський підрозділ",
  "Дніпровський підрозділ",
  "Запорізький підрозділ",
];

export default function BiPage() {
  const [selectedProduct, setSelectedProduct] = useState<BiOrdersItem | null>(
    null
  );

  const [filters, setFilters] = useState<FiltersState>({
    document_status: [],
    delivery_status: [],
  });

  const [isFilterPanelVisible, setIsFilterPanelVisible] = useState(false);

  const {
    data,
    isLoading,
    isFetching,
    error,
  }: UseQueryResult<BiOrders, Error> = useQuery({
    queryKey: ["biOrders", filters],
    queryFn: () => dataForOrderByProduct(filters),
    placeholderData: (previousData) => previousData,
  });

  const toastIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isFetching && !isLoading) {
      if (toastIdRef.current === null) {
        toastIdRef.current = toast.loading("Оновлення даних...");
      }
    } else {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    }
  }, [isFetching, isLoading]);

  const filterOptions = useMemo(() => {
    if (!data) {
      return { document_status: [], delivery_status: [] };
    }

    const docStatuses = new Set<string>();
    const deliveryStatuses = new Set<string>();

    const allProducts = [
      ...(data.missing_but_available || []),
      ...(data.missing_and_unavailable || []),
    ];

    allProducts.forEach((product) => {
      product.orders.forEach(
        (order: { document_status: string; delivery_status: string }) => {
          docStatuses.add(order.document_status);
          deliveryStatuses.add(order.delivery_status);
        }
      );
    });

    return {
      document_status: Array.from(docStatuses).sort(),
      delivery_status: Array.from(deliveryStatuses).sort(),
    };
  }, [data]);

  const recommendations = useMemo(() => {
    const newRecommendations: Recommendation[] = [];
    if (!data?.missing_but_available) {
      return newRecommendations;
    }

    for (const product of data.missing_but_available) {
      let needed = product.qty_missing;
      if (needed <= 0) continue;

      const prioritySet = new Set(priorityDivisions);
      const priorityStock: typeof product.available_stock = [];
      const otherStock: typeof product.available_stock = [];

      for (const stock of product.available_stock) {
        if (prioritySet.has(stock.division)) {
          priorityStock.push(stock);
        } else {
          otherStock.push(stock);
        }
      }

      priorityStock.sort(
        (a: { division: string }, b: { division: string }) =>
          priorityDivisions.indexOf(a.division) -
          priorityDivisions.indexOf(b.division)
      );

      for (const stock of priorityStock) {
        if (needed <= 0) break;
        if (stock.available > 0) {
          const canTake = Math.min(needed, stock.available);
          newRecommendations.push({
            product: product.product,
            take_from_division: stock.division,
            take_from_warehouse: stock.warehouse,
            qty_to_take: canTake,
          });
          needed -= canTake;
        }
      }

      if (needed > 0) {
        otherStock.sort(
          (
            a: { division: string; warehouse: string },
            b: { division: string; warehouse: string }
          ) => {
            if (a.division !== b.division) {
              return a.division.localeCompare(b.division);
            }
            return a.warehouse.localeCompare(b.warehouse);
          }
        );

        for (const stock of otherStock) {
          if (needed <= 0) break;
          if (stock.available > 0) {
            const canTake = Math.min(needed, stock.available);
            newRecommendations.push({
              product: product.product,
              take_from_division: stock.division,
              take_from_warehouse: stock.warehouse,
              qty_to_take: canTake,
            });
            needed -= canTake;
          }
        }
      }
    }
    return newRecommendations;
  }, [data]);

  const handleApplyFilters = (newFilters: FiltersState) => {
    setSelectedProduct(null);
    setFilters(newFilters);
  };

  const [isMobile, setIsMobile] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<'none' | 'stock' | 'orders'>('none');

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSwipeRight = (product: BiOrdersItem) => {
    setSelectedProduct(product);
    setActiveDrawer('orders'); // Swipe Right (→) opens Left Drawer
  };

  const handleSwipeLeft = (product: BiOrdersItem) => {
    setSelectedProduct(product);
    setActiveDrawer('stock'); // Swipe Left (←) opens Right Drawer
  };

  const renderContent = () => {
    if (isLoading) {
      return <Loader />;
    }

    if (error) {
      return <p>Error: {error.message}</p>;
    }

    if (data) {
      return (
        <>
          <div className={styles.topContainer}>
            <div className={styles.mainTableContainer}>
              <ProductTable
                title="Потрібно замовити (є на складах)"
                data={data.missing_but_available}
                onRowClick={(product) => {
                  setSelectedProduct(product);
                  if (isMobile) setActiveDrawer('stock'); // Default action on click for mobile
                }}
                onSwipeRight={handleSwipeRight}
                onSwipeLeft={handleSwipeLeft}
                selectedProduct={selectedProduct}
              />
            </div>
            
            {!isMobile && (
              <>
                <div className={styles.stockDetailsContainer}>
                  <StockDetails selectedProduct={selectedProduct} />
                </div>
                <div className={styles.ordersContainer}>
                  <OrdersTable
                    orders={selectedProduct ? selectedProduct.orders : []}
                  />
                </div>
              </>
            )}
          </div>

          <div className={styles.bottomContainer}>
            <ProductTable
              title="Не вистачає під заявки (немає на складах)"
              data={data.missing_and_unavailable}
              onRowClick={(product) => {
                setSelectedProduct(product);
                if (isMobile) setActiveDrawer('orders'); // Only orders available for unavailable products
              }}
              onSwipeRight={handleSwipeRight}
              selectedProduct={selectedProduct}
            />
          </div>

          <div className={styles.bottomContainer}>
            <RecommendationsTable recommendations={recommendations} />
          </div>

          {/* Mobile Drawers */}
          {isMobile && (
            <>
              <MobileDrawer
                isOpen={activeDrawer === 'stock'}
                onClose={() => setActiveDrawer('none')}
                position="right"
                title="Вільні залишки"
              >
                <StockDetails selectedProduct={selectedProduct} />
              </MobileDrawer>

              <MobileDrawer
                isOpen={activeDrawer === 'orders'}
                onClose={() => setActiveDrawer('none')}
                position="left"
                title="Деталізація по замовленнях"
              >
                <OrdersTable
                  orders={selectedProduct ? selectedProduct.orders : []}
                />
              </MobileDrawer>
            </>
          )}
        </>
      );
    }

    return null;
  };

  return (
    <div className={styles.pageContainer}>

      <button
        onClick={() => setIsFilterPanelVisible(!isFilterPanelVisible)}
        className={styles.toggleFilterButton}
      >
        {isFilterPanelVisible ? "Сховати фільтри" : "Показати фільтри"}
      </button>

      {isFilterPanelVisible && (
        <FilterPanel
          options={filterOptions}
          onApply={handleApplyFilters}
          isSubmitting={isFetching}
          appliedFilters={filters} // Передаємо поточні фільтри
        />
      )}
      {renderContent()}
    </div>
  );
}
