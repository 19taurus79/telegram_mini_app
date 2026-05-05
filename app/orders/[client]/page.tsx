"use client";

import { getContracts } from "@/lib/api";
import Link from "next/link";
import css from "./OrdersList.module.css";
import clsx from "clsx";
import { getInitData } from "@/lib/getInitData";
import { useState, useEffect } from "react";
import OrderCommentBadge from "@/components/Orders/OrderCommentBadge/OrderCommentBadge";
import OrderCommentModal from "@/components/Orders/OrderCommentModal/OrderCommentModal";
import { useQuery } from "@tanstack/react-query";
import { CircleDollarSign, Coins, Wallet, ChevronRight, Truck, FileText } from "lucide-react";

type Props = {
  params: Promise<{ client: number }>;
};

export default function FilteredOrders({ params }: Props) {
  const [clientId, setClientId] = useState<number | null>(null);
  const initData = getInitData() || "";
  const [commentModalData, setCommentModalData] = useState<{
    orderRef: string;
  } | null>(null);

  useEffect(() => {
    params.then((p) => setClientId(p.client));
  }, [params]);

  const { data: contracts } = useQuery({
    queryKey: ["contracts", clientId, initData],
    queryFn: () => getContracts({ client: clientId!, initData }),
    enabled: !!clientId && !!initData,
  });

  // Логіка визначення статусу оплати
  const getPaymentInfo = (contract: any) => {
    const isCredit100 = contract.loan_percentage === 100;
    const plan = contract.planned_amount || 0;
    const fact = contract.actual_payment_amount || 0;
    
    // Оплачено якщо кредит 100% або факт >= 90% від плану
    const isPaid = isCredit100 || (plan > 0 && fact >= plan * 0.9);
    const isPartial = !isPaid && fact > 0;

    if (isPaid) return { 
      label: "Оплачено", 
      icon: <CircleDollarSign size={16} />, 
      color: "#4ade80", 
      bgColor: "rgba(34, 197, 94, 0.15)", 
      border: "1px solid rgba(34, 197, 94, 0.4)" 
    };
    if (isPartial) return { 
      label: "Частково", 
      icon: <Wallet size={16} />, 
      color: "#fbbf24", 
      bgColor: "rgba(251, 191, 36, 0.15)", 
      border: "1px solid rgba(251, 191, 36, 0.4)" 
    };
    return { 
      label: "Не оплачено", 
      icon: <Coins size={16} />, 
      color: "#ef4444", 
      bgColor: "rgba(239, 68, 68, 0.15)", 
      border: "1px solid rgba(239, 68, 68, 0.4)" 
    };
  };

  if (!contracts) {
    return <div style={{ padding: "20px" }}>Завантаження...</div>;
  }

  return (
    <>
      <ul className={css.list} style={{ padding: '12px', listStyle: 'none' }}>
        {contracts.map((item) => {
          const pay = getPaymentInfo(item);
          return (
            <li key={item.contract_supplement} style={{ marginBottom: '16px' }}>
              <div style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid var(--glass-border)',
                borderRadius: '16px',
                padding: '16px',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
              }}>
                {/* Accent line */}
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '4px',
                  background: 'var(--accent-green)',
                  opacity: 0.6
                }} />

                <Link
                  href={`/detail/${item.contract_supplement}`}
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={18} style={{ color: 'var(--accent-green)' }} />
                      <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff', letterSpacing: '0.5px' }}>
                        {item.contract_supplement}
                      </span>
                    </div>
                    <ChevronRight size={20} style={{ opacity: 0.3, color: '#fff' }} />
                  </div>

                  {/* Payment Badge - Modern */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 14px',
                      background: pay.bgColor,
                      color: pay.color,
                      border: pay.border,
                      borderRadius: '10px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                    }}>
                      {pay.icon}
                      <span>{pay.label}</span>
                    </div>
                  </div>

                  {/* Info Rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', fontWeight: 600 }}>Вид діяльності</span>
                      <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 500 }}>{item.line_of_business}</span>
                    </div>

                    {item.contract_type && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', fontWeight: 600 }}>Тип контракту</span>
                        <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{item.contract_type}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', fontWeight: 600 }}>Статус документа</span>
                      <span style={{ 
                        fontSize: '0.85rem', 
                        fontWeight: 700,
                        color: item.document_status === "затверджено" ? "#4ade80" : "#fbbf24",
                        background: item.document_status === "затверджено" ? "rgba(74, 222, 128, 0.1)" : "rgba(251, 191, 36, 0.1)",
                        padding: '4px 8px',
                        borderRadius: '6px'
                      }}>
                        {item.document_status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', fontWeight: 600 }}>До постачання</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {item.delivery_status?.includes("Так") && <Truck size={14} style={{ color: '#4ade80' }} />}
                        <span style={{ 
                          fontSize: '0.85rem', 
                          fontWeight: 700,
                          color: item.delivery_status?.includes("Так") ? "#4ade80" : "#ef4444"
                        }}>
                          {item.delivery_status?.includes("Так") ? "Так" : "Ні"}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>

                <div style={{ 
                  position: 'absolute', 
                  right: '12px', 
                  top: '56px',
                  zIndex: 2
                }} onClick={(e) => e.stopPropagation()}>
                  <OrderCommentBadge
                    orderRef={item.contract_supplement}
                    onClick={() =>
                      setCommentModalData({
                        orderRef: item.contract_supplement,
                      })
                    }
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {/* <BackBtn /> */}

      {commentModalData && (
        <OrderCommentModal
          orderRef={commentModalData.orderRef}
          commentType="order"
          onClose={() => setCommentModalData(null)}
        />
      )}
    </>
  );
}
