"use client";
import css from "./OrdersTable.module.css";
import { BiOrdersItem } from "@/types/types";
import toast from "react-hot-toast";
import { useState, useEffect } from "react";
import OrderCommentBadge from "@/components/Orders/OrderCommentBadge/OrderCommentBadge";
import OrderCommentModal from "@/components/Orders/OrderCommentModal/OrderCommentModal";

interface OrdersTableProps {
  orders: BiOrdersItem["orders"];
  productName?: string;
}

const OrdersTable = ({ orders, productName }: OrdersTableProps) => {
  const [isMobile, setIsMobile] = useState(false);
  const [commentModalData, setCommentModalData] = useState<{
    orderRef: string;
    productId?: string;
    productName?: string;
  } | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleCopy = (contract: string, qty: number) => {
    const textToCopy = `${contract}-${qty}`;
    navigator.clipboard.writeText(textToCopy).then(
      () => {
        toast.success(`Скопійовано: ${textToCopy}`);
      },
      (err) => {
        toast.error('Не вдалося скопіювати.');
        console.error("Could not copy text: ", err);
      }
    );
  };

  return (
    <div className={css.tableWrapper}>
      <h2 className={css.title}>Деталізація по заказах</h2>
      {orders && orders.length > 0 ? (
        <>
          {isMobile ? (
            <div className={css.mobileList}>
              {orders.map((order, index) => (
                <div
                  key={index}
                  className={`${css.mobileCard} ${commentCounts[order.contract_supplement] > 0 ? css.hasComments : ''}`}
                  onClick={() => handleCopy(order.contract_supplement, order.qty)}
                >
                  <div className={css.cardHeader}>
                    <div className={css.clientName}>{order.client}</div>
                    <div className={css.contractInfo}>{order.contract_supplement}</div>
                    <div 
                      className={css.commentBadgeWrapper}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCommentModalData({ 
                          orderRef: order.contract_supplement,
                          productId: productName,  // В BI використовуємо назву як ID
                          productName: productName
                        });
                      }}
                    >
                      <OrderCommentBadge
                        orderRef={order.contract_supplement}
                        productId={productName}  // В BI використовуємо назву як ID
                        onClick={() => {}}
                        onCommentCountChange={(count) => {
                          setCommentCounts(prev => ({
                            ...prev,
                            [order.contract_supplement]: count
                          }));
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className={css.cardGrid}>
                    <div className={css.gridItem}>
                      <span className={css.label}>Менеджер</span>
                      <span className={css.value}>{order.manager}</span>
                    </div>
                    <div className={css.gridItem}>
                      <span className={css.label}>Період</span>
                      <span className={css.value}>{order.period}</span>
                    </div>
                    <div className={css.gridItem}>
                      <span className={css.label}>Статус</span>
                      <span className={css.value}>{order.document_status}</span>
                    </div>
                    <div className={css.gridItem}>
                      <span className={css.label}>До постачання</span>
                      <span className={css.value}>{order.delivery_status}</span>
                    </div>
                    <div className={css.gridItem}>
                      <span className={css.label}>Кількість</span>
                      <span className={`${css.value} ${css.qtyValue}`}>{order.qty}</span>
                    </div>
                    <div className={css.gridItem}>
                      <span className={css.label}>Переміщено</span>
                      <span className={css.value}>{order.moved_qty}</span>
                    </div>
                  </div>
                  
                  <div className={css.copyHint}>Натисніть для копіювання</div>
                </div>
              ))}
            </div>
          ) : (
            <table className={css.table}>
              <thead>
                <tr>
                  <th className={css.th}>Менеджер</th>
                  <th className={css.th}>Контрагент</th>
                  <th className={css.th}>Доповнення</th>
                  <th className={css.th}>Період</th>
                  <th className={css.th}>Статус</th>
                  <th className={css.th}>До постачання</th>
                  <th className={css.th}>Кількість</th>
                  <th className={css.th}>Переміщено</th>
                  <th className={css.th} style={{ width: '60px', textAlign: 'center' }}>💬</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, index) => (
                  <tr
                    key={index}
                    className={`${css.row} ${css.copyableRow} ${commentCounts[order.contract_supplement] > 0 ? css.hasComments : ''}`}
                    onClick={() => handleCopy(order.contract_supplement, order.qty)}
                  >
                    <td className={css.td} title={order.manager}>{order.manager}</td>
                    <td className={css.td} title={order.client}>{order.client}</td>
                    <td className={css.td} title={order.contract_supplement}>{order.contract_supplement}</td>
                    <td className={css.td} title={order.period}>{order.period}</td>
                    <td className={css.td} title={order.document_status}>{order.document_status}</td>
                    <td className={css.td} title={order.delivery_status}>{order.delivery_status}</td>
                    <td className={css.td} title={order.qty.toString()}>{order.qty}</td>
                    <td className={css.td} title={order.moved_qty.toString()}>{order.moved_qty}</td>
                    <td 
                      className={css.commentCell}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCommentModalData({ 
                          orderRef: order.contract_supplement,
                          productId: productName,  // В BI використовуємо назву як ID
                          productName: productName
                        });
                      }}
                    >
                      <OrderCommentBadge
                        orderRef={order.contract_supplement}
                        productId={productName}  // В BI використовуємо назву як ID
                        onClick={() => {}}
                        onCommentCountChange={(count) => {
                          setCommentCounts(prev => ({
                            ...prev,
                            [order.contract_supplement]: count
                          }));
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      ) : (
        <p>Дані відсутні.</p>
      )}

      {commentModalData && (
        <OrderCommentModal
          orderRef={commentModalData.orderRef}
          commentType={commentModalData.productId ? "product" : "order"}
          productId={commentModalData.productId}
          productName={commentModalData.productName}
          onClose={() => setCommentModalData(null)}
          readOnly={true}
        />
      )}
    </div>
  );
};

export default OrdersTable;
