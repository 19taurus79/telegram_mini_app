import { useState, useEffect } from "react";
import { useApplicationsStore } from "../../store/applicationsStore";
import { useMapControlStore } from "../../store/mapControlStore";
import { useDisplayAddressStore } from "../../store/displayAddress";
import { getInitData } from "@/lib/getInitData";
import { updateDeliveryData } from "@/lib/api";
import toast from "react-hot-toast";
import css from "./bottomData.module.css";

export default function BottomData({ onEditClient }) {
  const { 
    selectedClient, 
    selectedDelivery, 
    setIsEditDeliveryModalOpen,
    selectedDeliveries,
    deliveries,
    updateDeliveries
  } = useApplicationsStore();

  const handleUpdateStatus = async (d, newStatus) => {
    try {
        const initData = getInitData();
        const deliveryId = parseInt(d.id, 10);
        if (isNaN(deliveryId)) {
            toast.error("Некоректний ID доставки");
            return;
        }

        const sanitizedItems = (d.items || []).map(item => ({
            product: String(item.product),
            nomenclature: String(item.nomenclature || item.product),
            quantity: Number(item.quantity) || 0,
            manager: String(item.manager || d.manager || ""),
            client: String(item.client || d.client || ""),
            orderRef: String(item.order_ref || item.order || ""),
            order: String(item.order_ref || item.order || ""), 
            weight: Number(item.weight) || 0,
            parties: Array.isArray(item.parties) 
                ? item.parties.map(p => ({
                    party: String(p.party),
                    moved_q: Number(p.party_quantity || p.moved_q) || 0
                  }))
                : []
        }));

        const res = await updateDeliveryData(String(deliveryId), newStatus, sanitizedItems, initData);
        
        // Backend might return "success", "ok", or the status itself
        const isOk = res && (res.status === "success" || res.status === "ok" || res.status === newStatus);
        
        if (isOk) {
            toast.success(`Статус змінено на "${newStatus}"`);
            updateDeliveries([{ ...d, status: newStatus }]);
        } else {
            // Even if status isn't exactly "success", if we got here it might have worked
            toast.success(`Статус оновлено: "${newStatus}"`);
            updateDeliveries([{ ...d, status: newStatus }]);
        }
    } catch (e) {
        console.error("Error updating status:", e);
        toast.error("Помилка при зміні статусу");
    }
  };

  const { areApplicationsVisible, areClientsVisible, areDeliveriesVisible } = useMapControlStore();
  const { addressData } = useDisplayAddressStore();
  const [expandedIds, setExpandedIds] = useState(new Set());

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderItems = (items) => {
    if (!items || items.length === 0) return null;
    return (
      <div className={css.itemsList}>
        {items.map((item, idx) => (
          <div key={idx} className={css.itemRow}>
            <div className={css.itemProductRow}>
              <div className={css.itemNameCol}>
                <div className={css.itemName}>
                  {(item.product || "").replace(/\s*рік\s*$/i, "").trim()}
                </div>
                {item.order_ref && <span className={css.itemRef}>{item.order_ref}</span>}
              </div>
              <div className={css.itemTotalQuantity}>{item.quantity}</div>
            </div>
            
            {item.parties && item.parties.length > 0 && (
              <div className={css.partiesList}>
                {item.parties.map((p, pIdx) => (
                  <div key={pIdx} className={css.partyItem}>
                    <span className={css.partyLabel}>Партія: {p.party}</span>
                    <span className={css.partyAmount}>{p.party_quantity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Режим відображення доставок
  if (areDeliveriesVisible) {
    
    if (!selectedDeliveries || selectedDeliveries.length === 0) {
      return (
        <div className={css.container}>
          <p className={css.emptyMessage}>Оберіть доставку на карті або у списку</p>
        </div>
      );
    }

    // Якщо обрано декілька доставок - показуємо зведену інформацію
    if (selectedDeliveries.length > 1) {
      const totalWeight = selectedDeliveries.reduce((sum, d) => sum + (d.total_weight || 0), 0);
      
      // Групування по контрагенту
      const groupingByClient = {};
      selectedDeliveries.forEach(d => {
        if (!groupingByClient[d.client]) {
          groupingByClient[d.client] = {
            weight: 0,
            deliveries: []
          };
        }
        groupingByClient[d.client].weight += d.total_weight || 0;
        groupingByClient[d.client].deliveries.push(d);
      });

      return (
        <div className={css.container}>
          <div className={css.deliveryHeader}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h2 className={css.title}>📊 Сводка: {selectedDeliveries.length} достав.</h2>
              <div className={css.itemTotalQuantity} style={{ fontSize: '1.1em' }}>
                Всього: {totalWeight.toFixed(2)} кг
              </div>
            </div>
            <button 
              className={css.deliveryEditBtn}
              onClick={() => setIsEditDeliveryModalOpen(true)}
            >
              Доставка
            </button>
          </div>

          <div className={css.ordersContainer}>
            {Object.entries(groupingByClient).map(([client, data]) => (
              <div key={client} className={css.contractGroup}>
                <div className={css.itemProductRow} style={{ borderBottom: 'none' }}>
                  <h3 className={css.contractNumber} style={{ margin: 0 }}>{client}</h3>
                  <div className={css.itemTotalQuantity}>{data.weight.toFixed(2)} кг</div>
                </div>
                
                <div className={css.deliverySubList}>
                  {data.deliveries.map(d => (
                    <div key={d.id} className={css.multiDeliveryBox}>
                      <div 
                        className={css.accordionHeader} 
                        onClick={() => toggleExpand(d.id)}
                      >
                        <div className={css.partyItem} style={{ opacity: 1, width: '100%', marginBottom: expandedIds.has(d.id) ? '8px' : 0 }}>
                          <span className={css.partyLabel} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {expandedIds.has(d.id) ? '▼' : '▶'} ID: {d.id} | {d.address}
                            <span className={`${css.statusBadge} ${
                              d.status === "Створено" || d.status === "created" ? css.statusCreated :
                              d.status === "В роботі" || d.status === "inprogress" ? css.statusInProgress :
                              d.status === "Виконано" || d.status === "completed" ? css.statusCompleted : ""
                            }`}>
                              {d.status}
                            </span>
                          </span>
                          <span className={css.partyAmount}>{d.total_weight?.toFixed(2)} кг</span>
                        </div>
                      </div>
                      
                      {expandedIds.has(d.id) && (
                        <div className={css.accordionContent}>
                           <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                              {d.status !== "Виконано" && (
                                <button 
                                  className={css.deliveryEditBtn}
                                  onClick={(e) => { e.stopPropagation(); setIsEditDeliveryModalOpen(true); }}
                                  style={{ fontSize: '0.8em', padding: '4px 12px' }}
                                >
                                  Доставка
                                </button>
                              )}
                              <button 
                                className={css.deliveryEditBtn}
                                onClick={(e) => { e.stopPropagation(); handleUpdateStatus(d, d.status === "Виконано" ? "В роботі" : "Виконано"); }}
                                style={{ 
                                  fontSize: '0.8em', 
                                  padding: '4px 12px',
                                  backgroundColor: d.status === "Виконано" ? '#ff9800' : '#4caf50' 
                                }}
                              >
                                {d.status === "Виконано" ? "В роботі" : "Виконано"}
                              </button>
                           </div>
                           {renderItems(d.items)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Якщо обрана одна доставка - показуємо деталі (існуюча логіка)
    const delivery = selectedDeliveries[0];
    const isCompleted = delivery.status === "Виконано";

    return (
      <div className={css.container}>
        <div className={css.deliveryHeader}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 className={css.title}>🚀 Доставка: {delivery.client}</h2>
            <span className={`${css.statusBadge} ${
              delivery.status === "Створено" || delivery.status === "created" ? css.statusCreated :
              delivery.status === "В роботі" || delivery.status === "inprogress" ? css.statusInProgress :
              delivery.status === "Виконано" || delivery.status === "completed" ? css.statusCompleted : ""
            }`}>
              {delivery.status}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {!isCompleted && (
              <button 
                className={css.deliveryEditBtn}
                onClick={() => setIsEditDeliveryModalOpen(true)}
              >
                Доставка
              </button>
            )}
            {isCompleted ? (
              <button 
                className={css.deliveryEditBtn}
                onClick={() => handleUpdateStatus(delivery, "В роботі")}
                style={{ backgroundColor: '#ff9800' }}
              >
                Змінити статус на "В роботі"
              </button>
            ) : (
              <button 
                className={css.deliveryEditBtn}
                onClick={() => handleUpdateStatus(delivery, "Виконано")}
                style={{ backgroundColor: '#4caf50' }}
              >
                Змінити статус на "Виконано"
              </button>
            )}
          </div>
        </div>
        <div className={css.addressInfo}>
            <p><strong>Адреса:</strong> {delivery.address}</p>
            <p><strong>Менеджер:</strong> {delivery.manager}</p>
            <p><strong>Дата доставки:</strong> {delivery.delivery_date}</p>
            <p><strong>Вага:</strong> <span className={css.weight}>{delivery.total_weight?.toFixed(2)} кг</span></p>
            <p><strong>Контакт:</strong> {delivery.contact} (<a href={`tel:${delivery.phone}`} style={{ textDecoration: 'underline', color: 'inherit' }}>{delivery.phone}</a>)</p>
            {delivery.comment && <p className={css.comment}><strong>Коментар:</strong> {delivery.comment}</p>}
        </div>
        
        {delivery.items && delivery.items.length > 0 && (
          <div className={css.itemsSection}>
            <h4 className={css.itemsTitle}>📦 Товари у доставці:</h4>
            {renderItems(delivery.items)}
          </div>
        )}
      </div>
    );
  }

  // Режим отображения заявок
  if (areApplicationsVisible) {
    // Если выбран клиент с заявками - показываем его
    if (selectedClient && selectedClient.orders) {
       // Продолжаем выполнение блока
    } else if (selectedClient && !selectedClient.orders && areClientsVisible) {
       // Если выбран контрагент (без заявок) и включен режим контрагентов - пропускаем этот блок
       // чтобы сработал следующий if (areClientsVisible)
    } else {
      return (
        <div className={css.container}>
          <p className={css.emptyMessage}>Оберіть клієнта на карті для перегляду заявок</p>
        </div>
      );
    }

    if (selectedClient && selectedClient.orders) {
    // Группируем заявки по номеру договора
    const groupedOrders = {};
    selectedClient.orders.forEach(order => {
      const contractNum = order.contract_supplement || 'Без номера';
      if (!groupedOrders[contractNum]) {
        groupedOrders[contractNum] = [];
      }
      groupedOrders[contractNum].push(order);
    });

    const cleanProduct = (p) => (p || "").replace(/\s*рік\s*$/i, "").trim().toLowerCase();
    const cleanClient = (c) => (c || "").trim().toLowerCase();

    const getProductName = (item) => {
      const parts = [item.nomenclature];
      if (item.party_sign && item.party_sign.trim() !== "") {
        parts.push(item.party_sign.trim());
      }
      if (item.buying_season && item.buying_season.trim() !== "") {
        parts.push(item.buying_season.trim());
      }
      return parts.join(" ").trim();
    };

    const isInDelivery = (order) => {
      if (!deliveries || deliveries.length === 0) return false;
      const currentName = getProductName(order);
      const sClient = (selectedClient.client || "").trim().toLowerCase();
      
      return deliveries.some(d => {
        const dClient = (d.client || "").trim().toLowerCase();
        return dClient === sClient && 
               ["Створено", "В роботі", "created"].includes(d.status) &&
               d.items?.some(di => 
                 di.order_ref?.trim() === order.contract_supplement?.trim() && 
                 di.product?.trim() === currentName
               );
      });
    };

    return (
      <div className={css.container}>
        <h2 className={css.title}>
          {selectedClient.client}
        </h2>
        <h3>{selectedClient.orders[0].manager}</h3>
        <p className={css.subtitle}>
          {`${selectedClient.address.region} обл., ${selectedClient.address.area} район, ${selectedClient.address.commune} громада, ${selectedClient.address.city}`}
        </p>
        <p className={css.orderCount}>
          Всього заявок: {selectedClient.count}
        </p>
        
        <div className={css.ordersContainer}>
          {Object.entries(groupedOrders).map(([contractNum, orders]) => (
            <div key={contractNum} className={css.contractGroup}>
              <h3 className={css.contractNumber}>Договір: {contractNum}</h3>
              <ul className={css.ordersList}>
                {orders.map((order, index) => (
                  <li 
                    key={index} 
                    className={`${css.orderItem} ${isInDelivery(order) ? css.inDeliveryRow : ""}`}
                  >
                    <div className={css.productName}>
                      {order.nomenclature}
                      {isInDelivery(order) && (
                        <span className={css.deliveryBadge}>В ДОСТАВЦІ</span>
                      )}
                    </div>
                    <div className={css.orderDetails}>
                      <span>Кількість: {order.different}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
    }
  }

  // Режим отображения контрагентов
  if (areClientsVisible) {
    if (!selectedClient) {
      return (
        <div className={css.container}>
          <p className={css.emptyMessage}>Оберіть контрагента на карті для перегляду інформації</p>
        </div>
      );
    }

    return (
      <div className={css.container}>
        <h2 className={css.title}>{selectedClient.client}</h2>
        <div className={css.addressInfo}>
            <p><strong>Адреса:</strong> {selectedClient.region} обл., {selectedClient.area} район, {selectedClient.commune} громада, {selectedClient.city}</p>
            <p><strong>Менеджер:</strong> {selectedClient.manager}</p>
            <p><strong>Контактна особа:</strong> {selectedClient.representative}</p>
            <p><strong>Телефон:</strong> <a href={`tel:${selectedClient.phone1}`} style={{ textDecoration: 'underline', color: 'inherit' }}>{selectedClient.phone1}</a></p>
            {selectedClient.phone2 && selectedClient.phone2 !== "Не вказано" && <p><strong>Телефон 2:</strong> <a href={`tel:${selectedClient.phone2}`} style={{ textDecoration: 'underline', color: 'inherit' }}>{selectedClient.phone2}</a></p>}
            {selectedClient.email && <p><strong>Email:</strong> {selectedClient.email}</p>}
        </div>
        {onEditClient && (
          <button 
            className={css.editButton} 
            onClick={() => onEditClient(selectedClient)}
          >
            Редагувати
          </button>
        )}
      </div>
    );
  }

  // Режим поиска адреса (стандартный)
  if (!addressData || Object.keys(addressData).length === 0) {
    return (
      <div className={css.container}>
        <p className={css.emptyMessage}>Оберіть адресу на карті або через пошук</p>
      </div>
    );
  }

  return (
    <div className={css.container}>
      <h2 className={css.title}>Обрана адреса</h2>
      <div className={css.addressInfo}>
        <p><strong>Адреса:</strong> {addressData.display_name}</p>
        {addressData.lat && <p><strong>Координати:</strong> {addressData.lat}, {addressData.lon}</p>}
        {/* Здесь можно добавить другие поля адреса, если они есть */}
      </div>
    </div>
  );
}
