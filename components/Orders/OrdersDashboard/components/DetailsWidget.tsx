import { useQuery } from "@tanstack/react-query";
import { getOrdersDetailsById, getDeliveries, getWeightForProduct } from "@/lib/api";
import { Client, Contract, DeliveryRequest, OrdersDetails } from "@/types/types";
import styles from "../OrdersDashboard.module.css";
import { useMemo, useState, useEffect } from "react";
import { getInitData } from "@/lib/getInitData";
import React from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal/Modal";
import DetailsOrdersByProduct from "@/components/DetailsOrdersByProduct/DetailsOrdersByProduct";
import { Truck, Loader2 } from "lucide-react";
import { useDelivery } from "@/store/Delivery";
import OrderCommentBadge from "@/components/Orders/OrderCommentBadge/OrderCommentBadge";
import OrderCommentModal from "@/components/Orders/OrderCommentModal/OrderCommentModal";
import OrderChatPanel from "@/components/Orders/OrderChatPanel/OrderChatPanel";
import ChatFABButton from "@/components/Orders/ChatFABButton/ChatFABButton";

interface DetailsWidgetProps {
  initData: string;
  selectedClient: Client | null;
  selectedContracts: Contract[];
  showAllContracts: boolean;
}

export default function DetailsWidget({
  initData,
  selectedClient,
  selectedContracts,
  showAllContracts,
}: DetailsWidgetProps) {
  
  const contractsIds = useMemo(() => {
     return selectedContracts.map(c => c.contract_supplement).sort().join(",");
  }, [selectedContracts]);

  const [selectedProductForModal, setSelectedProductForModal] = useState<string | null>(null);
  const [commentModalData, setCommentModalData] = useState<{
    orderRef: string;
    productId?: string;
    productName?: string;
  } | null>(null);
  const [chatOrderRef, setChatOrderRef] = useState<string | null>(null);


   const router = useRouter();
  const { setDelivery, hasItem } = useDelivery();
  const [allDeliveries, setAllDeliveries] = useState<DeliveryRequest[]>([]);

  const getItemId = (item: OrdersDetails) => {
    return `${item.contract_supplement}_${item.nomenclature}_${item.party_sign || ""}_${item.buying_season || ""}`.trim();
  };

  const getProductName = (item: OrdersDetails) => {
    const parts = [];
    parts.push(item.nomenclature);
    if (item.party_sign && item.party_sign.trim() !== "") {
      parts.push(item.party_sign.trim());
    }
    if (item.buying_season && item.buying_season.trim() !== "") {
      parts.push(item.buying_season.trim());
    }
    return parts.join(" ").trim();
  };

  useEffect(() => {
    const loadDeliveries = async () => {
        try {
            const initDataVal = getInitData();
            const data = await getDeliveries(initDataVal);
            if (data) setAllDeliveries(data);
        } catch (e) {
            console.error("Error loading deliveries", e);
        }
    };
    loadDeliveries();
  }, [initData]);

  const getDeliveryForItem = (item: OrdersDetails) => {
    if (!allDeliveries || allDeliveries.length === 0) return null;
    const currentName = getProductName(item);
    return allDeliveries.find(d => 
        (d.status === "Створено" || d.status === "В роботі" || d.status === "created") &&
        d.items?.some(di => 
            di.order_ref?.trim() === item.contract_supplement.trim() && 
            di.product?.trim() === currentName
        )
    );
  };

  const handleRemainsClick = (item: OrdersDetails) => {
      if (item.buh > 0) {
          const searchParts = [item.nomenclature, item.party_sign, item.buying_season]
            .filter(part => part && part.trim() !== '')
            .join(' ');
            
          const searchQuery = encodeURIComponent(searchParts);
          router.push(`/remains?search=${searchQuery}`);
      }
  };

  const handleDemandClick = (item: OrdersDetails) => {
      if (item.product) {
          setSelectedProductForModal(item.product);
      }
  };

  const closeModal = () => {
      setSelectedProductForModal(null);
  };

  const [addingToDeliveryId, setAddingToDeliveryId] = useState<string | null>(null);

   const handleDeliveryClick = async (item: OrdersDetails) => {

    const combinedName = getProductName(item);
    const itemId = getItemId(item);
    
    if (hasItem(itemId)) {
        setDelivery({
            product: combinedName,
            nomenclature: item.nomenclature,
            quantity: item.different,
            manager: item.manager,
            order: item.contract_supplement,
            client: item.client,
            id: itemId,
            orders_q: item.orders_q,
            parties: item.parties,
            buh: item.buh,
            skl: item.skl,
            qok: item.qok,
            weight: 0
        });
        return;
    }

    const existingDelivery = getDeliveryForItem(item);
    if (existingDelivery) {
        const confirmAdd = window.confirm(
            `Цей товар уже у доставці №${existingDelivery.id} (статус: ${existingDelivery.status}).\nВи впевнені, що хочете додати його ще раз?`
        );
        if (!confirmAdd) return;
    }

    setAddingToDeliveryId(itemId);
    

    const weight = await getWeightForProduct({ 
      item: {
        product_id: item.product,
        parties: item.parties
      }, 
      initData 
    });


    const initialQty = item.different > 0 ? item.different : item.orders_q;

    const deliveryItem = {
      product: combinedName,
      nomenclature: item.nomenclature,
      quantity: initialQty,
      manager: item.manager,
      order: item.contract_supplement,
      client: item.client,
      id: itemId, 
      orders_q: item.orders_q,
      parties: item.parties,
      buh: item.buh,
      skl: item.skl,
      qok: item.qok,
      weight: weight,
    };
    
    setDelivery(deliveryItem);
    setAddingToDeliveryId(null);
  };

  const { data: detailsList, isLoading } = useQuery({
    queryKey: ["ordersDetailsFull", selectedClient?.id, contractsIds],
    queryFn: async () => {
        if (!selectedClient) return [];
        
        if (selectedContracts.length > 0) {
            const promises = selectedContracts.map(contract => 
                getOrdersDetailsById({ orderId: contract.contract_supplement, initData })
            );
            const results = await Promise.all(promises);
            return results.flat();
        }
        
         return [];
    },
    enabled: !!selectedClient && !!initData && (selectedContracts.length > 0 || showAllContracts)
  });

  const calculateTotalPartiesMoved = (parties: { moved_q: number }[] | undefined) => {
    return parties?.reduce((acc, p) => acc + (p.moved_q || 0), 0) || 0;
  };

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Доповнення</th>
            <th className={styles.th}>Товар</th>
            <th className={styles.th} style={{ width: "60px" }}>Кількість</th>
            <th className={styles.th}>Переміщено (Партії)</th>
            <th className={styles.th}>Залишки (Загальні)</th>
            <th className={styles.th}>Потреба по підрозділу</th>
            <th className={styles.th}>Готовність до відвантаження</th>
            <th className={styles.th} style={{ width: "40px", textAlign: "center" }}><Truck size={16} /></th>
            <th className={styles.th} style={{ width: "40px", textAlign: "center" }}>Коментарі</th>
          </tr>
        </thead>
        <tbody>
            {isLoading && (
                <tr>
                    <td colSpan={6} style={{padding: '10px', textAlign: 'center'}}>Завантаження даних...</td>
                </tr>
            )}
            
          {detailsList?.map((item: OrdersDetails) => {
             const itemId = getItemId(item);
            const isSelected = hasItem(itemId);
            const inDelivery = getDeliveryForItem(item);

            return (
              <tr 
                key={item.id} 
                className={`${isSelected ? styles.selectedRow : ""} ${inDelivery ? styles.alreadyInDeliveryRow : ""}`}
              >
                <td className={styles.td}>{item.contract_supplement}</td>
                 <td className={styles.td} title={item.nomenclature}>
                  {getProductName(item)}
                  {inDelivery && (
                    <span className={styles.deliveryBadge}>В доставці</span>
                  )}
                </td>
                <td className={styles.td}>{item.different}</td>
                <td className={styles.td}>
                  {item.parties?.length > 0 ? (
                    <div style={{ fontSize: "11px" }}>
                      {item.parties.map((p, i) => (
                        <div key={i}>
                          {p.moved_q} {p.party ? `(${p.party})` : ''}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ opacity: 0.5 }}>-</span>
                  )}
                </td>
                <td 
                  className={styles.td} 
                  onClick={() => handleRemainsClick(item)}
                  style={{ 
                      cursor: item.buh > 0 ? "pointer" : "default",
                      backgroundColor: item.buh > 0 ? "var(--hover-bg, rgba(0,0,0,0.02))" : "inherit"
                  }}
                  title={item.buh > 0 ? "Перейти до залишків" : ""}
                >
                  <div style={{ fontSize: "11px" }}>
                    <div>Бух: {item.buh}</div>
                    <div>Скл: {item.skl}</div>
                  </div>
                </td>
                <td 
                  className={styles.td}
                  onClick={() => handleDemandClick(item)}
                  style={{ cursor: "pointer" }}
                  title="Переглянути деталі заявок"
                >
                    {item.orders_q}
                </td> 
                  <td className={styles.td}>
                    {(() => {
                      const sumMovedQ = calculateTotalPartiesMoved(item.parties);
                      const ordersQ = Number(item.orders_q) || 0;
                      const buhQ = Number(item.buh) || 0;
                      const sklQ = Number(item.skl) || 0;
                      const diffQ = Number(item.different) || 0;

                      if (sumMovedQ === 0 && ordersQ > buhQ) {
                        return <span className={styles.checkmarkRed}>✓</span>;
                      }

                      if ((sumMovedQ >= diffQ && buhQ <= sklQ && buhQ>=sumMovedQ) || (ordersQ <= buhQ && buhQ <= sklQ)) {
                        return <span className={styles.checkmarkGreen}>✓</span>;
                      } else {
                        return <span className={styles.checkmarkYellow}>✓</span>;
                      }
                    })()}
                </td>
                
                <td 
                   className={styles.td}
                   style={{ 
                     textAlign: "center", 
                     cursor: "pointer",
                     color: isSelected ? "var(--primary-color, #2563eb)" : "inherit" 
                   }}
                   onClick={() => handleDeliveryClick(item)}
                   title={isSelected ? "Видалити з доставки" : "Додати до доставки"}
                >
                   {addingToDeliveryId === itemId ? (
                       <Loader2 size={18} className="animate-spin" />
                   ) : (
                       <Truck 
                         size={18} 
                         fill={isSelected ? "currentColor" : "none"}
                         strokeWidth={isSelected ? 0 : 2}
                       />
                   )}
                 </td>

                 <td 
                   className={styles.td}
                   style={{ textAlign: "center" }}
                 >
                   <OrderCommentBadge
                     orderRef={item.contract_supplement}
                     productId={item.product}
                      onClick={() => setCommentModalData({
                        orderRef: item.contract_supplement,
                        productId: item.product,
                        productName: getProductName(item),
                      })}
                   />
                  </td>

                </tr>
            );
          })}

          {!isLoading && (!detailsList || detailsList.length === 0) && (
            <tr>
              <td colSpan={6} style={{ padding: "20px", textAlign: "center", opacity: 0.6 }}>
                {selectedContracts.length > 0
                  ? "Даних не знайдено"
                  : "Оберіть доповнення"}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Плаваюча кнопка чату */}
      {selectedContracts.length > 0 && (
        <ChatFABButton 
          orderRef={selectedContracts[0].contract_supplement}
          onClick={() => setChatOrderRef(selectedContracts[0].contract_supplement)}
          initData={initData}
        />
      )}

      {selectedProductForModal && (
          <Modal onClose={closeModal}>
              <DetailsOrdersByProduct selectedProductId={selectedProductForModal} />
          </Modal>
      )}

      {commentModalData && (
        <OrderCommentModal
          orderRef={commentModalData.orderRef}
          commentType="product"
          productId={commentModalData.productId}
          productName={commentModalData.productName}
          onClose={() => setCommentModalData(null)}
        />
      )}

      {chatOrderRef && (
        <Modal onClose={() => setChatOrderRef(null)}>
          <OrderChatPanel orderRef={chatOrderRef} />
        </Modal>
      )}
    </div>
  );
}
