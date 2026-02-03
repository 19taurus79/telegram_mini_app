"use client";
import { useDelivery } from "@/store/Delivery";
import css from "./Detail.module.css";
import {
  getDeliveries,
  getIdRemainsByParty,
  getWeightForProduct,
} from "@/lib/api";
import { DeliveryRequest } from "@/types/types";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { getInitData } from "@/lib/getInitData";
import React from "react";
import toast from "react-hot-toast";
import OrderCommentBadge from "@/components/Orders/OrderCommentBadge/OrderCommentBadge";
import OrderCommentModal from "@/components/Orders/OrderCommentModal/OrderCommentModal";

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
  total_weight?: number; // Предполагаем, что это поле будет приходить от бэкенда
  parties: {
    party: string;
    moved_q: number;
  }[];
};

type Detail = {
  details: OrderDetailItem[];
};

function TableOrderDetail({ details }: Detail) {
  const { delivery, setDelivery } = useDelivery();
  const [addingToDeliveryId, setAddingToDeliveryId] = React.useState<string | null>(null);
  const [allDeliveries, setAllDeliveries] = React.useState<DeliveryRequest[]>([]);
  const [commentModalData, setCommentModalData] = React.useState<{
    orderRef: string;
    productId: string;
    productName: string;
  } | null>(null);

  React.useEffect(() => {
    const loadDeliveries = async () => {
        try {
            const initData = getInitData();
            const data = await getDeliveries(initData);
            if (data) setAllDeliveries(data);
        } catch (e) {
            console.error("Error loading deliveries", e);
        }
    };
    loadDeliveries();
  }, []);

   const getDeliveryForItem = (item: OrderDetailItem) => {
    if (!allDeliveries || allDeliveries.length === 0) return null;
    return allDeliveries.find(d => 
        (d.status === "Створено" || d.status === "В роботі" || d.status === "created") &&
        d.items?.some(di => 
            di.order_ref?.trim() === item.order.trim() && 
            di.product?.trim() === item.product.trim()
        )
    );
  };

  const isSelected = (id: string) => delivery.some((el) => el.id === id);

  const router = useRouter();
  const HandleClick = async ({ party }: { party: string }) => {
    try {
      const initData = getInitData();
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
        >
          {/* Main Product Row */}
          <div className={css.cardRow}>
            <div
              className={css.cardCellProduct}
              onClick={async () => {
                 if (addingToDeliveryId === item.id) return;
                 
                 const isItemInDelivery = delivery.some((el) => el.id === item.id);
                 
                 if (!isItemInDelivery) {
                     const existingDelivery = getDeliveryForItem(item);
                     if (existingDelivery) {
                         const confirmAdd = window.confirm(
                             `Цей товар уже у доставці №${existingDelivery.id} (статус: ${existingDelivery.status}).\nВи впевнені, що хочете додати його ще раз?`
                         );
                         if (!confirmAdd) return;
                     }

                      setAddingToDeliveryId(item.id);
                      try {
                          const initData = getInitData();
                          const weight = await getWeightForProduct({ item, initData });
                          setDelivery({ ...item, weight });
                          toast.success(`Додано: ${item.product}`);
                      } catch (e) {
                          console.error("Error adding to delivery", e);
                          setDelivery({ ...item, weight: 0 });
                          toast.error("Додано без ваги (помилка розрахунку)");
                      } finally {
                          setAddingToDeliveryId(null);
                      }
                 } else {
                     setDelivery(item);
                     toast.success(`Вилучено: ${item.product}`);
                 }
              }}
            >
              <span className={css.productName}>{item.product}</span>
              {getDeliveryForItem(item) && (
                  <span className={css.deliveryBadge}>В доставці</span>
              )}
              {addingToDeliveryId === item.id && (
                  <Loader2 className="animate-spin ml-2 h-4 w-4 inline" />
              )}
            </div>
            <div
              className={`${css.cardCellQuantity} ${css.centr}`}
              style={
                item.qok === "2"
                  ? { color: "green" }
                  : item.qok === "1"
                  ? { color: "orange" }
                  : { color: "red" }
              }
            >
              {item.quantity}
            </div>
            <div className={css.commentBadgeCell}>
              <OrderCommentBadge
                orderRef={item.order}
                productId={item.product}
                onClick={() =>
                  setCommentModalData({
                    orderRef: item.order,
                    productId: item.product,
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
                          onClick={() => HandleClick(party)}
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
    </div>
  );
}

export default TableOrderDetail;
