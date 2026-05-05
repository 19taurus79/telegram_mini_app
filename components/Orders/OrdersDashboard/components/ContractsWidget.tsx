"use client";

import { useQuery } from "@tanstack/react-query";
import { getDeliveries } from "@/lib/api";
import { Client, Contract } from "@/types/types";
import styles from "../OrdersDashboard.module.css";
import { useState } from "react";
import OrderCommentModal from "@/components/Orders/OrderCommentModal/OrderCommentModal";
import OrderCommentBadge from "@/components/Orders/OrderCommentBadge/OrderCommentBadge";
import { Truck, CircleDollarSign, Coins, Wallet, MessageSquare } from "lucide-react";
import clsx from "clsx";

interface ContractsWidgetProps {
  initData: string;
  selectedClients: Client[];
  contracts: Contract[];
  selectedContracts: Contract[];
  onSelectContract: (contract: Contract) => void;
}

export default function ContractsWidget({
  initData,
  selectedClients,
  contracts,
  selectedContracts,
  onSelectContract,
}: ContractsWidgetProps) {
  const [commentModalData, setCommentModalData] = useState<{
    orderRef: string;
  } | null>(null);

  const { data: allDeliveries } = useQuery({
    queryKey: ["deliveries"],
    queryFn: () => getDeliveries(initData),
    enabled: !!initData,
  });

  const getContractDeliveryInfo = (contractRef: string) => {
    if (!allDeliveries) return { isCO: false, isInDelivery: false, date: null };
    
    let isCO = false;
    let isInDelivery = false;
    let date: string | null = null;

    allDeliveries.forEach(d => {
      const activeStatuses = ["Створено", "В роботі", "created", "inprogress", "Доставка з ЦО на клієнта"];
      const matchesStatus = activeStatuses.some(s => s.toLowerCase() === d.status?.toLowerCase());
      if (!matchesStatus) return;

      const hasItem = d.items?.some(di => di.order_ref?.trim() === contractRef.trim());
      if (hasItem) {
        if (d.status?.toLowerCase().includes("цо")) {
          isCO = true;
          // Для ЦО дату тоже можно сохранить, но пользователь просил не добавлять ее в бейдж.
          // Мы сохраним ее здесь, а в рендеринге будем решать.
          date = d.delivery_date;
        } else {
          isInDelivery = true;
          date = d.delivery_date;
        }
      }
    });

    return { isCO, isInDelivery, date };
  };

  // Логіка визначення статусу оплати
  const getPaymentInfo = (contract: Contract) => {
    const isCredit100 = contract.loan_percentage === 100;
    const plan = contract.planned_amount || 0;
    const fact = contract.actual_payment_amount || 0;
    
    // Оплачено якщо кредит 100% або факт >= 90% від плану
    const isPaid = isCredit100 || (plan > 0 && fact >= plan * 0.9);
    const isPartial = !isPaid && fact > 0;

    if (isPaid) return { 
      label: "Оплачено", 
      icon: <CircleDollarSign size={14} />, 
      color: "#4ade80", 
      bgColor: "rgba(34, 197, 94, 0.15)", 
      border: "1px solid rgba(34, 197, 94, 0.4)" 
    };
    if (isPartial) return { 
      label: "Частково", 
      icon: <Wallet size={14} />, 
      color: "#fbbf24", 
      bgColor: "rgba(251, 191, 36, 0.15)", 
      border: "1px solid rgba(251, 191, 36, 0.4)" 
    };
    return { 
      label: "Не оплачено", 
      icon: <Coins size={14} />, 
      color: "#ef4444", 
      bgColor: "rgba(239, 68, 68, 0.15)", 
      border: "1px solid rgba(239, 68, 68, 0.4)" 
    };
  };

  // Якщо клієнт не обраний, показуємо підказку
  if (selectedClients.length === 0) {
    return (
      <div style={{ padding: "20px", textAlign: "center", opacity: 0.6 }}>
        Оберіть клієнта зі списку
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <div className={styles.list}>
        {contracts?.map((contract) => {
          const { isCO, isInDelivery } = getContractDeliveryInfo(contract.contract_supplement);
          return (
            <div
              key={contract.contract_supplement}
              className={clsx(styles.contractCard, {
                [styles.contractCardSelected]: selectedContracts.some(
                  (c) => c.contract_supplement === contract.contract_supplement
                ),
              })}
              onClick={() => onSelectContract(contract)}
              style={{ padding: '16px', position: 'relative', overflow: 'hidden' }}
            >
              {/* Premium Accent line */}
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '4px',
                background: selectedContracts.some(c => c.contract_supplement === contract.contract_supplement) 
                  ? 'var(--accent-green)' 
                  : 'transparent',
                transition: 'all 0.3s ease'
              }} />

              {/* Header: Number + Icons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff', letterSpacing: '0.5px' }}>
                    {contract.contract_supplement}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginTop: '2px' }}>
                    {contract.client}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                  {/* Delivery Icon */}
                  {(isCO || isInDelivery) && (
                    <div style={{
                      padding: '6px',
                      background: isCO ? 'rgba(99, 102, 241, 0.2)' : 'rgba(0, 196, 204, 0.2)',
                      color: isCO ? '#818cf8' : '#22d3ee',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `1px solid ${isCO ? 'rgba(99, 102, 241, 0.3)' : 'rgba(0, 196, 204, 0.3)'}`
                    }} title={isCO ? "Доставка з ЦО" : `В доставці ${date ? `(${date})` : ""}`}>
                      <Truck size={14} />
                    </div>
                  )}

                  {/* Payment Icon Label */}
                  {(() => {
                    const pay = getPaymentInfo(contract);
                    return (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 12px',
                        background: pay.bgColor,
                        color: pay.color,
                        border: pay.border,
                        borderRadius: '10px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                      }}>
                        {pay.icon}
                        <span>{pay.label}</span>
                      </div>
                    );
                  })()}

                  {/* Comments */}
                  <OrderCommentBadge
                    orderRef={contract.contract_supplement}
                    onClick={() =>
                      setCommentModalData({
                        orderRef: contract.contract_supplement,
                      })
                    }
                  />
                </div>
              </div>

              {/* Body: Client/Bussiness info */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600 }}>
                    {contract.line_of_business}
                  </div>
                  {contract.contract_type && (
                    <div style={{ 
                      fontSize: '0.7rem', 
                      color: 'rgba(255, 255, 255, 0.4)', 
                      textAlign: 'right',
                      fontStyle: 'italic',
                      maxWidth: '60%'
                    }}>
                      {contract.contract_type}
                    </div>
                  )}
                </div>

                {/* Financial Info */}
                {(contract.planned_amount !== undefined || contract.actual_payment_amount !== undefined) && (
                  <div style={{ 
                    marginTop: '10px', 
                    padding: '8px', 
                    background: 'rgba(255,255,255,0.03)', 
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                      <span style={{ opacity: 0.5 }}>План:</span>
                      <span style={{ fontWeight: 600, color: '#fff' }}>
                        {contract.planned_amount?.toLocaleString() || '0'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                      <span style={{ opacity: 0.5 }}>Оплачено:</span>
                      <span style={{ 
                        fontWeight: 700, 
                        color: (contract.actual_payment_amount || 0) >= (contract.planned_amount || 0) * 0.9 ? '#4ade80' : '#fff' 
                      }}>
                        {contract.actual_payment_amount?.toLocaleString() || '0'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer: Status Badges */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  className={clsx(
                    styles.statusBadge,
                    contract.document_status === "затверджено" && styles.statusOk,
                    contract.document_status === "створено менеджером" && styles.statusWaiting,
                    contract.document_status === "відхилено" && styles.statusFailed
                  )}
                  style={{ borderRadius: '6px', padding: '4px 8px' }}
                >
                  {contract.document_status}
                </span>

                <span
                  className={clsx(
                    styles.statusBadge,
                    contract.delivery_status?.includes("Так")
                      ? styles.statusOk
                      : styles.statusFailed
                  )}
                  style={{ 
                    borderRadius: '6px', 
                    padding: '4px 8px', 
                    fontSize: '0.65rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Статус до постачання"
                >
                  <span style={{ opacity: 0.7, fontWeight: 500 }}>До постачання:</span>
                  <span style={{ fontWeight: 800 }}>
                    {contract.delivery_status?.includes("Так") ? "Так" : "Ні"}
                  </span>
                </span>
              </div>
            </div>
          );
        })}
        {!contracts?.length && (
          <p style={{ padding: "10px", opacity: 0.6 }}>Доповнень не знайдено</p>
        )}
      </div>

      {commentModalData && (
        <OrderCommentModal
          orderRef={commentModalData.orderRef}
          commentType="order"
          onClose={() => setCommentModalData(null)}
        />
      )}
    </div>
  );
}
