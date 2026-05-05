"use client";

import { useState, useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getMovedDataByProduct, getOrdersByProduct, getRemainsById } from "@/lib/api";
import { CircleDollarSign, Coins, Wallet, Box, Truck, MapPin } from "lucide-react";
import css from "./DetailsOrdersByProduct.module.css";
import { useInitData } from "@/store/InitData";

export default function DetailsOrdersByProduct({
  selectedProductId,
  onPartyClick,
}: {
  selectedProductId: string | null;
  onPartyClick?: (partyName: string) => void;
}) {
  const initData = useInitData((state) => state.initData);
  const [sortDirection, setSortDirection] = useState<
    "ascending" | "descending" | null
  >(null);

  const {
    data: data,
    isLoading: isLoadingOrders,
    isError: isErrorOrders,
    error: errorOrders,
  } = useQuery({
    queryKey: ["ordersByProduct", selectedProductId, initData],
    queryFn: () =>
      getOrdersByProduct({ product: selectedProductId!, initData: initData! }),
    enabled: !!selectedProductId && !!initData,
    placeholderData: keepPreviousData,
  });

  const {
    data: movedProducts,
    isLoading: isLoadingMoved,
    isError: isErrorMoved,
    error: errorMoved,
  } = useQuery({
    queryKey: ["movedProductsByProduct", selectedProductId, initData],
    queryFn: () =>
      getMovedDataByProduct({
        productId: selectedProductId!,
        initData: initData!,
      }),
    enabled: !!selectedProductId && !!initData,
    placeholderData: keepPreviousData,
  });

  const {
    data: remainsData,
    isLoading: isLoadingRemains,
  } = useQuery({
    queryKey: ["remainsById", selectedProductId, initData],
    queryFn: () =>
      getRemainsById({ productId: selectedProductId!, initData: initData! }),
    enabled: !!selectedProductId && !!initData,
    placeholderData: keepPreviousData,
  });

  const sortedData = useMemo(() => {
    if (!data) return [];
    if (sortDirection === null) return data;

    return [...data].sort((a, b) => {
      const dateA = new Date(a.delivery_status).getTime();
      const dateB = new Date(b.delivery_status).getTime();
      if (dateA < dateB) {
        return sortDirection === "ascending" ? -1 : 1;
      }
      if (dateA > dateB) {
        return sortDirection === "ascending" ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortDirection]);

  const handleSort = () => {
    if (sortDirection === null) {
      setSortDirection("ascending");
    } else if (sortDirection === "ascending") {
      setSortDirection("descending");
    } else {
      setSortDirection(null);
    }
  };

  const movedContractsMap = useMemo(() => {
    if (!movedProducts) return new Map<string, number>();

    const map = new Map<string, number>();
    movedProducts.forEach((item) => {
      const currentQty = map.get(item.contract) || 0;
      map.set(item.contract, currentQty + parseFloat(item.qt_moved));
    });
    return map;
  }, [movedProducts]);

  // Логіка визначення статусу оплати
  const getPaymentInfo = (order: any) => {
    const isCredit100 = order.loan_percentage === 100;
    const plan = order.planned_amount || 0;
    const fact = order.actual_payment_amount || 0;
    
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

  // Підрахунок підсумків по статусах
  const orderSummary = useMemo(() => {
    if (!data) return { zatverdzeno: 0, productConfirmed: 0, other: 0, total: 0 };
    return data.reduce(
      (acc, order) => {
        const qty = parseFloat(String(order.different)) || 0;
        acc.total += qty;
        if (order.document_status === "затверджено") {
          acc.zatverdzeno += qty;
        } else if (order.document_status === "продукція затверджена") {
          acc.productConfirmed += qty;
        } else {
          acc.other += qty;
        }
        return acc;
      },
      { zatverdzeno: 0, productConfirmed: 0, other: 0, total: 0 }
    );
  }, [data]);

  // Аналіз вільних залишків по партіях
  const { partyList, partyTotals } = useMemo(() => {
    if (!remainsData && !movedProducts) return { partyList: [], partyTotals: null };
    
    // Групуємо залишки
    const map = new Map<string, { buh: number; skl: number; storage: number; moved: number; warehouses: Set<string> }>();
    let totalBuh = 0;
    let totalSkl = 0;
    let totalStorage = 0;
    let totalMoved = 0;
    const allWarehouses = new Set<string>();
    
    if (remainsData) {
      remainsData.forEach(r => {
        const party = (r.nomenclature_series || "Без серії").trim();
        const current = map.get(party) || { buh: 0, skl: 0, storage: 0, moved: 0, warehouses: new Set<string>() };
        const b = parseFloat(String(r.buh)) || 0;
        const s = parseFloat(String(r.skl)) || 0;
        const st = parseFloat(String(r.storage)) || 0;
        current.buh += b;
        current.skl += s;
        current.storage += st;
        if (r.warehouse) {
          current.warehouses.add(r.warehouse);
          allWarehouses.add(r.warehouse);
        }
        map.set(party, current);
        
        totalBuh += b;
        totalSkl += s;
        totalStorage += st;
      });
    }
    
    if (movedProducts) {
      movedProducts.forEach(m => {
        const party = (m.party_sign_y || "Без серії").trim();
        const current = map.get(party) || { buh: 0, skl: 0, storage: 0, moved: 0, warehouses: new Set<string>() };
        const mQty = parseFloat(String(m.qt_moved)) || 0;
        current.moved += mQty;
        map.set(party, current);
        
        totalMoved += mQty;
      });
    }
    
    const list = Array.from(map.entries()).map(([party, stats]) => {
      return {
         party,
         buh: stats.buh,
         skl: stats.skl,
         storage: stats.storage,
         moved: stats.moved,
         freeBuh: stats.buh,
         freeSkl: stats.skl - stats.moved - stats.storage,
         warehouses: Array.from(stats.warehouses)
      };
    }).sort((a, b) => (b.freeSkl - a.freeSkl));

    return { 
      partyList: list, 
      partyTotals: {
        buh: totalBuh,
        skl: totalSkl,
        storage: totalStorage,
        moved: totalMoved,
        freeBuh: totalBuh,
        freeSkl: totalSkl - totalMoved - totalStorage,
        warehouses: Array.from(allWarehouses)
      } 
    };
  }, [remainsData, movedProducts]);

  if (!selectedProductId) {
    return (
      <div className={css.container}>
      </div>
    );
  }

  if (isLoadingOrders || isLoadingMoved || isLoadingRemains) {
    return <div className={css.container}>Завантаження...</div>;
  }

  if (isErrorOrders) {
    return (
      <div className={css.container}>
        Помилка завантаження заявок: {errorOrders.message}
      </div>
    );
  }
  if (isErrorMoved) {
    return (
      <div className={css.container}>
        Помилка завантаження переміщень: {errorMoved.message}
      </div>
    );
  }

  return (
      <div className={css.container}>
        {/* Таблиця аналізу партій */}
        {partyList.length > 0 && (
          <div className={css.analysisSection}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              <h3 className={css.analysisTitle} style={{ margin: 0 }}>📦 Аналіз вільного товару по партіях</h3>
              {partyTotals && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                  {partyTotals.warehouses.length > 0 && (
                    <span style={{ fontSize: '13px', background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      🏢 Склад: <strong style={{ opacity: 0.9 }}>{partyTotals.warehouses.join(', ')}</strong>
                    </span>
                  )}
                  <span style={{ fontSize: '13px', background: 'rgba(14,241,142,0.1)', color: '#4ade80', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(14,241,142,0.2)' }}>
                    Загальний Бух: <strong>{partyTotals.buh.toFixed(2)}</strong>
                  </span>
                  <span style={{ fontSize: '13px', background: 'rgba(14,241,142,0.1)', color: '#4ade80', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(14,241,142,0.2)' }}>
                    Загальний Скл: <strong>{partyTotals.skl.toFixed(2)}</strong>
                  </span>
                </div>
              )}
            </div>
            <table className={css.table}>
              <thead>
                <tr>
                  <th>Партія</th>
                  <th>Склад (Бух/Скл)</th>
                  <th>Вже переміщено</th>
                  <th>Вільний залишок</th>
                </tr>
              </thead>
              <tbody>
                {partyList.map((p, idx) => (
                  <tr 
                    key={idx} 
                    onClick={() => onPartyClick?.(p.party)}
                    style={{ cursor: onPartyClick ? 'pointer' : 'default' }}
                    className={onPartyClick ? css.rowSelectable : ""}
                  >
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.party}</div>
                      {p.warehouses.length > 0 && (
                        <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px' }}>{p.warehouses.join(', ')}</div>
                      )}
                    </td>
                    <td>{p.buh} / {p.skl}</td>
                    <td style={{ color: "rgba(255,255,255,0.7)" }}>{p.moved > 0 ? p.moved : "—"}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        {p.freeSkl > 0 ? (
                          <span className={css.badgeGreen}>Скл: {p.freeSkl}</span>
                        ) : (
                          <span className={css.badgeRed}>Скл: {p.freeSkl}</span>
                        )}
                        {p.freeBuh > 0 ? (
                          <span className={css.badgeGreen} style={{ opacity: 0.8 }}>Бух: {p.freeBuh}</span>
                        ) : (
                          <span className={css.badgeRed} style={{ opacity: 0.8 }}>Бух: {p.freeBuh}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Мобільні картки для аналізу */}
            <div className={css.mobileCards}>
              {partyList.map((p, idx) => (
                <div key={idx} className={css.card}>
                  <div className={css.cardHeader}>
                    <span className={css.cardTitle}>Партія: {p.party}</span>
                  </div>
                  {p.warehouses.length > 0 && (
                    <div className={css.cardRow}>
                      <span className={css.cardLabel}>Склад:</span>
                      <span className={css.cardValue} style={{ fontSize: '12px', opacity: 0.8 }}>{p.warehouses.join(', ')}</span>
                    </div>
                  )}
                  <div className={css.cardRow}>
                    <span className={css.cardLabel}>Склад (Бух/Скл):</span>
                    <span className={css.cardValue}>{p.buh} / {p.skl}</span>
                  </div>
                  <div className={css.cardRow}>
                    <span className={css.cardLabel}>Вже переміщено:</span>
                    <span className={css.cardValue}>{p.moved > 0 ? p.moved : "—"}</span>
                  </div>
                  <div className={css.cardRow} style={{ borderBottom: 'none', paddingBottom: 0 }}>
                    <span className={css.cardLabel}>Вільний Скл:</span>
                    <span className={p.freeSkl > 0 ? css.badgeGreen : css.badgeRed}>{p.freeSkl}</span>
                  </div>
                  <div className={css.cardRow}>
                    <span className={css.cardLabel}>Вільний Бух:</span>
                    <span className={p.freeBuh > 0 ? css.badgeGreen : css.badgeRed}>{p.freeBuh}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Таблиця деталізації переміщень (під кого, яка партія і скільки) */}
        {movedProducts && movedProducts.length > 0 && (
          <div className={css.analysisSection} style={{ marginTop: '24px' }}>
            <h3 className={css.analysisTitle}>🚚 Деталізація існуючих переміщень (Резерви)</h3>
            <table className={css.table}>
              <thead>
                <tr>
                  <th>Клієнт / Менеджер</th>
                  <th>Партія</th>
                  <th>Кількість</th>
                </tr>
              </thead>
              <tbody>
                {movedProducts.map((m, idx) => (
                  <tr key={idx}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{m.client || "Невідомий клієнт"}</div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{m.manager || "Невідомий менеджер"}</div>
                    </td>
                    <td>{m.party_sign_y || "Без серії"}</td>
                    <td style={{ fontWeight: 600 }}>{m.qt_moved}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Мобільні картки для деталізації переміщень */}
            <div className={css.mobileCards}>
              {movedProducts.map((m, idx) => (
                <div key={`mob-mov-${idx}`} className={css.card}>
                  <div className={css.cardHeader}>
                    <span className={css.cardTitle}>{m.client || "Невідомий клієнт"}</span>
                  </div>
                  <div className={css.cardRow}>
                    <span className={css.cardLabel}>Менеджер:</span>
                    <span className={css.cardValue}>{m.manager || "Невідомий менеджер"}</span>
                  </div>
                  <div className={css.cardRow}>
                    <span className={css.cardLabel}>Партія:</span>
                    <span className={css.cardValue}>{m.party_sign_y || "Без серії"}</span>
                  </div>
                  <div className={css.cardRow} style={{ borderBottom: 'none', paddingBottom: 0 }}>
                    <span className={css.cardLabel}>Кількість:</span>
                    <span className={css.cardValue} style={{ fontWeight: 600 }}>{m.qt_moved}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}>📝 Заявки по товару:</h3>
          {data && data.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              {orderSummary.zatverdzeno > 0 && (
                <span style={{
                  background: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  color: '#4ade80',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap'
                }}>
                  ✅ Затверджено: {orderSummary.zatverdzeno}
                </span>
              )}
              {orderSummary.productConfirmed > 0 && (
                <span style={{
                  background: 'rgba(251, 191, 36, 0.15)',
                  border: '1px solid rgba(251, 191, 36, 0.4)',
                  color: '#fbbf24',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap'
                }}>
                  🟡 Прод. затв.: {orderSummary.productConfirmed}
                </span>
              )}
              {orderSummary.other > 0 && (
                <span style={{
                  background: 'rgba(148, 163, 184, 0.15)',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  color: '#94a3b8',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap'
                }}>
                  ⚪ Інші: {orderSummary.other}
                </span>
              )}
              <span style={{
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                color: '#a5b4fc',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                whiteSpace: 'nowrap'
              }}>
                📊 Разом: {orderSummary.total}
              </span>
            </div>
          )}
        </div>
        {sortedData && sortedData.length > 0 ? (
            <>
              <table className={css.table}>
                <thead>
                <tr>
                  <th>Менеджер</th>
                  <th>Клієнт</th>
                  <th>Доповнення</th>
                  <th>Вид діяльності</th>
                  <th>Док. статус</th>
                  <th onClick={handleSort} className={css.sortableHeader}>
                    Постачання{" "}
                    {sortDirection === "ascending"
                        ? "↑"
                        : sortDirection === "descending"
                            ? "↓"
                            : ""}
                  </th>
                  <th>Кількість</th>
                  <th className={css.checkmarkHeader}>Оплата</th>
                  <th className={css.checkmarkHeader}>Переміщено</th>
                </tr>
                </thead>
                <tbody>
                {sortedData.map((order) => (
                    <tr key={order.id}>
                      <td>{order.manager}</td>
                      <td>{order.client}</td>
                      <td>{order.contract_supplement}</td>
                      <td><span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{order.line_of_business}</span></td>
                      <td>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 700,
                          color: order.document_status === "затверджено" ? "#4ade80" : "#fbbf24",
                          background: order.document_status === "затверджено" ? "rgba(74, 222, 128, 0.1)" : "rgba(251, 191, 36, 0.1)",
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          {order.document_status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '0.65rem', opacity: 0.6, fontWeight: 500 }}>До пост:</span>
                          <span style={{ 
                            fontSize: '0.8rem', 
                            fontWeight: 700,
                            color: order.delivery_status?.includes("Так") ? "#4ade80" : "#ef4444"
                          }}>
                            {order.delivery_status?.includes("Так") ? "Так" : "Ні"}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{order.different}</td>
                        <td className={css.checkmarkCell}>
                          {(() => {
                            const pay = getPaymentInfo(order);
                            return (
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: pay.bgColor,
                                color: pay.color,
                                border: pay.border,
                                padding: '4px 8px',
                                borderRadius: '8px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                              }}>
                                {pay.icon}
                                <span style={{ display: 'none' }}>{pay.label}</span>
                              </div>
                            );
                          })()}
                        </td>
                      <td className={css.checkmarkCell}>
                        {(() => {
                          const movedQty =
                            movedContractsMap.get(order.contract_supplement) || 0;
                          if (movedQty === 0) return null;

                          if (movedQty >= order.different) {
                            return <span className={css.checkmarkGreen}>✓</span>;
                          } else {
                            return <span className={css.checkmarkYellow}>✓</span>;
                          }
                        })()}
                      </td>
                    </tr>
                ))}
                </tbody>
              </table>

              <div className={css.mobileCards}>
                {sortedData.map((order) => {
                  const movedQty = movedContractsMap.get(order.contract_supplement) || 0;
                  return (
                      <div key={order.id} className={css.card}>
                        <div className={css.cardHeader}>
                          <span className={css.cardTitle}>{order.client}</span>
                          {movedQty > 0 && (
                            <span
                              className={
                                movedQty >= order.different
                                  ? css.checkmarkGreen
                                  : css.checkmarkYellow
                              }
                            >
                              ✓
                            </span>
                          )}
                        </div>
                        <div className={css.cardRow}>
                          <span className={css.cardLabel}>Менеджер:</span>
                          <span className={css.cardValue}>{order.manager}</span>
                        </div>
                        <div className={css.cardRow}>
                          <span className={css.cardLabel}>Доповнення:</span>
                          <span className={css.cardValue}>{order.contract_supplement}</span>
                        </div>
                        <div className={css.cardRow}>
                          <span className={css.cardLabel}>Вид діяльності:</span>
                          <span className={css.cardValue} style={{ fontSize: '11px', opacity: 0.8 }}>{order.line_of_business}</span>
                        </div>
                        {order.contract_type && (
                           <div className={css.cardRow}>
                             <span className={css.cardLabel}>Тип контракту:</span>
                             <span className={css.cardValue} style={{ fontSize: '11px', opacity: 0.8 }}>{order.contract_type}</span>
                           </div>
                         )}
                         <div className={css.cardRow}>
                           <span className={css.cardLabel}>Статус документа:</span>
                           <span className={css.cardValue} style={{ 
                             color: order.document_status === "затверджено" ? "#4ade80" : "#fbbf24",
                             fontWeight: 700
                           }}>{order.document_status}</span>
                         </div>
                          <div className={css.cardRow}>
                            <span className={css.cardLabel}>Оплата:</span>
                            <span className={css.cardValue}>
                              {(() => {
                                const pay = getPaymentInfo(order);
                                return (
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: pay.bgColor,
                                    color: pay.color,
                                    border: pay.border,
                                    padding: '6px 12px',
                                    borderRadius: '10px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                  }}>
                                    {pay.icon}
                                    <span>{pay.label}</span>
                                  </div>
                                );
                              })()}
                            </span>
                          </div>
                        <div className={css.cardRow}>
                          <span className={css.cardLabel}>До постачання:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '0.75rem', opacity: 0.7, fontWeight: 500 }}>До постачання:</span>
                            <span className={css.cardValue} style={{ 
                              color: order.delivery_status?.includes("Так") ? "#4ade80" : "#ef4444",
                              fontWeight: 700
                            }}>
                              {order.delivery_status?.includes("Так") ? "Так" : "Ні"}
                            </span>
                          </div>
                        </div>
                        <div className={css.cardRow}>
                          <span className={css.cardLabel}>Кількість:</span>
                          <span className={css.cardValue} style={{ fontWeight: 800, fontSize: '1.1rem' }}>{order.different}</span>
                        </div>
                      </div>
                  );
                })}
              </div>
            </>
        ) : (
            <p>По цьому товару немає заявок.</p>
        )}
      </div>
  );
}