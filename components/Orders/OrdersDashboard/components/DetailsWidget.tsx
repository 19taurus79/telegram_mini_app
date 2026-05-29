"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getOrdersDetailsById, getDeliveries, getWeightForProduct, getOrderComments } from "@/lib/api";
import { Client, Contract, OrdersDetails, OrderComment, DeliveryRequest } from "@/types/types";
import styles from "../OrdersDashboard.module.css";
import { useMemo, useState } from "react";
import { useInitData } from "@/lib/useInitData";
import React from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal/Modal";
import DetailsOrdersByProduct from "@/components/DetailsOrdersByProduct/DetailsOrdersByProduct";
import DetailsRemains from "@/components/DetailsRemains/DetailsRemains";
import { Truck, Loader2, PlusCircle, Check } from "lucide-react";
import { useDelivery, DeliveryItem } from "@/store/Delivery";
import { useOrderCart } from "@/store/OrderCart";
import { useUser } from "@/store/User";
import OrderCommentBadge from "@/components/Orders/OrderCommentBadge/OrderCommentBadge";
import OrderCommentModal from "@/components/Orders/OrderCommentModal/OrderCommentModal";
import { CommentsProvider } from "@/components/Orders/CommentsContext";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { useReactToPrint } from "react-to-print";
import { FileDown, Printer } from "lucide-react";

type ValidationType = "outOfStock" | "maybeInTransit" | "insufficientMove" | "editingQuantity" | "deliveryStatusNoSeed" | "deliveryStatusNoOther" | "documentNotApproved" | "none";

interface ValidationModalState {
  isOpen: boolean;
  item: OrdersDetails | null;
  type: ValidationType;
  types?: ValidationType[];
}

const getItemStatus = (item: OrdersDetails) => {
  const sumMovedQ = item.parties?.reduce((acc, p) => acc + (p.moved_q || 0), 0) || 0;
  const ordersQ = Number(item.orders_q_total ?? item.orders_q) || 0;
  const buhQ = Number(item.buh) || 0;
  const sklQ = Number(item.skl) || 0;
  const diffQ = Number(item.different) || 0;

  let color: "red" | "green" | "yellow" | "none" = "yellow";
  let validationType: ValidationType = "none";

  if (buhQ === 0 && ordersQ === 0) {
    color = "none";
    validationType = "none";
  } else if (sumMovedQ === 0 && ordersQ > buhQ) {
    color = "red";
    validationType = "outOfStock";
  } else if ((sumMovedQ >= diffQ && buhQ <= sklQ && buhQ >= sumMovedQ && buhQ > 0) || (ordersQ <= buhQ && buhQ > 0 && buhQ <= sklQ)) {
    color = "green";
    validationType = "none";
  } else {
    color = "yellow";
    validationType = "maybeInTransit";
  }

  if (validationType === "none" || validationType === "maybeInTransit") {
    if (sumMovedQ > 0 && sumMovedQ < diffQ) {
      validationType = "insufficientMove";
    }
  }

  return { color, validationType, sumMovedQ, diffQ };
};


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

interface DetailsWidgetProps {
  initData: string;
  selectedClients: Client[];
  selectedContracts: Contract[];
  showAllContracts: boolean;
}

export default function DetailsWidget({
  initData,
  selectedClients,
  selectedContracts,
  showAllContracts,
}: DetailsWidgetProps) {
  const router = useRouter();
  const userData = useUser((state) => state.userData);
  const isAdmin = userData?.is_admin;
  const contractsIds = useMemo(() => {
     return selectedContracts.map(c => c.contract_supplement).sort().join(",");
  }, [selectedContracts]);

  const clientIds = useMemo(() => selectedClients.map(c => c.id).sort().join(','), [selectedClients]);

  const [selectedProductForModal, setSelectedProductForModal] = useState<string | null>(null);
  const [commentModalData, setCommentModalData] = useState<{
    orderRef: string;
    productId?: string;
    productName?: string;
  } | null>(null);
  const [selectedProductForRemainsModal, setSelectedProductForRemainsModal] = useState<{
    productId: string;
    partyNames: string[];
  } | null>(null);
  const [validationModal, setValidationModal] = useState<ValidationModalState>({
    isOpen: false,
    item: null,
    type: "none",
  });
  const [editQuantityValue, setEditQuantityValue] = useState<string>("");

  const effectiveInitData = useInitData();
  const { setDelivery, hasItem, updateQuantity } = useDelivery();
  const printableRef = React.useRef<HTMLDivElement>(null);

  const { selectedItems: cartItems, toggleItem: toggleCartItem, setItems: setCartItems, hasItem: hasCartItem } = useOrderCart();

  const { data: detailsList, isLoading } = useQuery<OrdersDetails[]>({
    queryKey: ["ordersDetailsFull", clientIds, contractsIds],
    queryFn: async () => {
        if (selectedClients.length === 0) return [];
        if (selectedContracts.length > 0) {
            const contractIdsList = selectedContracts.map(c => c.contract_supplement);
            return getOrdersDetailsById({ orderId: contractIdsList, initData });
        }
         return [];
    },
    enabled: selectedClients.length > 0 && !!initData && (selectedContracts.length > 0 || showAllContracts)
  });

  const handleCartItemToggle = (item: OrdersDetails) => {
    toggleCartItem({
      id: getItemId(item),
      product: getProductName(item),
      nomenclature: item.nomenclature,
      party_sign: item.party_sign,
      buying_season: item.buying_season,
      different: item.different,
      orders_q: item.orders_q_total ?? item.orders_q,
      client: item.client,
      contract_supplement: item.contract_supplement,
      manager: item.manager,
      buh: item.buh,
      skl: item.skl,
      qok: item.qok,
      line_of_business: item.line_of_business,
    });
  };

  const isAllSelected = useMemo(() => {
    if (!detailsList || detailsList.length === 0) return false;
    return detailsList.every(item => hasCartItem(getItemId(item)));
  }, [detailsList, cartItems, hasCartItem]);

  const handleSelectAllChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!detailsList) return;
    if (e.target.checked) {
      const newItems = [...cartItems];
      detailsList.forEach(item => {
        const id = getItemId(item);
        if (!newItems.some(ni => ni.id === id)) {
          newItems.push({
            id,
            product: getProductName(item),
            nomenclature: item.nomenclature,
            party_sign: item.party_sign,
            buying_season: item.buying_season,
            different: item.different,
            orders_q: item.orders_q_total ?? item.orders_q,
            client: item.client,
            contract_supplement: item.contract_supplement,
            manager: item.manager,
            buh: item.buh,
            skl: item.skl,
            qok: item.qok,
            line_of_business: item.line_of_business,
          });
        }
      });
      setCartItems(newItems);
    } else {
      const displayIds = new Set(detailsList.map(getItemId));
      const filtered = cartItems.filter(ci => !displayIds.has(ci.id));
      setCartItems(filtered);
    }
  };

  const handleLoadToBi = () => {
    toast.success(`Завантажено ${cartItems.length} товарів у вкладку Замовити!`);
    router.push("/bi?showSelected=true");
  };

  const handlePrint = useReactToPrint({
    contentRef: printableRef,
    documentTitle: `Деталі_замовлення_${new Date().toLocaleDateString()}`,
  });

  const handleExportExcel = () => {
    if (!detailsList || detailsList.length === 0) {
      toast.error("Немає даних для експорту");
      return;
    }

    const dataToExport = detailsList.map(item => ({
      "Клієнт": item.client || "—",
      "Доповнення": item.contract_supplement,
      "Товар": getProductName(item),
      "Кількість": item.different,
      "Переміщено": item.parties?.map(p => `${p.moved_q}${p.party ? ` (${p.party})` : ''}`).join(", ") || "-",
      "Бух. залишок": item.buh,
      "Скл. залишок": item.skl,
      "Потреба": item.orders_q_total ?? item.orders_q
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Details");
    XLSX.writeFile(wb, `Order_Details_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Excel файл згенеровано");
  };


  const { data: allDeliveries } = useQuery<DeliveryRequest[]>({
    queryKey: ["deliveries"],
    queryFn: async () => {
        try {
            const data = await getDeliveries(effectiveInitData);
            return data || [];
        } catch (e) {
            console.error("Error loading deliveries", e);
            return [];
        }
    },
    enabled: !!effectiveInitData
  });

  const getDeliveryForItem = (item: OrdersDetails) => {
    if (!allDeliveries || allDeliveries.length === 0) return null;
    const currentName = getProductName(item);
    
    // Находим все активные доставки для этого товара
    const matchingDeliveries = allDeliveries.filter(d => {
        const activeStatuses = ["Створено", "В роботі", "created", "inprogress", "Доставка з ЦО на клієнта"];
        if (!activeStatuses.some(s => s.toLowerCase() === d.status?.toLowerCase())) return false;
        
        return d.items?.some(di => {
            const diRefMatch = !di.order_ref || (di.order_ref as string).trim() === item.contract_supplement.trim();
            const diProductMatch = di.product?.trim() === currentName;
            return diRefMatch && diProductMatch;
        });
    });

    if (matchingDeliveries.length === 0) return null;

    // Приоритет статусу ЦО
    const coDelivery = matchingDeliveries.find(d => d.status?.toLowerCase().includes("цо"));
    return coDelivery || matchingDeliveries[0];
  };

  const handleRemainsClick = (item: OrdersDetails) => {
    if (item.buh > 0) {
      const fullName = getProductName(item);
      const searchParam = encodeURIComponent(fullName);
      const productIdParam = encodeURIComponent(item.product);
      router.push(`/remains?search=${searchParam}&productId=${productIdParam}`);
    }
  };

  const handlePartyClick = (item: OrdersDetails) => {
    if (item.parties && item.parties.length > 0) {
      setSelectedProductForRemainsModal({
        productId: item.product,
        partyNames: item.parties.map(p => p.party).filter(Boolean)
      });
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

  const handleAddToDelivery = async (item: OrdersDetails, customQty?: number) => {
    const itemId = getItemId(item);
    const combinedName = getProductName(item);
    const isAlreadyIn = hasItem(itemId);

    setAddingToDeliveryId(itemId);
    try {
        const weight = await getWeightForProduct({ 
          item: {
            product_id: item.product,
            parties: item.parties
          }, 
          initData 
        });

        const initialQty = customQty !== undefined ? customQty : (item.different > 0 ? item.different : (item.orders_q_total ?? item.orders_q));

        if (isAlreadyIn) {
            updateQuantity(itemId, initialQty);
        } else {
            const deliveryItem = {
              product: combinedName,
              nomenclature: item.nomenclature,
              quantity: initialQty,
              manager: item.manager,
              order: item.contract_supplement,
              client: item.client,
              id: itemId, 
              orders_q: item.orders_q_total ?? item.orders_q,
              parties: item.parties,
              buh: item.buh,
              skl: item.skl,
              qok: item.qok,
              weight: weight,
            };
            setDelivery(deliveryItem);
        }
        toast.success(`Оновлено: ${combinedName} (${initialQty})`);
    } catch (e) {
        console.error("Error adding to delivery", e);
    } finally {
        setAddingToDeliveryId(null);
    }
  };

   const handleDeliveryClick = async (item: OrdersDetails) => {
    const itemId = getItemId(item);
    
    if (hasItem(itemId)) {
        setDelivery({ id: itemId } as DeliveryItem); 
        return;
    }

    const parentContract = selectedContracts.find(c => c.contract_supplement.trim() === item.contract_supplement.trim());
    const deliveryStatus = item.delivery_status || parentContract?.delivery_status;
    const lineOfBusiness = item.line_of_business || parentContract?.line_of_business;
    const isSeed = ["Насіння", "Власне виробництво насіння"].includes(lineOfBusiness || "");

    const documentStatus = item.document_status || parentContract?.document_status;

    const warnings: ValidationType[] = [];
    
    if (deliveryStatus?.toLowerCase().includes("ні")) {
        warnings.push(isSeed ? "deliveryStatusNoSeed" : "deliveryStatusNoOther");
    }

    if (documentStatus && documentStatus !== "затверджено") {
        warnings.push("documentNotApproved");
    }

    const { validationType } = getItemStatus(item);
    if (validationType !== "none") {
        warnings.push(validationType);
    }

    if (warnings.length > 0) {
        setValidationModal({
            isOpen: true,
            item,
            type: warnings[0],
            types: warnings
        });
        if (deliveryStatus?.toLowerCase().includes("ні") || (documentStatus && documentStatus !== "затверджено")) {
            toast.error("Зверніть увагу на статус заявки!");
        }
        return;
    }

    const existingDelivery = getDeliveryForItem(item);
    if (existingDelivery) {
        const confirmAdd = window.confirm(
            `Цей товар уже у доставці №${existingDelivery.id} (статус: ${existingDelivery.status}).\nВи впевнені, що хочете додати його ще раз?`
        );
        if (!confirmAdd) return;
    }

    await handleAddToDelivery(item);
  };



  const queryClient = useQueryClient();

  const { data: batchCommentsData, isLoading: isCommentsBatchLoading, isFetched: isCommentsFetched } = useQuery({
    queryKey: ["batchComments", contractsIds],
    queryFn: async () => {
        const refs = selectedContracts.map(c => c.contract_supplement);
        const allComments = await getOrderComments(refs, undefined, initData);
        refs.forEach(ref => {
            const contractComments = allComments.filter(c => c.order_ref === ref);
            queryClient.setQueryData(["comments", ref], contractComments);
        });
        return allComments;
    },
    enabled: selectedContracts.length > 0 && !!initData
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

  return (
    <CommentsProvider value={{ commentsMap, isLoading: isCommentsBatchLoading, isFetched: isCommentsFetched }}>
      <div className={styles.widgetHeader}>
        <div className={styles.headerLeft}>
          <span style={{ opacity: 0.6, fontSize: '0.8rem' }}>
            {detailsList ? `Знайдено рядків: ${detailsList.length}` : 'Виберіть доповнення'}
          </span>
        </div>
        <div className={styles.headerActions}>
          {isAdmin && cartItems.length > 0 && (
            <button className={`${styles.actionBtn} ${styles.biBtn}`} onClick={handleLoadToBi} style={{ background: 'var(--accent-green)', color: '#000' }}>
              <PlusCircle size={16} />
              <span>Замовити ({cartItems.length})</span>
            </button>
          )}
          <button className={`${styles.actionBtn} ${styles.excelBtn}`} onClick={handleExportExcel}>
            <FileDown size={16} />
            <span>Зберегти в Excel</span>
          </button>
          <button className={`${styles.actionBtn} ${styles.printBtn}`} onClick={() => handlePrint()}>
            <Printer size={16} />
            <span>Друк</span>
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              {isAdmin && (
                <th className={styles.th} style={{ width: "40px", textAlign: "center" }}>
                  <label className={styles.customCheckboxContainer}>
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAllChange} 
                      checked={isAllSelected}
                      className={styles.customCheckboxInput}
                    />
                    <div className={styles.customCheckboxControl}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                  </label>
                </th>
              )}
              <th className={styles.th}>Доповнення</th>
              <th className={styles.th}>Товар</th>
              <th className={styles.th} style={{ width: "60px" }}>Кількість</th>
              <th className={styles.th}>Переміщено (Партії)</th>
              <th className={styles.th}>Залишки (Загальні)</th>
              <th className={styles.th}>Потреба</th>
              <th className={styles.th} style={{ width: "40px", textAlign: "center" }}><Truck size={16} /></th>
              <th className={styles.th} style={{ width: "40px", textAlign: "center" }}>Коментарі</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={isAdmin ? 9 : 8} style={{padding: '10px', textAlign: 'center'}}>Завантаження даних...</td>
              </tr>
            )}
            
            {(() => {
              if (!detailsList || detailsList.length === 0) {
                return !isLoading ? (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 8} style={{ padding: "20px", textAlign: "center", opacity: 0.6 }}>
                      {selectedContracts.length > 0 ? "Даних не знайдено" : "Оберіть доповнення"}
                    </td>
                  </tr>
                ) : null;
              }

              const grouped: { client: string; items: OrdersDetails[] }[] = [];
              const clientMap = new Map<string, OrdersDetails[]>();
              detailsList.forEach((item: OrdersDetails) => {
                const key = item.client || "—";
                if (!clientMap.has(key)) {
                  clientMap.set(key, []);
                  grouped.push({ client: key, items: clientMap.get(key)! });
                }
                clientMap.get(key)!.push(item);
              });

              return grouped.map((group) => (
                <React.Fragment key={group.client}>
                  <tr>
                    <td colSpan={isAdmin ? 9 : 8} className={styles.clientGroupHeader}>👤 {group.client}</td>
                  </tr>
                  {group.items.map((item: OrdersDetails) => {
                    const itemId = getItemId(item);
                    const isSelected = hasItem(itemId);
                    const inDelivery = getDeliveryForItem(item);

                    return (
                      <tr 
                        key={item.id} 
                        className={`${isSelected ? styles.selectedRow : ""} ${inDelivery ? styles.alreadyInDeliveryRow : ""} ${item.has_draft ? styles.draftRow : ""}`}
                      >
                        {isAdmin && (
                          <td className={styles.td} style={{ textAlign: "center" }}>
                            <label className={styles.customCheckboxContainer} onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={hasCartItem(itemId)} 
                                onChange={() => handleCartItemToggle(item)} 
                                className={styles.customCheckboxInput}
                              />
                              <div className={styles.customCheckboxControl}>
                                <Check size={12} strokeWidth={3} />
                              </div>
                            </label>
                          </td>
                        )}
                        <td className={styles.td}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 700 }}>{item.contract_supplement}</span>

                          </div>
                        </td>
                        <td className={styles.td}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span>{getProductName(item)}</span>

                          </div>
                          {inDelivery && (
                            <span className={`${styles.deliveryBadge} ${inDelivery.status?.toLowerCase().includes("цо") ? styles.badgeCO : ""}`}>
                              {inDelivery.status?.toLowerCase().includes("цо") 
                                ? "ДОСТАВКА З ЦО" 
                                : `В доставці ${inDelivery.delivery_date ? `(${inDelivery.delivery_date})` : ""}`}
                            </span>
                          )}
                        </td>
                        <td className={styles.td} style={{ textAlign: 'center', fontWeight: 600 }}>
                          {(() => {
                            const need = Number(item.orders_q_total ?? item.orders_q) || 0;
                            const buh = Number(item.buh) || 0;
                            const skl = Number(item.skl) || 0;
                            const sumMoved = item.parties?.reduce((acc, p) => acc + (p.moved_q || 0), 0) || 0;

                            // Якщо бух = 0 і потреба = 0 — світлофора немає
                            if (buh === 0 && need === 0) {
                              return <span>{item.different}</span>;
                            }

                            let dotColor: string;
                            if (buh >= need && skl >= need) {
                              dotColor = '#4ade80'; // зелений — вистачає всього
                            } else if (buh >= need) {
                              dotColor = '#facc15'; // жовтий — бух ок, склад ні
                            } else if (sumMoved > 0 && sumMoved <= buh) {
                              dotColor = '#facc15'; // жовтий — бух менше потреби, але є переміщення в межах бух
                            } else {
                              dotColor = '#ef4444'; // червоний — бух не покриває потребу
                            }

                            return (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <span style={{
                                  display: 'inline-block',
                                  width: '10px',
                                  height: '10px',
                                  borderRadius: '50%',
                                  background: dotColor,
                                  flexShrink: 0,
                                  boxShadow: `0 0 6px ${dotColor}`,
                                }} />
                                <span>{item.different}</span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className={styles.td} onClick={() => handlePartyClick(item)} style={{ cursor: item.parties?.length > 0 ? "pointer" : "default" }}>
                          {item.parties?.length > 0 ? (
                            <div style={{ fontSize: "11px" }}>
                              {item.parties.map((p, i) => (
                                <div key={i}>{p.moved_q} {p.party ? `(${p.party})` : ''}</div>
                              ))}
                            </div>
                          ) : "-"}
                        </td>
                        <td className={styles.td} onClick={() => handleRemainsClick(item)} style={{ cursor: item.buh > 0 ? "pointer" : "default" }}>
                          <div style={{ fontSize: "11px" }}>
                            <div>Бух: {item.buh}</div>
                            <div>Скл: {item.skl}</div>
                          </div>
                        </td>
                        <td className={styles.td} onClick={() => handleDemandClick(item)} style={{ cursor: "pointer", textAlign: 'center', fontWeight: 600 }}>
                          {item.orders_q_total ?? item.orders_q}
                        </td>
                        <td className={styles.td} style={{ textAlign: "center", cursor: "pointer" }} onClick={() => handleDeliveryClick(item)}>
                          {addingToDeliveryId === itemId ? <Loader2 size={18} className="animate-spin" /> : <Truck size={18} fill={isSelected ? "currentColor" : "none"} strokeWidth={isSelected ? 0 : 2} />}
                        </td>
                         <td className={styles.td} style={{ textAlign: "center" }}>
                           <OrderCommentBadge orderRef={item.contract_supplement} productName={getProductName(item)} initData={effectiveInitData} onClick={() => setCommentModalData({ orderRef: item.contract_supplement, productId: item.product, productName: getProductName(item) })} />
                         </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ));
            })()}
          </tbody>
        </table>
      </div>

      {selectedProductForModal && (
        <Modal onClose={closeModal}><DetailsOrdersByProduct selectedProductId={selectedProductForModal} /></Modal>
      )}

      {commentModalData && (
        <OrderCommentModal orderRef={commentModalData.orderRef} commentType="product" productId={commentModalData.productId} productName={commentModalData.productName} onClose={() => setCommentModalData(null)} />
      )}

      {selectedProductForRemainsModal && (
        <Modal onClose={() => setSelectedProductForRemainsModal(null)}><DetailsRemains selectedProductId={selectedProductForRemainsModal.productId} filterParties={selectedProductForRemainsModal.partyNames} /></Modal>
      )}

      {validationModal.isOpen && validationModal.item && (
        <Modal onClose={() => setValidationModal({ isOpen: false, item: null, type: "none" })}>
          <div className={styles.validationModalContent}>
            <h4 className={styles.modalTitle}>
              {validationModal.type === "editingQuantity" ? "Зміна кількості" : "Увага!"}
            </h4>
            <div className={styles.modalBody}>
              {(validationModal.types || [validationModal.type]).map((type, idx) => (
                <div key={type} style={{ marginBottom: idx < (validationModal.types?.length || 1) - 1 ? '12px' : 0 }}>
                  {type === "outOfStock" && <p>Даного товару немає в наявності</p>}
                  {type === "maybeInTransit" && <p>Можливо цього товару або цієї партії ще немає фізично на складі, можливо він в дорозі</p>}
                  {type === "insufficientMove" && <p>Під цю заявку переміщено товару менше, ніж ви хочете відправити</p>}
                  {type === "deliveryStatusNoSeed" && <p>Заявка має статус &quot;До постачання: Ні&quot;. Швидше за все, насіння під цю заявку не було замовлено. Зверніться у відповідний відділ для зміни статусу.</p>}
                  {type === "deliveryStatusNoOther" && <p>Заявка має статус &quot;До постачання: Ні&quot;. Можуть виникнути проблеми з випискою документів. Зверніться у відповідний відділ для зміни статусу.</p>}
                  {type === "documentNotApproved" && (
                    <p>
                        Заявка не має статусу &quot;Затверджено&quot; (поточний статус: <b>{validationModal.item?.document_status}</b>). 
                        Доставка може бути затримана до моменту затвердження.
                    </p>
                  )}
                </div>
              ))}
              
              {validationModal.type === "editingQuantity" && (
                <div className={styles.editQtyContainer}>
                   <label htmlFor="deskQtyInput" className={styles.inputLabel}>Введіть кількість:</label>
                   <input id="deskQtyInput" type="number" className={styles.modalInput} value={editQuantityValue} onChange={(e) => setEditQuantityValue(e.target.value)} autoFocus />
                </div>
              )}
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setValidationModal({ isOpen: false, item: null, type: "none" })}>Скасувати</button>
              
              {validationModal.type === "insufficientMove" && (
                <button 
                  className={styles.changeQtyBtn} 
                  onClick={() => {
                    const { sumMovedQ } = getItemStatus(validationModal.item!);
                    setEditQuantityValue(String(sumMovedQ));
                    setValidationModal(prev => ({ ...prev, type: "editingQuantity" }));
                  }}
                >
                  Змінити кількість
                </button>
              )}
              
              <button 
                className={styles.confirmBtn} 
                onClick={async () => {
                  const item = validationModal.item!;
                  if (validationModal.type === "editingQuantity") {
                    const qty = Number(editQuantityValue);
                    if (isNaN(qty) || qty < 0) {
                        toast.error("Введіть коректну кількість");
                        return;
                    }
                    setValidationModal({ isOpen: false, item: null, type: "none" });
                    await handleAddToDelivery(item, qty);
                  } else {
                    setValidationModal({ isOpen: false, item: null, type: "none" });
                    await handleAddToDelivery(item);
                  }
                }}
              >
                {validationModal.type === "editingQuantity" ? "Зберегти" : (validationModal.type === "insufficientMove" ? "Продовжити все одно" : "Додати все одно")}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Hidden Printable Area */}
      <div className={styles.printableArea} ref={printableRef}>
        <div className={styles.printHeader}>
          <h2>Деталі замовлення</h2>
          <p>Дата формування: {new Date().toLocaleString('uk-UA')}</p>
        </div>
        
        <table className={styles.printTable}>
          <thead>
            <tr>
              <th style={{ width: '10%' }}>Доповнення</th>
              <th style={{ width: '30%' }}>Товар</th>
              <th style={{ width: '8%', textAlign: 'center' }}>Кіл-ть</th>
              <th style={{ width: '20%' }}>Партії / Переміщено</th>
              <th>Бул/Скл</th>
              <th>Потреба</th>
              
              <th style={{ width: '15%' }}>Примітки</th>
            </tr>
          </thead>
          <tbody>
            {(detailsList && detailsList.length > 0) && (
              (() => {
                const sortedItems = [...detailsList].sort((a,b) => (a.client || "").localeCompare(b.client || ""));
                return sortedItems.map((item, index) => {
                  const showClientHeader = index === 0 || (sortedItems[index - 1].client !== item.client);
                  const delivery = getDeliveryForItem(item);
                  const hasInLocalDelivery = hasItem(getItemId(item));
                  const itemComments = (commentsMap[item.contract_supplement] || []).filter(c => c.product_id === item.product);

                  return (
                    <React.Fragment key={`${item.id}_${index}`}>
                      {showClientHeader && (
                        <tr className={styles.printClientHeader}>
                          <td colSpan={7}><strong>{item.client || "—"}</strong></td>
                        </tr>
                      )}
                      <tr>
                        <td>{item.contract_supplement}</td>
                        <td>{getProductName(item)}</td>
                        <td style={{ textAlign: 'center' }}><strong>{item.different}</strong></td>
                        <td>
                          {item.parties && item.parties.length > 0 ? (
                            item.parties.map((p, pIdx) => (
                              <div key={pIdx} style={{ fontSize: '9pt' }}>
                                {p.party ? `${p.party}: ` : ''}{p.moved_q}
                              </div>
                            ))
                          ) : "—"}
                        </td>
                        <td>{item.buh} / {item.skl}</td>
                        <td>{item.orders_q_total ?? item.orders_q}</td>

                        <td>
                          <div style={{ fontSize: '8pt' }}>
                            {delivery && <div>🚛 Доставка ({delivery.status})</div>}
                            {hasInLocalDelivery && <div>🛒 У кошику</div>}
                            {itemComments.map((c, i) => (
                              <div key={i} style={{ fontStyle: 'italic', borderTop: i > 0 ? '1px solid #eee' : 'none' }}>
                                • {c.comment_text}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                });
              })()
            )}
          </tbody>
        </table>
      </div>
    </CommentsProvider>
  );
}
