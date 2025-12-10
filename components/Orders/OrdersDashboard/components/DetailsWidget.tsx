"use client";

import { useQuery } from "@tanstack/react-query";
import { getOrdersDetailsById } from "@/lib/api";
import { Client, Contract, OrdersDetails } from "@/types/types";
import styles from "../OrdersDashboard.module.css";
import { useMemo } from "react";
import { useRouter } from "next/navigation";

interface DetailsWidgetProps {
  initData: string;
  selectedClient: Client | null;
  selectedContracts: Contract[];
  showAllContracts: boolean;
}

export default function DetailsWidget({
  initData,
  selectedClient,
  selectedContracts,
  showAllContracts,
}: DetailsWidgetProps) {
  
  // useMemo не потрібен для queryId, бо ми тепер працюємо з масивом обраних контрактів
  // Але щоб React Query коректно оновлювався, сформуємо ключ залежно від списку ID
  const contractsIds = useMemo(() => {
     return selectedContracts.map(c => c.contract_supplement).sort().join(",");
  }, [selectedContracts]);

  const router = useRouter();

  const handleRemainsClick = (item: OrdersDetails) => {
      // Переходимо тільки якщо є залишки по бухгалтерії
      if (item.buh > 0) {
          // Формуємо пошуковий запит: Номенклатура + Ознака партії + Рік врожаю
          const searchParts = [item.nomenclature, item.party_sign, item.buying_season]
            .filter(part => part && part.trim() !== '') // Прибираємо пусті частини
            .join(' ');
            
          const searchQuery = encodeURIComponent(searchParts);
          router.push(`/remains?search=${searchQuery}`);
      }
  };

  const { data: detailsList, isLoading } = useQuery({
    queryKey: ["ordersDetailsFull", selectedClient?.id, contractsIds],
    queryFn: async () => {
        if (!selectedClient) return [];
        
        // Якщо обрано контракти, вантажимо їх деталі паралельно
        if (selectedContracts.length > 0) {
            const promises = selectedContracts.map(contract => 
                getOrdersDetailsById({ orderId: contract.contract_supplement, initData })
            );
            const results = await Promise.all(promises);
            // Об'єднуємо всі результати в один плоский масив
            return results.flat();
        }
        
        return [];
    },
    enabled: !!selectedClient && !!initData && (selectedContracts.length > 0 || showAllContracts)
  });
  //   // Функція для підрахунку суми different зі списку елементів
  // const calculateTotalDifferent = (items: OrdersDetails[] | undefined) => {
  //   return items?.reduce((acc, item) => acc + (item.different || 0), 0) || 0;
  // };

  // Функція для підрахунку суми moved_q зі списку партій
  const calculateTotalPartiesMoved = (parties: { moved_q: number }[] | undefined) => {
    return parties?.reduce((acc, p) => acc + (p.moved_q || 0), 0) || 0;
  };

  // const sumMovedQ = calculateTotalDifferent(detailsList);
console.log(detailsList)
  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Доповнення</th>
            <th className={styles.th}>Товар</th>
            {/* <th className={styles.th} style={{ width: "60px" }}>План</th> */}
            <th className={styles.th} style={{ width: "60px" }}>Кількість</th>
            <th className={styles.th}>Переміщено (Партії)</th>
            <th className={styles.th}>Залишки (Загальні)</th>
            <th className={styles.th}>Потреба по підрозділу</th>
            <th className={styles.th}>Готовність до відвантаження</th>
            {/* <th className={styles.th}>Переміщено</th> */}
          </tr>
        </thead>
        <tbody>
            {isLoading && (
                <tr>
                    <td colSpan={5} style={{padding: '10px', textAlign: 'center'}}>Завантаження даних...</td>
                </tr>
            )}
            
          {detailsList?.map((item: OrdersDetails) => (
            <tr key={item.id}>
              <td className={styles.td}>{item.contract_supplement}</td>
              <td className={styles.td} title={item.nomenclature}>
                {`${item.nomenclature} ${item.party_sign} ${item.buying_season}`}
              </td>
              {/* <td className={styles.td}>{item.orders_q}</td> */}
              <td className={styles.td}>{item.different}</td> {/* Припускаємо, що different = Fact/Moved */}
              <td className={styles.td}>
                {/* Партії */}
                {item.parties?.length > 0 ? (
                  <div style={{ fontSize: "11px" }}>
                    {item.parties.map((p, i) => (
                      <div key={i}>
                        {p.moved_q} {p.party ? `(${p.party})` : ''}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{ opacity: 0.5 }}>-</span>
                )}
              </td>
              <td 
                className={styles.td} 
                onClick={() => handleRemainsClick(item)}
                style={{ 
                    cursor: item.buh > 0 ? "pointer" : "default",
                    backgroundColor: item.buh > 0 ? "var(--hover-bg, rgba(0,0,0,0.02))" : "inherit"
                }}
                title={item.buh > 0 ? "Перейти до залишків" : ""}
              >
                {/* Залишки приходять прямо в об'єкті details */}
                <div style={{ fontSize: "11px" }}>
                  <div>Бух: {item.buh}</div>
                  <div>Скл: {item.skl}</div>
                </div>
              </td>
              <td className={styles.td}>{item.orders_q}</td> 
              {/* Ячейка з галочкою */}
                <td className={styles.td}>
                  {(() => {
                    // const qok = item.qok
                    const sumMovedQ = calculateTotalPartiesMoved(item.parties);
                    if (sumMovedQ === 0 && item.orders_q>item.buh ) return <span className={styles.checkmarkRed}>✓</span>;

                    if ((sumMovedQ >= item.different && item.buh<=item.skl)|| item.orders_q<=item.buh&&item.buh<=item.skl) {
                      // Якщо переміщено достатньо - зелена галочка
                      return <span className={styles.checkmarkGreen}>✓</span>;
                    } else {
                      // Якщо переміщено, але не все - жовта
                      return <span className={styles.checkmarkYellow}>✓</span>;
                    }
                  })()}
              </td>
              {/* <td className={styles.td}>{calculateTotalPartiesMoved(item.parties)}</td> */}
            </tr>
          ))}

          {!isLoading && (!detailsList || detailsList.length === 0) && (
            <tr>
              <td colSpan={5} style={{ padding: "20px", textAlign: "center", opacity: 0.6 }}>
                {selectedContracts.length > 0
                  ? "Даних не знайдено"
                  : "Оберіть доповнення"}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
