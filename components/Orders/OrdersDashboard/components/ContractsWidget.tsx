"use client";

import { Client, Contract } from "@/types/types";
import styles from "../OrdersDashboard.module.css";
import clsx from "clsx";

interface ContractsWidgetProps {
  initData: string;
  selectedClient: Client | null;
  contracts: Contract[];
  selectedContracts: Contract[];
  onSelectContract: (contract: Contract) => void;
}

export default function ContractsWidget({
  selectedClient,
  contracts,
  selectedContracts,
  onSelectContract,
}: ContractsWidgetProps) {


  // Якщо клієнт не обраний, показуємо підказку
  if (!selectedClient) {
    return (
      <div style={{ padding: "20px", textAlign: "center", opacity: 0.6 }}>
        Оберіть клієнта зі списку
      </div>
    );
  }



  return (
    <div className={styles.tableContainer}>
      <div className={styles.list}>
        {contracts?.map((contract) => (
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
