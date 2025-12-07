"use client";

import { useQuery } from "@tanstack/react-query";
import { getContracts } from "@/lib/api";
import { Client, Contract } from "@/types/types";
import styles from "../OrdersDashboard.module.css";
import clsx from "clsx";

interface ContractsWidgetProps {
  initData: string;
  selectedClient: Client | null;
  selectedContract: Contract | null;
  onSelectContract: (contract: Contract) => void;
}

export default function ContractsWidget({
  initData,
  selectedClient,
  selectedContract,
  onSelectContract,
}: ContractsWidgetProps) {
  // Запит на отримання контрактів обраного клієнта
  const { data: contracts, isLoading } = useQuery({
    queryKey: ["contracts", selectedClient?.id],
    queryFn: () =>
      selectedClient
        ? getContracts({ client: selectedClient.id, initData })
        : Promise.resolve([]),
    enabled: !!selectedClient && !!initData, // Активний тільки якщо обрано клієнта
  });

  // Якщо клієнт не обраний, показуємо підказку
  if (!selectedClient) {
    return (
      <div style={{ padding: "20px", textAlign: "center", opacity: 0.6 }}>
        Оберіть клієнта зі списку
      </div>
    );
  }

  if (isLoading) {
    return <div style={{ padding: "20px" }}>Завантаження контрактів...</div>;
  }

  return (
    <div className={styles.tableContainer}>
      <div className={styles.list}>
        {contracts?.map((contract) => (
          <div
            key={contract.contract_supplement}
            className={clsx(styles.contractCard, {
              [styles.contractCardSelected]:
                selectedContract?.contract_supplement ===
                contract.contract_supplement,
            })}
            onClick={() => onSelectContract(contract)}
          >
            {/* Заголовок картки контракту зі статусом доставки */}
            <div className={styles.contractHeader}>
              <span>{contract.contract_supplement}</span>
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
        ))}
        {!contracts?.length && (
          <p style={{ padding: "10px", opacity: 0.6 }}>Контрактів не знайдено</p>
        )}
      </div>
    </div>
  );
}
