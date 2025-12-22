import { useQuery } from "@tanstack/react-query";
import { getOrdersDetailsById } from "@/lib/api";
import { Client, Contract, OrdersDetails } from "@/types/types";
import styles from "../OrdersDashboard.module.css";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal/Modal";
import DetailsOrdersByProduct from "@/components/DetailsOrdersByProduct/DetailsOrdersByProduct";
import { Truck } from "lucide-react";
import { useDelivery } from "@/store/Delivery";

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

  const [selectedProductForModal, setSelectedProductForModal] = useState<string | null>(null);

  const router = useRouter();
  const { setDelivery, hasItem } = useDelivery();

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

  const handleDemandClick = (item: OrdersDetails) => {
      // Судячи з логів, item.product містить ID товару
      if (item.product) {
          setSelectedProductForModal(item.product);
      }
  };

  const closeModal = () => {
      setSelectedProductForModal(null);
  };

  const handleDeliveryClick = (item: OrdersDetails) => {
    // Логика формирования имени продукта как в мобильной версии
    const parts = [];
    parts.push(item.nomenclature);
    if (item.party_sign && item.party_sign.trim() !== "") {
      parts.push(item.party_sign.trim());
    }
    if (item.buying_season && item.buying_season.trim() !== "") {
      parts.push(`${item.buying_season.trim()} рік`);
    }
    const combinedName = parts.join(" ");

    // Формируем объект для доставки с теми же полями и ID
    const deliveryItem = {
      product: combinedName,
      quantity: item.different,
      manager: item.manager,
      order: item.contract_supplement,
      client: item.client,
      id: item.contract_supplement + item.nomenclature, // ID как в Table.client.tsx
      orders_q: item.orders_q,
      parties: item.parties,
      buh: item.buh,
      skl: item.skl,
      qok: item.qok,
    };
    
    setDelivery(deliveryItem);
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


  // Функція для підрахунку суми moved_q зі списку партій
  const calculateTotalPartiesMoved = (parties: { moved_q: number }[] | undefined) => {
    return parties?.reduce((acc, p) => acc + (p.moved_q || 0), 0) || 0;
  };

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
            <th className={styles.th} style={{ width: "40px", textAlign: "center" }}><Truck size={16} /></th>
          </tr>
        </thead>
        <tbody>
            {isLoading && (
                <tr>
                    <td colSpan={6} style={{padding: '10px', textAlign: 'center'}}>Завантаження даних...</td>
                </tr>
            )}
            
          {detailsList?.map((item: OrdersDetails) => {
            // Генерируем ID для проверки в сторе
            const itemId = item.contract_supplement + item.nomenclature;
            const isSelected = hasItem(itemId);

            return (
              <tr key={item.id} className={isSelected ? styles.selectedRow : ""}>
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
                  <div style={{ fontSize: "11px" }}>
                    <div>Бух: {item.buh}</div>
                    <div>Скл: {item.skl}</div>
                  </div>
                </td>
                <td 
                  className={styles.td}
                  onClick={() => handleDemandClick(item)}
                  style={{ cursor: "pointer" }}
                  title="Переглянути деталі заявок"
                >
                    {item.orders_q}
                </td> 
                {/* Ячейка з галочкою */}
                  <td className={styles.td}>
                    {(() => {
                      const sumMovedQ = calculateTotalPartiesMoved(item.parties);
                      if (sumMovedQ === 0 && item.orders_q>item.buh ) return <span className={styles.checkmarkRed}>✓</span>;

                      if ((sumMovedQ >= item.different && item.buh<=item.skl)|| item.orders_q<=item.buh&&item.buh<=item.skl) {
                        return <span className={styles.checkmarkGreen}>✓</span>;
                      } else {
                        return <span className={styles.checkmarkYellow}>✓</span>;
                      }
                    })()}
                </td>
                
                {/* Ячейка з іконкою доставки */}
                <td 
                   className={styles.td}
                   style={{ 
                     textAlign: "center", 
                     cursor: "pointer",
                     color: isSelected ? "var(--primary-color, #2563eb)" : "inherit" 
                   }}
                   onClick={() => handleDeliveryClick(item)}
                   title={isSelected ? "Видалити з доставки" : "Додати до доставки"}
                >
                   <Truck 
                     size={18} 
                     fill={isSelected ? "currentColor" : "none"}
                     strokeWidth={isSelected ? 0 : 2}
                   />
                </td>

              </tr>
            );
          })}

          {!isLoading && (!detailsList || detailsList.length === 0) && (
            <tr>
              <td colSpan={6} style={{ padding: "20px", textAlign: "center", opacity: 0.6 }}>
                {selectedContracts.length > 0
                  ? "Даних не знайдено"
                  : "Оберіть доповнення"}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {selectedProductForModal && (
          <Modal onClose={closeModal}>
              <DetailsOrdersByProduct selectedProductId={selectedProductForModal} />
          </Modal>
      )}
    </div>
  );
}
