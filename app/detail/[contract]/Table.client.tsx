"use client";
import { useQuery } from "@tanstack/react-query";
import { useDelivery } from "@/store/Delivery";
import css from "./Detail.module.css";
import {
  getDeliveries,
  getIdRemainsByParty,
  getWeightForProduct,
} from "@/lib/api";
import { Loader2, Check, ExternalLink } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useInitData } from "@/lib/useInitData";
import React from "react";
import toast from "react-hot-toast";
import OrderCommentBadge from "@/components/Orders/OrderCommentBadge/OrderCommentBadge";
import OrderCommentModal from "@/components/Orders/OrderCommentModal/OrderCommentModal";
import DraggableChatModal from "@/components/DraggableChatModal/DraggableChatModal";
import ChatFABButton from "@/components/Orders/ChatFABButton/ChatFABButton";
import Modal from "@/components/Modal/Modal";
import DeliveryBtn from "@/components/DeliveryBtn/DeliveryBtn";

type OrderDetailItem = {
  orders_q: number;
  buh: number;
  skl: number;
  qok: string;
  product: string;
  quantity: number;
  client: string;
  manager: string;
  order: string;
  id: string;
  product_id: string;
  nomenclature: string;
  total_weight?: number; 
  parties: {
    party: string;
    moved_q: number;
  }[];
  delivery_status?: string;
  document_status?: string;
  line_of_business?: string;
};

type Detail = {
  details: OrderDetailItem[];
};

type ValidationType = "outOfStock" | "maybeInTransit" | "insufficientMove" | "editingQuantity" | "deliveryStatusNoSeed" | "deliveryStatusNoOther" | "documentNotApproved" | "none";

interface ValidationModalState {
  isOpen: boolean;
  item: OrderDetailItem | null;
  type: ValidationType;
  types?: ValidationType[];
}

const getItemStatus = (item: OrderDetailItem) => {
  const sumMovedQ = item.parties?.reduce((acc, p) => acc + (p.moved_q || 0), 0) || 0;
  const ordersQ = Number(item.orders_q) || 0;
  const buhQ = Number(item.buh) || 0;
  const sklQ = Number(item.skl) || 0;
  const diffQ = Number(item.quantity) || 0;

  let color: "red" | "green" | "yellow" = "yellow";
  let validationType: ValidationType = "none";

  if (sumMovedQ === 0 && (ordersQ > buhQ || (ordersQ === 0 && buhQ === 0))) {
    color = "red";
    validationType = "outOfStock";
  } else if ((sumMovedQ >= diffQ && buhQ <= sklQ && buhQ >= sumMovedQ && buhQ > 0) || (ordersQ <= buhQ && buhQ > 0 && buhQ <= sklQ)) {
    color = "green";
    validationType = "none";
  } else {
    color = "yellow";
    validationType = "maybeInTransit";
  }

  // Дополнительная проверка на количество перемещенного товара
  if (validationType === "none" || validationType === "maybeInTransit") {
    if (sumMovedQ > 0 && sumMovedQ < diffQ) {
      validationType = "insufficientMove";
    }
  }

  return { color, validationType, sumMovedQ, diffQ };
};

function TableOrderDetail({ details }: Detail) {
  const { delivery, setDelivery, updateQuantity, hasItem } = useDelivery();
  const [addingToDeliveryId, setAddingToDeliveryId] = React.useState<string | null>(null);
  const [commentModalData, setCommentModalData] = React.useState<{
    orderRef: string;
    productId: string;
    productName: string;
  } | null>(null);
  const [chatOrderRef, setChatOrderRef] = React.useState<string | null>(null);
  const [openedFromLink, setOpenedFromLink] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [validationModal, setValidationModal] = React.useState<ValidationModalState>({
    isOpen: false,
    item: null,
    type: "none",
  });
  const [editQuantityValue, setEditQuantityValue] = React.useState<string>("");
  
  const initData = useInitData();
  const searchParams = useSearchParams();

  // Детекція мобільного пристрою
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { data: allDeliveries } = useQuery({
    queryKey: ["deliveries"],
    queryFn: async () => {
        try {
            const data = await getDeliveries(initData);
            return data || [];
        } catch (e) {
            console.error("Error loading deliveries", e);
            return [];
        }
    },
    enabled: !!initData
  });

  // Автоматичне відкриття чату при наявності URL параметра
  React.useEffect(() => {
    const openChat = searchParams.get('openChat');
    if (openChat === 'true' && details.length > 0) {
      setChatOrderRef(details[0].order);
      setIsChatOpen(true);
      setOpenedFromLink(true);
    }
  }, [searchParams, details]);

  const getDeliveryForItem = (item: OrderDetailItem) => {
    if (!allDeliveries || allDeliveries.length === 0) return null;
    
    const delivery = allDeliveries.find(d => {
        const activeStatuses = ["Створено", "В роботі", "created", "inprogress", "Доставка з ЦО на клієнта"];
        const statusMatch = activeStatuses.some(s => s.toLowerCase() === d.status?.toLowerCase());
        if (!statusMatch) return false;
        
        return d.items?.some(di => {
             const isRefNull = !di.order_ref;
             const diRefMatch = isRefNull ? true : (di.order_ref || "").trim() === item.order.trim();
             const diProductMatch = di.product?.trim() === item.product.trim();
             return diRefMatch && diProductMatch;
        });
    });
    
    return delivery;
  };

  const handleAddToDelivery = async (item: OrderDetailItem, customQty?: number) => {
    const itemId = item.id;
    const isAlreadyIn = hasItem(itemId);

    if (!isAlreadyIn) {
        const existingDelivery = getDeliveryForItem(item);
        if (existingDelivery) {
            const confirmAdd = window.confirm(
                `Цей товар уже у доставці №${existingDelivery.id} (статус: ${existingDelivery.status}).\nВи впевнені, що хочете додати його ще раз?`
            );
            if (!confirmAdd) return;
        }
    }

    setAddingToDeliveryId(itemId);
    try {
        const weight = await getWeightForProduct({ item, initData });
        const finalQty = customQty !== undefined ? customQty : (item.quantity > 0 ? item.quantity : item.orders_q);
        
        if (isAlreadyIn) {
            updateQuantity(itemId, finalQty);
        } else {
            setDelivery({ ...item, quantity: finalQty, weight });
        }
        
        toast.success(`Оновлено: ${item.product} (Кількість: ${finalQty})`);
    } catch (e) {
        console.error("Error adding to delivery", e);
        const finalQty = customQty !== undefined ? customQty : item.quantity;
        if (isAlreadyIn) {
             updateQuantity(itemId, finalQty);
        } else {
             setDelivery({ ...item, quantity: finalQty, weight: 0 });
        }
        toast.error("Додано без ваги (помилка розрахунку)");
    } finally {
        setAddingToDeliveryId(null);
    }
  };

  const isSelected = (id: string) => delivery.some((el) => el.id === id);

  const router = useRouter();
  const HandleClick = async ({ party }: { party: string }) => {
    try {
      const remainsId = await getIdRemainsByParty({ party, initData });
      if (remainsId && remainsId.length > 0 && remainsId[0]?.id) {
          router.push(`/party_data/${remainsId[0].id}`);
      } else {
          toast.error("Дані про партію не знайдено");
      }
    } catch (e) {
      console.error("Error fetching remains id", e);
      toast.error("Помилка при отриманні даних партії");
    }
  };

  return (
    <div className={css.listContainer}>
      {/* Header */}
      <div className={css.listHeader}>
        <div className={css.headerCellProduct}>Номенклатура</div>
        <div className={css.headerCellQuantity}>Кількість</div>
      </div>

      {/* List of Cards */}
      {details.map((item) => (
        <div
          key={item.id}
          className={`${css.productCard} ${
            isSelected(item.id) ? css.selected : ""
          } ${getDeliveryForItem(item) ? css.alreadyInDelivery : ""}`}
          onClick={async () => {
            if (addingToDeliveryId === item.id) return;
            
            const isItemInDelivery = isSelected(item.id);
            if (!isItemInDelivery) {
                 const deliveryStatus = item.delivery_status;
                 const documentStatus = item.document_status;
                 const lineOfBusiness = item.line_of_business;
                 const isSeed = ["Насіння", "Власне виробництво насіння"].includes(lineOfBusiness || "");

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
                 await handleAddToDelivery(item);
            } else {
                setDelivery(item);
                toast.success(`Вилучено: ${item.product}`);
            }
         }}
        >
          {/* Main Product Row */}
          <div className={css.cardRow}>
            <div className={css.cardCellProduct}>
              <div className={css.productNameWrapper}>
                <span className={css.productName}>{item.product}</span>
                {isSelected(item.id) && (
                    <div className={css.selectionIndicator}>
                        <Check size={14} strokeWidth={3} />
                    </div>
                )}
              </div>
              {getDeliveryForItem(item) && (
                  <span className={`${css.deliveryBadge} ${getDeliveryForItem(item)?.status?.toLowerCase().includes("цо") ? css.badgeCO : ""}`}>
                    <ExternalLink size={10} className="mr-1" />
                    {getDeliveryForItem(item)?.status?.toLowerCase().includes("цо") 
                      ? "ДОСТАВКА З ЦО" 
                      : `В доставці ${getDeliveryForItem(item)?.delivery_date ? `(${getDeliveryForItem(item)?.delivery_date})` : ""}`}
                  </span>
              )}
              {addingToDeliveryId === item.id && (
                  <Loader2 className="animate-spin ml-2 h-4 w-4 inline text-accent-green" />
              )}
            </div>
            <div
              className={`${css.cardCellQuantity} ${css.centr} ${(() => {
                const { color } = getItemStatus(item);
                if (color === "red") return css.checkmarkRed;
                if (color === "green") return css.checkmarkGreen;
                return css.checkmarkYellow;
              })()}`}
            >
              {item.quantity}
            </div>
            <div className={css.commentBadgeCell} onClick={(e) => e.stopPropagation()}>
              <OrderCommentBadge
                orderRef={item.order}
                productName={item.product}
                onClick={() =>
                  setCommentModalData({
                    orderRef: item.order,
                    productId: item.product_id,
                    productName: item.product,
                  })
                }
              />
            </div>
          </div>

          {/* Party Rows */}
          {item.parties &&
            item.parties.length > 0 &&
            item.parties.some((p) => p.moved_q > 0) && (
              <div className={css.partySection}>
                {item.parties.map(
                  (party, index) =>
                    party.moved_q > 0 && (
                      <div
                        className={`${css.cardRow} ${css.partyRow}`}
                        key={index}
                      >
                        <div
                          className={`${css.cardCellProduct} ${css.party}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            HandleClick(party);
                          }}
                        >
                          {party.party}
                        </div>
                        <div
                          className={`${css.cardCellQuantity} ${css.qParty}`}
                        >
                          {party.moved_q}
                        </div>
                      </div>
                    )
                )}
              </div>
            )}
        </div>
      ))}

      {commentModalData && (
        <OrderCommentModal
          orderRef={commentModalData.orderRef}
          commentType="product"
          productId={commentModalData.productId}
          productName={commentModalData.productName}
          onClose={() => setCommentModalData(null)}
        />
      )}

      {details.length > 0 && details[0]?.order && (isMobile ? !chatOrderRef : !isChatOpen) && (
        <ChatFABButton
          orderRef={details[0].order}
          onClick={() => {
            if (isMobile) {
              setChatOrderRef(details[0].order);
            } else {
              setIsChatOpen(true);
            }
          }}
          initData={initData}
        />
      )}

      {/* Валідаційна модалка */}
      {validationModal.isOpen && validationModal.item && (
        <Modal onClose={() => setValidationModal({ isOpen: false, item: null, type: "none" })}>
          <div className={css.validationModalContent}>
            <h4 className={css.modalTitle}>
              {validationModal.type === "editingQuantity" ? "Зміна кількості" : "Увага!"}
            </h4>
            <div className={css.modalBody}>
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
                <div className={css.editQtyContainer}>
                   <label htmlFor="qtyInput" className={css.inputLabel}>Введіть кількість:</label>
                   <input 
                      id="qtyInput"
                      type="number" 
                      className={css.modalInput}
                      value={editQuantityValue}
                      onChange={(e) => setEditQuantityValue(e.target.value)}
                      autoFocus
                   />
                </div>
              )}
            </div>
            <div className={css.modalActions}>
              <button 
                className={css.cancelBtn} 
                onClick={() => setValidationModal({ isOpen: false, item: null, type: "none" })}
              >
                Скасувати
              </button>
              
              {validationModal.type === "insufficientMove" && (
                <button 
                  className={css.changeQtyBtn} 
                  onClick={() => {
                    const { sumMovedQ } = getItemStatus(validationModal.item!);
                    setEditQuantityValue(String(sumMovedQ));
                    setValidationModal(prev => ({ ...prev, type: "editingQuantity" }));
                  }}
                >
                  Змінити кількість
                </button>
              )}
              
              {validationModal.type === "editingQuantity" ? (
                <button 
                  className={css.confirmBtn} 
                  onClick={async () => {
                    const item = validationModal.item!;
                    const qty = Number(editQuantityValue);
                    if (isNaN(qty) || qty < 0) {
                        toast.error("Введіть коректну кількість");
                        return;
                    }
                    setValidationModal({ isOpen: false, item: null, type: "none" });
                    await handleAddToDelivery(item, qty);
                  }}
                >
                  Зберегти
                </button>
              ) : (
                <button 
                  className={css.confirmBtn} 
                  onClick={async () => {
                    const item = validationModal.item!;
                    setValidationModal({ isOpen: false, item: null, type: "none" });
                    await handleAddToDelivery(item);
                  }}
                >
                  {validationModal.type === "insufficientMove" ? "Продовжити все одно" : "Додати все одно"}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {isMobile && chatOrderRef && (
        <DraggableChatModal
          orderRef={chatOrderRef}
          onClose={() => {
            setChatOrderRef(null);
            setOpenedFromLink(false);
            if (openedFromLink && typeof window !== 'undefined' && window.Telegram?.WebApp) {
              window.Telegram.WebApp.close();
            }
          }}
          openedFromLink={openedFromLink}
          isMobileProp={isMobile}
        />
      )}

      {!isMobile && isChatOpen && details.length > 0 && (
        <DraggableChatModal
          orderRef={details[0].order}
          onClose={() => setIsChatOpen(false)}
          isMobileProp={isMobile}
        />
      )}

      <div className={css.btnWrapper}>
        <DeliveryBtn />
      </div>
    </div>
  );
}

export default TableOrderDetail;
