// Вказує, що цей файл є Клієнтським Компонентом в Next.js.
"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { dataForOrderByProduct } from "@/lib/api";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import styles from "./BiPage.module.css";
import { BiOrders, BiOrdersItem, FiltersState, OrderComment } from "@/types/types";
import ProductTable from "@/components/Bi/ProductTable/ProductTable";
import StockDetails from "@/components/Bi/StockDetails/StockDetails";
import RecommendationsTable from "@/components/Bi/RecommendationsTable/RecommendationsTable";
import OrdersTable from "@/components/Bi/OrdersTable/OrdersTable";
import FilterPanel from "@/components/Bi/FilterPanel/FilterPanel";
import Loader from "@/components/Loader/Loader";
import MobileDrawer from "@/components/Bi/MobileDrawer/MobileDrawer";
import Modal from "@/components/Modal/Modal";
import BiDashboard from "@/components/Bi/BiDashboard/BiDashboard";
import { CommentsProvider } from "@/components/Orders/CommentsContext";
import { getOrderComments } from "@/lib/api";
import { useInitData } from "@/store/InitData";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useOrderCart } from "@/store/OrderCart";

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

function BiPageContent() {
  const [selectedProduct, setSelectedProduct] = useState<BiOrdersItem | null>(
    null
  );

  const queryClient = useQueryClient();
  const initData = useInitData((state) => state.initData);
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<FiltersState>({
    document_status: [],
    delivery_status: [],
  });

  const [isFilterPanelVisible, setIsFilterPanelVisible] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);

  const { selectedItems: cartItems, clearCart } = useOrderCart();
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("showSelected") === "true") {
      setShowSelectedOnly(true);
    }
  }, [searchParams]);

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


  const processedData = useMemo(() => {
    if (!data) return null;
    if (!showSelectedOnly) return data;

    const groupedCart: Record<string, typeof cartItems> = {};
    cartItems.forEach(item => {
      const name = item.product;
      if (!groupedCart[name]) {
        groupedCart[name] = [];
      }
      groupedCart[name].push(item);
    });

    const missingButAvailable: BiOrdersItem[] = [];
    const missingAndUnavailable: BiOrdersItem[] = [];

    Object.entries(groupedCart).forEach(([productName, items]) => {
      const backendItem = 
        data.missing_but_available?.find(i => i.product === productName) ||
        data.missing_and_unavailable?.find(i => i.product === productName);

      if (backendItem) {
        const selectedSupplementSet = new Set(items.map(i => i.contract_supplement));
        const filteredOrders = backendItem.orders.filter(o => selectedSupplementSet.has(o.contract_supplement));

        const qtyNeededSelected = filteredOrders.reduce((sum, o) => sum + o.qty, 0);
        const qtyNeededTotal = backendItem.qty_needed;

        const qtyRemainBuh = backendItem.qty_remain;
        const qtyRemainSkl = items[0]?.skl || 0;

        const qtyMissingSelected = Math.max(0, qtyNeededSelected - qtyRemainBuh);
        const qtyMissingTotal = backendItem.qty_missing;

        const qtyMovedSelected = filteredOrders.reduce((sum, o) => sum + (Number(o.moved_qty) || 0), 0);

        const biItem: BiOrdersItem = {
          ...backendItem,
          qty_needed: qtyNeededSelected,
          qty_missing: qtyMissingSelected,
          orders: backendItem.orders,
          qty_needed_total: qtyNeededTotal,
          qty_needed_selected: qtyNeededSelected,
          qty_missing_total: qtyMissingTotal,
          qty_missing_selected: qtyMissingSelected,
          qty_moved_selected: qtyMovedSelected,
          qty_remain_skl: qtyRemainSkl,
        };

        // Якщо дефіциту під вибране доповнення немає — товар вгору (немає потреби замовляти)
        if (qtyMissingSelected <= 0) {
          missingButAvailable.push(biItem);
        } else if (biItem.available_stock && biItem.available_stock.length > 0) {
          // Є дефіцит, але є залишки на складах — можна перемістити
          missingButAvailable.push(biItem);
        } else {
          // Є дефіцит і нічого немає на складах
          missingAndUnavailable.push(biItem);
        }
      } else {
        const first = items[0];
        const qtyNeededSelected = items.reduce((sum, i) => sum + i.different, 0);
        const qtyRemainBuh = first.buh;
        const qtyRemainSkl = first.skl;
        const qtyMovedSelected = items.reduce((sum, i) => sum + (i.different - i.orders_q), 0);

        const qtyMissingCalc = Math.max(0, qtyNeededSelected - qtyRemainBuh);
        const biItem: BiOrdersItem = {
          product: productName,
          line_of_business: first.line_of_business || "ЗЗР",
          qty_needed: qtyNeededSelected,
          qty_remain: qtyRemainBuh,
          qty_missing: qtyMissingCalc,
          available_stock: [],
          orders: items.map(i => ({
            moved_qty: "0",
            manager: i.manager,
            client: i.client,
            contract_supplement: i.contract_supplement,
            period: "",
            document_status: "затверджено",
            delivery_status: i.qok || "",
            product: i.product,
            qty: i.different,
          })),
          qty_needed_total: qtyNeededSelected,
          qty_needed_selected: qtyNeededSelected,
          qty_missing_total: qtyMissingCalc,
          qty_missing_selected: qtyMissingCalc,
          qty_moved_selected: qtyMovedSelected > 0 ? qtyMovedSelected : 0,
          qty_remain_skl: qtyRemainSkl,
        };
        if (qtyMissingCalc <= 0) {
          missingButAvailable.push(biItem);
        } else {
          missingAndUnavailable.push(biItem);
        }
      }
    });

    return {
      missing_but_available: missingButAvailable,
      missing_and_unavailable: missingAndUnavailable,
    } as BiOrders;
  }, [data, showSelectedOnly, cartItems]);

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
    if (!processedData?.missing_but_available) {
      return newRecommendations;
    }

    for (const product of processedData.missing_but_available) {
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
  }, [processedData]);

  const contractsIds = useMemo(() => {
    if (!processedData) return [];
    const all = [
      ...(processedData.missing_but_available || []),
      ...(processedData.missing_and_unavailable || []),
    ];
    const ids = new Set<string>();
    all.forEach(p => p.orders.forEach(o => ids.add(o.contract_supplement)));
    return Array.from(ids);
  }, [processedData]);

  const { data: batchCommentsData, isLoading: isCommentsBatchLoading, isFetched: isCommentsFetched } = useQuery({
    queryKey: ["batchComments", contractsIds],
    queryFn: async () => {
      const allComments = await getOrderComments(contractsIds, undefined, initData ?? undefined);
      
      contractsIds.forEach(id => {
        const itemComments = allComments.filter(c => c.order_ref === id);
        queryClient.setQueryData(["comments", id], itemComments);
      });
      
      return allComments;
    },
    enabled: contractsIds.length > 0 && !!initData,
    staleTime: 60000,
  });

  const commentsMap = useMemo(() => {
    const map: Record<string, OrderComment[]> = {};
    if (batchCommentsData) {
      batchCommentsData.forEach(c => {
        if (!map[c.order_ref]) map[c.order_ref] = [];
        map[c.order_ref].push(c);
      });
    }
    return map;
  }, [batchCommentsData]);

  const handleApplyFilters = (newFilters: FiltersState) => {
    setSelectedProduct(null);
    setFilters(newFilters);
  };

  // Reset dashboard layout to default
  const handleResetLayout = () => {
    localStorage.removeItem('bi-dashboard-layouts');
    window.location.reload();
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

    if (processedData) {
      // Components for grid
      const productsAvailableComponent = (
        <ProductTable
          title="Потрібно замовити (є на складах)"
          data={processedData.missing_but_available}
          onRowClick={!isMobile ? (product) => setSelectedProduct(product) : undefined}
          onSwipeRight={handleSwipeRight}
          onSwipeLeft={handleSwipeLeft}
          selectedProduct={selectedProduct}
          hideTitle
        />
      );

      const productsUnavailableComponent = (
        <ProductTable
          title="Не вистачає под заявки (немає на складах)"
          data={processedData.missing_and_unavailable}
          onRowClick={!isMobile ? (product) => setSelectedProduct(product) : undefined}
          onSwipeRight={handleSwipeRight}
          selectedProduct={selectedProduct}
          hideTitle
        />
      );

      const stockDetailsComponent = (
        <StockDetails selectedProduct={selectedProduct} />
      );

      const ordersTableComponent = (
        <OrdersTable 
          orders={selectedProduct ? selectedProduct.orders : []} 
          productName={selectedProduct?.product}
        />
      );

      const recommendationsComponent = (
        <RecommendationsTable recommendations={recommendations} hideTitle />
      );

      return (
        <CommentsProvider value={{ commentsMap, isLoading: isCommentsBatchLoading, isFetched: isCommentsFetched }}>
          <BiDashboard
            productsAvailable={productsAvailableComponent}
            productsUnavailable={productsUnavailableComponent}
            stockDetails={stockDetailsComponent}
            ordersTable={ordersTableComponent}
            recommendations={recommendationsComponent}
            isMobile={isMobile}
            showRecommendations={showRecommendations}
          />

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
                  productName={selectedProduct?.product}
                />
              </MobileDrawer>
            </>
          )}
        </CommentsProvider>
      );
    }

    return null;
  };

  return (
    <div className={styles.pageContainer}>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={() => setIsFilterPanelVisible(!isFilterPanelVisible)}
          className={styles.toggleFilterButton}
          style={{ margin: 0 }}
        >
          {isFilterPanelVisible ? "Сховати фільтри" : "Показати фільтри"}
        </button>

        <button
          onClick={() => setShowSelectedOnly(!showSelectedOnly)}
          className={styles.toggleFilterButton}
          style={{ 
            margin: 0,
            background: showSelectedOnly ? 'var(--accent-green)' : 'rgba(255, 255, 255, 0.05)',
            color: showSelectedOnly ? '#000' : '#fff',
            border: showSelectedOnly ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
            fontWeight: 600
          }}
        >
          {showSelectedOnly ? `✓ Обрані з заявок (${cartItems.length})` : `Показати обрані з заявок (${cartItems.length})`}
        </button>
        
        {cartItems.length > 0 && (
          <button
            onClick={() => {
              setIsClearConfirmOpen(true);
            }}
            className={styles.toggleFilterButton}
            style={{ 
              margin: 0, 
              background: 'rgba(239, 68, 68, 0.2)', 
              color: '#f87171', 
              border: '1px solid rgba(239, 68, 68, 0.4)' 
            }}
          >
            Очистити
          </button>
        )}
      </div>

      {isFilterPanelVisible && (
        <FilterPanel
          options={filterOptions}
          onApply={handleApplyFilters}
          isSubmitting={isFetching}
          appliedFilters={filters}
          onResetLayout={handleResetLayout}
          showRecommendations={showRecommendations}
          onToggleRecommendations={setShowRecommendations}
        />
      )}
      {renderContent()}

      {isClearConfirmOpen && (
        <Modal onClose={() => setIsClearConfirmOpen(false)}>
          <div className={styles.confirmModalContent}>
            <h3 className={styles.confirmModalTitle}>Очистити вибір?</h3>
            <p className={styles.confirmModalText}>
              Ви впевнені, що хочете видалити всі вибрані товари з кошика заявки?
            </p>
            <div className={styles.confirmModalActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setIsClearConfirmOpen(false)}
              >
                Скасувати
              </button>
              <button
                className={styles.confirmBtn}
                onClick={() => {
                  clearCart();
                  setIsClearConfirmOpen(false);
                }}
              >
                Очистити
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function BiPage() {
  return (
    <Suspense fallback={<Loader />}>
      <BiPageContent />
    </Suspense>
  );
}
