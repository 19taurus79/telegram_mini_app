"use client";

import { useQuery } from "@tanstack/react-query";
import { getDeliveries } from "@/lib/api";
import { Client, Contract } from "@/types/types";
import styles from "../OrdersDashboard.module.css";
import { useState, useMemo } from "react";
import OrderCommentModal from "@/components/Orders/OrderCommentModal/OrderCommentModal";
import OrderCommentBadge from "@/components/Orders/OrderCommentBadge/OrderCommentBadge";
import { Truck } from "lucide-react";
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
    if (!allDeliveries) return { isCO: false, isInDelivery: false };
    
    let isCO = false;
    let isInDelivery = false;

    allDeliveries.forEach(d => {
      const activeStatuses = ["Створено", "В роботі", "created", "inprogress", "Доставка з ЦО на клієнта"];
      const matchesStatus = activeStatuses.some(s => s.toLowerCase() === d.status?.toLowerCase());
      if (!matchesStatus) return;

      const hasItem = d.items?.some(di => di.order_ref?.trim() === contractRef.trim());
      if (hasItem) {
        if (d.status?.toLowerCase().includes("цо")) {
          isCO = true;
        } else {
          isInDelivery = true;
        }
      }
    });

    return { isCO, isInDelivery };
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
            >
              {/* Заголовок картки контракту зі статусом доставки */}
              <div className={styles.contractHeader}>
                <span style={{ flex: 1 }}>
                  {contract.contract_supplement}
                </span>
                
                {/* Бейджі доставки */}
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {(isCO || isInDelivery) && (
                    <span className={styles.deliveryBadge} style={{ margin: 0, padding: '4px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={isCO && isInDelivery ? "Доставка (в т.ч. ЦО)" : (isCO ? "Доставка з ЦО" : "В доставці")}>
                      <Truck size={14} />
                    </span>
                  )}
                </div>

                <div onClick={(e) => e.stopPropagation()}>
                  <OrderCommentBadge
                    orderRef={contract.contract_supplement}
                    onClick={() =>
                      setCommentModalData({
                        orderRef: contract.contract_supplement,
                      })
                    }
                  />
                </div>
                <span
                  className={clsx(
                    styles.statusBadge,
                    contract.delivery_status?.includes("Так")
                      ? styles.statusOk
                      : styles.statusFailed
                  )}
                >
                  {contract.delivery_status}
                </span>
              </div>
              {/* Вид діяльності */}
              <div className={styles.contractSub}>
                {contract.line_of_business}
              </div>
              {/* Статус документа (затверджено/відхилено тощо) */}
              <div style={{ marginTop: "4px" }}>
                <span
                  className={clsx(
                    styles.statusBadge,
                    contract.document_status === "затверджено" && styles.statusOk,
                    contract.document_status === "створено менеджером" &&
                      styles.statusWaiting,
                    contract.document_status === "відхилено" && styles.statusFailed
                  )}
                >
                  {contract.document_status}
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
