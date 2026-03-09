import { useState, useEffect, useMemo } from "react";
import { useApplicationsStore } from "../../store/applicationsStore";
import { useMapControlStore } from "../../store/mapControlStore";
import { useDisplayAddressStore } from "../../store/displayAddress";
import { getInitData } from "@/lib/getInitData";
import { updateDeliveryData, changeDeliveryDate } from "@/lib/api";
import { useUser } from "@/store/User";
import toast from "react-hot-toast";
import css from "./bottomData.module.css";
import { Download, Printer, ChevronDown, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function BottomData({ onEditClient }) {
  const { 
    selectedClient, 
    selectedDelivery, 
    setIsEditDeliveryModalOpen,
    selectedDeliveries,
    deliveries,
    updateDeliveries,
    multiSelectedItems,
    selectionType,
    clearMultiSelectedItems,
    removeDelivery,
    setIsPrintRequested
  } = useApplicationsStore();

  const userData = useUser(state => state.userData);
  const isGuest = userData?.is_guest;

  const [expandedClientIds, setExpandedClientIds] = useState(new Set());

  const toggleClientExpand = (clientId) => {
    setExpandedClientIds(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

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
            orderRef: String(item.order_ref || item.order || item.orderRef || ""),
            weight: Number(item.total_weight) || Number(item.weight) || 0, // <-- Виправлено: пріоритет total_weight, потім weight
            parties: Array.isArray(item.parties) 
                ? item.parties.map(p => ({
                    party: String(p.party),
                    moved_q: Number(p.party_quantity || p.moved_q) || 0
                  }))
                : []
        }));

        const totalWeight = sanitizedItems.reduce((sum, item) => sum + item.weight, 0);
        const res = await updateDeliveryData(String(deliveryId), newStatus, sanitizedItems, totalWeight, initData);
        
        const isOk = res && (res.status === "success" || res.status === "ok" || res.status === newStatus);
        
        if (isOk) {
            toast.success(`Статус змінено на "${newStatus}"`);
            updateDeliveries([{ ...d, status: newStatus }]);
        } else {
            toast.success(`Статус оновлено: "${newStatus}"`);
            updateDeliveries([{ ...d, status: newStatus }]);
        }
    } catch (e) {
        console.error("Error updating status:", e);
        toast.error("Помилка при зміні статусу");
    }
  };

  const handleDeleteDelivery = async (d) => {
    setDeleteConfirmTarget(null);
    try {
      const initData = getInitData();
      const res = await import("@/lib/api").then(m => m.deleteDeliveryData(String(d.id), initData));
      
      // Handle the case where the endpoint returns null on success
      if (res === null || (res && (res.status === "success" || res.status === "ok"))) {
        toast.success("Доставку видалено");
        removeDelivery(d.id);
      } else {
        toast.error("Не вдалося видалити доставку");
      }
    } catch (e) {
      console.error("Error deleting delivery:", e);
      toast.error("Помилка при видаленні доставки");
    }
  };

  const { areApplicationsVisible, areClientsVisible, areDeliveriesVisible, setEditClientRequest } = useMapControlStore();
  const { addressData } = useDisplayAddressStore();
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null); 
  const [changeDateTarget, setChangeDateTarget] = useState(null);
  const [newDate, setNewDate] = useState("");

  const handleChangeDeliveryDate = async (d, newDateStr) => {
    if (!newDateStr) {
      toast.error("Введіть нову дату");
      return;
    }
    setChangeDateTarget(null);
    const loadingToast = toast.loading("Зміна дати...");
    try {
      const initData = getInitData();
      const res = await changeDeliveryDate(String(d.id), newDateStr, initData);

      if (res && res.status === "ok") {
        toast.success("Дату успішно змінено", { id: loadingToast });
        updateDeliveries([{ ...d, delivery_date: newDateStr }]);
      } else {
        toast.error("Не вдалося змінити дату", { id: loadingToast });
      }
    } catch (e) {
      console.error("Error changing delivery date:", e);
      toast.error("Помилка при зміні дати", { id: loadingToast });
    }
  };

  const toggleExpansion = (id) => { // Renamed from toggleExpand
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectionSummary = useMemo(() => {
    if (!multiSelectedItems || multiSelectedItems.length === 0) {
      return null;
    }

    const itemsToProcess = selectionType === 'applications' 
      ? multiSelectedItems 
      : (selectionType === 'clients' ? multiSelectedItems : []);

    // 1. Сначала группируем все по клиентам, чтобы убрать дубли
    const clientsMap = {};

    itemsToProcess.forEach(item => {
      const clientName = item.client;
      if (!clientName) return;

      if (!clientsMap[clientName]) {
        clientsMap[clientName] = {
          client: clientName,
          manager: item.address?.manager || item.manager || 'Невідомий менеджер',
          totalWeight: 0,
          count: 0,
          orders: []
        };
      }

      const clientData = clientsMap[clientName];
      
      // Добавляем заказы из агрегированных элементов (с карты)
      if (item.orders && Array.isArray(item.orders)) {
        clientData.totalWeight += item.totalWeight || 0;
        clientData.count += item.count || 0;
        item.orders.forEach(order => {
          clientData.orders.push(order);
        });
      } else if (selectionType === 'applications') {
        // RAW элемент списка (заявка)
        clientData.totalWeight += Number(item.total_weight) || item.weight || 0;
        clientData.count += 1;
        clientData.orders.push(item);
      } else if (selectionType === 'clients') {
        // RAW элемент списка/карты (клиент)
        // Чтобы клиент не отфильтровался ниже, даем ему "условный" вес или просто записываем его 
        // как 1 сущность
        clientData.count += 1;
      }
    });

    // 2. Теперь группируем уникальных клиентов по менеджерам
    const groupedByManager = {};
    let totalWeight = 0;
    let totalCount = 0;

    Object.values(clientsMap).forEach(clientData => {
      // Фильтрация: пропускаем, если нет ни заказов, ни признака выбранного клиента
      if (selectionType !== 'clients' && clientData.count === 0 && clientData.orders.length === 0) return;

      const manager = clientData.manager || 'Невідомий менеджер';

      if (!groupedByManager[manager]) {
        groupedByManager[manager] = {
          manager,
          clients: [],
          totalWeight: 0,
          totalCount: 0
        };
      }

      groupedByManager[manager].clients.push(clientData);
      groupedByManager[manager].totalWeight += clientData.totalWeight;
      groupedByManager[manager].totalCount += clientData.count;

      totalWeight += clientData.totalWeight;
      totalCount += clientData.count;
    });

    // 3. Преобразуем в массив и фильтруем пустых менеджеров
    const result = Object.values(groupedByManager).filter(m => m.clients.length > 0);

    if (result.length === 0) return null;

    return {
      groupedData: result,
      totalWeight,
      totalCount,
      totalClients: result.reduce((acc, m) => acc + m.clients.length, 0)
    };
  }, [multiSelectedItems, selectionType]);

  const handleExport = () => {
    if (!selectionSummary) return;

    const dataForSheet = selectionSummary.groupedData.flatMap(managerData =>
        managerData.clients.flatMap(clientData =>
            clientData.orders.map(order => ({
                'Менеджер': managerData.manager,
                'Клієнт': clientData.client,
                'Номер заявки': order.contract_supplement,
                'Товар': order.nomenclature,
                'Кількість': order.different,
                'Вага (кг)': order.total_weight || 0
            }))
        )
    );

    const ws = XLSX.utils.json_to_sheet(dataForSheet);

    ws['!cols'] = [
        { wch: 30 }, // Менеджер
        { wch: 40 }, // Клієнт
        { wch: 20 }, // Номер заявки
        { wch: 50 }, // Товар
        { wch: 10 }, // Кількість
        { wch: 10 }  // Вага (кг)
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Виділення');

    XLSX.writeFile(wb, 'selection.xlsx');
  };

  const handlePrint = () => {
    const printContent = document.getElementById('print-only-section');
    if (printContent) {
      const newWindow = window.open('', '', 'height=800,width=1000');
      newWindow.document.write('<html><head><title>Друк виділення</title>');
      newWindow.document.write('<style>body{font-family:sans-serif;padding:20px} table{width:100%;border-collapse:collapse;margin-bottom:20px} th,td{border:1px solid #ddd;padding:8px;text-align:left} .nested-table{margin-top:5px;border:none;width:100%} .nested-table th, .nested-table td {border: 1px solid #eee; font-size: 0.9em;} h3 {margin-top: 20px; margin-bottom: 10px; background: #f5f5f5; padding: 5px;}</style>');
      newWindow.document.write('</head><body>');
      newWindow.document.write(printContent.innerHTML);
      newWindow.document.write('</body></html>');
      newWindow.document.close();
      newWindow.print();
    }
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

  if (selectionSummary) {
    return (
      <div className={css.container}>
        <div className={css.selectionHeader}>
          <h2 className={css.title}>Зведення по виділенню</h2>
          <button onClick={clearMultiSelectedItems} className={css.closeButton}>×</button>
        </div>
        <div className={css.selectionTotals}>
          <div>Всього клієнтів: <strong>{selectionSummary.totalClients}</strong></div>
          <div>Всього заявок: <strong>{selectionSummary.totalCount}</strong></div>
          <div>Загальна вага: <strong>{selectionSummary.totalWeight.toFixed(2)} кг</strong></div>
        </div>
        <div className={css.selectionActions}>
          <button onClick={handleExport} className={css.actionButton}><Download size={16} /> Експорт в XLSX</button>
          <button onClick={handlePrint} className={css.actionButton}><Printer size={16} /> Друк</button>
        </div>
        
        {/* Видимая часть (аккордеон) */}
        <div className={css.selectionDetails}>
          {selectionSummary.groupedData.map(managerData => (
            <div key={managerData.manager} className={css.managerGroup}>
              <h3 className={css.managerName}>{managerData.manager}</h3>
              <table className={css.selectionTable}>
                <thead>
                  <tr>
                    <th style={{width: '50px'}}></th>
                    <th>Клієнт</th>
                    <th>К-ть заявок</th>
                    <th>Вага (кг)</th>
                  </tr>
                </thead>
                <tbody>
                  {managerData.clients.map(client => (
                    <>
                      <tr key={client.client} onClick={() => toggleClientExpand(client.client)} style={{cursor: 'pointer'}}>
                        <td>{expandedClientIds.has(client.client) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</td>
                        <td>{client.client}</td>
                        <td>{client.count}</td>
                        <td>{client.totalWeight.toFixed(2)}</td>
                      </tr>
                      {expandedClientIds.has(client.client) && (
                        <tr className={css.nestedRow}>
                          <td colSpan="4">
                            <table className={css.nestedTable}>
                              <thead>
                                <tr>
                                  <th>Доповнення</th>
                                  <th>Номенклатура</th>
                                  <th>Кількість</th>
                                </tr>
                              </thead>
                              <tbody>
                                {client.orders.map(order => (
                                  <tr key={order.id}>
                                    <td>{order.contract_supplement}</td>
                                    <td>{order.nomenclature}</td>
                                    <td>{order.different}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="2"><strong>Всього по менеджеру:</strong></td>
                    <td><strong>{managerData.totalCount}</strong></td>
                    <td><strong>{managerData.totalWeight.toFixed(2)}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}
        </div>

        {/* Скрытая часть для печати (все раскрыто) */}
        <div id="print-only-section" style={{ display: 'none' }}>
          <h2>Зведення по виділенню</h2>
          <div style={{ marginBottom: '20px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
             Всього клієнтів: <strong>{selectionSummary.totalClients}</strong> | 
             Всього заявок: <strong>{selectionSummary.totalCount}</strong> | 
             Загальна вага: <strong>{selectionSummary.totalWeight.toFixed(2)} кг</strong>
          </div>
          {selectionSummary.groupedData.map(managerData => (
            <div key={managerData.manager}>
              <h3>{managerData.manager}</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Клієнт</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Деталі замовлення</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Всього</th>
                  </tr>
                </thead>
                <tbody>
                  {managerData.clients.map(client => (
                    <tr key={client.client}>
                      <td style={{ border: '1px solid #ddd', padding: '8px', verticalAlign: 'top' }}>
                        <strong>{client.client}</strong>
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th style={{ borderBottom: '1px solid #eee', textAlign: 'left', fontSize: '0.9em' }}>Доповнення</th>
                              <th style={{ borderBottom: '1px solid #eee', textAlign: 'left', fontSize: '0.9em' }}>Товар</th>
                              <th style={{ borderBottom: '1px solid #eee', textAlign: 'left', fontSize: '0.9em' }}>К-ть</th>
                            </tr>
                          </thead>
                          <tbody>
                            {client.orders.map(order => (
                              <tr key={order.id}>
                                <td style={{ padding: '4px', fontSize: '0.9em' }}>{order.contract_supplement}</td>
                                <td style={{ padding: '4px', fontSize: '0.9em' }}>{order.nomenclature}</td>
                                <td style={{ padding: '4px', fontSize: '0.9em' }}>{order.different}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '8px', verticalAlign: 'top' }}>
                        <div>К-ть: {client.count}</div>
                        <div>Вага: {client.totalWeight.toFixed(2)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="2"><strong>Всього по менеджеру:</strong></td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>
                      <div>{managerData.totalCount} шт</div>
                      <div>{managerData.totalWeight.toFixed(2)} кг</div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}
        </div>

      </div>
    );
  }

  if (areDeliveriesVisible) {
    if (!selectedDeliveries || selectedDeliveries.length === 0) {
      return (
        <div className={css.container}>
          <p className={css.emptyMessage}>Оберіть доставку на карті або у списку</p>
        </div>
      );
    }
    if (selectedDeliveries.length > 1) {
      const totalWeight = selectedDeliveries.reduce((sum, d) => sum + (d.total_weight || 0), 0);
      const groupingByClient = {};
      selectedDeliveries.forEach(d => {
        if (!groupingByClient[d.client]) {
          groupingByClient[d.client] = { weight: 0, deliveries: [] };
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
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className={`${css.deliveryEditBtn} ${css.printBtn}`} onClick={() => { setIsPrintRequested(true); setIsEditDeliveryModalOpen(true); }}>
                <Printer size={14} /> Друк
              </button>
              {!isGuest && (
                <button className={css.deliveryEditBtn} onClick={() => setIsEditDeliveryModalOpen(true)}>Доставка</button>
              )}
            </div>
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
                      <div className={css.accordionHeader} onClick={() => toggleExpansion(d.id)}>
                        <div className={css.partyItem} style={{ opacity: 1, width: '100%', marginBottom: expandedIds.has(d.id) ? '8px' : 0 }}>
                          <span className={css.partyLabel} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {expandedIds.has(d.id) ? '▼' : '▶'} ID: {d.id} | {d.address}
                            <span className={`${css.statusBadge} ${d.status === "Створено" || d.status === "created" ? css.statusCreated : d.status === "В роботі" || d.status === "inprogress" ? css.statusInProgress : d.status === "Виконано" || d.status === "completed" ? css.statusCompleted : ""}`}>{d.status}</span>
                          </span>
                          <span className={css.partyAmount}>{d.total_weight?.toFixed(2)} кг</span>
                        </div>
                      </div>
                      {expandedIds.has(d.id) && (
                        <div className={css.accordionContent}>
                           <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                              {!isGuest && (
                                <>
                                  {d.status !== "Виконано" && (<button className={css.deliveryEditBtn} onClick={(e) => { e.stopPropagation(); setIsEditDeliveryModalOpen(true); }} style={{ fontSize: '0.8em', padding: '4px 12px' }}>Доставка</button>)}
                                  <button className={css.deliveryEditBtn} onClick={(e) => { e.stopPropagation(); handleUpdateStatus(d, d.status === "Виконано" ? "В роботі" : "Виконано"); }} style={{ fontSize: '0.8em', padding: '4px 12px', backgroundColor: d.status === "Виконано" ? '#ff9800' : '#4caf50' }}>{d.status === "Виконано" ? "В роботі" : "Виконано"}</button>
                                  {d.status !== "Виконано" && <button className={css.deliveryEditBtn} onClick={(e) => { e.stopPropagation(); setChangeDateTarget(d); setNewDate(d.delivery_date || ""); }} style={{ fontSize: '0.8em', padding: '4px 12px', backgroundColor: '#2196F3' }}>Змінити дату</button>}
                                  {d.status !== "Виконано" && <button className={css.deleteBtnSmall} onClick={(e) => { e.stopPropagation(); setDeleteConfirmTarget(d); }}>Видалити</button>}
                                </>
                              )}
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
          {deleteConfirmTarget && (
            <div className={css.confirmOverlay} onClick={() => setDeleteConfirmTarget(null)}>
              <div className={css.confirmModal} onClick={e => e.stopPropagation()}>
                <h4>Видалення доставки</h4>
                <p>Ви впевнені, що хочете видалити доставку №{deleteConfirmTarget.id}?</p>
                <div className={css.confirmActions}>
                  <button className={css.confirmCancel} onClick={() => setDeleteConfirmTarget(null)}>Скасувати</button>
                  <button className={css.deleteBtn} onClick={() => handleDeleteDelivery(deleteConfirmTarget)}>Видалити</button>
                </div>
              </div>
            </div>
          )}
          {changeDateTarget && (
            <div className={css.confirmOverlay} onClick={() => setChangeDateTarget(null)}>
              <div className={css.confirmModal} onClick={e => e.stopPropagation()}>
                <h4>Зміна дати доставки №{changeDateTarget.id}</h4>
                <p style={{ marginBottom: '10px' }}>Виберіть нову дату для доставки:</p>
                <input 
                  type="date" 
                  value={newDate} 
                  onChange={(e) => setNewDate(e.target.value)} 
                  style={{ padding: '8px', marginBottom: '15px', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <div className={css.confirmActions}>
                  <button className={css.confirmCancel} onClick={() => setChangeDateTarget(null)}>Скасувати</button>
                  <button className={css.deliveryEditBtn} onClick={() => handleChangeDeliveryDate(changeDateTarget, newDate)} style={{ backgroundColor: '#2196F3' }}>Зберегти</button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }
    const delivery = selectedDeliveries[0];
    const isCompleted = delivery.status === "Виконано";
    return (
      <div className={css.container}>
        <div className={css.deliveryHeader}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 className={css.title}>🚀 Доставка: {delivery.client}</h2>
            <span className={`${css.statusBadge} ${delivery.status === "Створено" || delivery.status === "created" ? css.statusCreated : delivery.status === "В роботі" || delivery.status === "inprogress" ? css.statusInProgress : delivery.status === "Виконано" || delivery.status === "completed" ? css.statusCompleted : ""}`}>{delivery.status}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
             <button className={`${css.deliveryEditBtn} ${css.printBtn}`} onClick={() => { setIsPrintRequested(true); setIsEditDeliveryModalOpen(true); }}>
               <Printer size={14} /> Друк
             </button>
             {!isGuest && (
               <>
                 {!isCompleted && (<button className={css.deliveryEditBtn} onClick={() => setIsEditDeliveryModalOpen(true)}>Доставка</button>)}
                 {!isCompleted && <button className={css.deliveryEditBtn} onClick={() => { setChangeDateTarget(delivery); setNewDate(delivery.delivery_date || ""); }} style={{ backgroundColor: '#2196F3' }}>Змінити дату</button>}
                 {isCompleted ? (<button className={css.deliveryEditBtn} onClick={() => handleUpdateStatus(delivery, "В роботі")} style={{ backgroundColor: '#ff9800' }}>Змінити статус на "В роботі"</button>) : (<button className={css.deliveryEditBtn} onClick={() => handleUpdateStatus(delivery, "Виконано")} style={{ backgroundColor: '#4caf50' }}>Змінити статус на "Виконано"</button>)}
                 {!isCompleted && <button className={css.deleteBtn} onClick={() => setDeleteConfirmTarget(delivery)}>Видалити</button>}
               </>
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
        {deleteConfirmTarget && (
          <div className={css.confirmOverlay} onClick={() => setDeleteConfirmTarget(null)}>
            <div className={css.confirmModal} onClick={e => e.stopPropagation()}>
              <h4>Видалення доставки</h4>
              <p>Ви впевнені, що хочете видалити доставку №{deleteConfirmTarget.id}?</p>
              <div className={css.confirmActions}>
                <button className={css.confirmCancel} onClick={() => setDeleteConfirmTarget(null)}>Скасувати</button>
                <button className={css.deleteBtn} onClick={() => handleDeleteDelivery(deleteConfirmTarget)}>Видалити</button>
              </div>
            </div>
          </div>
        )}
        {changeDateTarget && (
          <div className={css.confirmOverlay} onClick={() => setChangeDateTarget(null)}>
            <div className={css.confirmModal} onClick={e => e.stopPropagation()}>
              <h4>Зміна дати доставки №{changeDateTarget.id}</h4>
              <p style={{ marginBottom: '10px' }}>Виберіть нову дату для доставки:</p>
              <input 
                type="date" 
                value={newDate} 
                onChange={(e) => setNewDate(e.target.value)} 
                style={{ padding: '8px', marginBottom: '15px', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }}
              />
              <div className={css.confirmActions}>
                <button className={css.confirmCancel} onClick={() => setChangeDateTarget(null)}>Скасувати</button>
                <button className={css.deliveryEditBtn} onClick={() => handleChangeDeliveryDate(changeDateTarget, newDate)} style={{ backgroundColor: '#2196F3' }}>Зберегти</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (areApplicationsVisible) {
    if (selectedClient && selectedClient.orders) {} else if (selectedClient && !selectedClient.orders && areClientsVisible) {} else {
      return (
        <div className={css.container}>
          <p className={css.emptyMessage}>Оберіть клієнта на карті для перегляду заявок</p>
        </div>
      );
    }
    if (selectedClient && selectedClient.orders) {
      const groupedOrders = {};
      selectedClient.orders.forEach(order => {
        const contractNum = order.contract_supplement || 'Без номера';
        if (!groupedOrders[contractNum]) {
          groupedOrders[contractNum] = [];
        }
        groupedOrders[contractNum].push(order);
      });
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
          return dClient === sClient && ["Створено", "В роботі", "created"].includes(d.status) && d.items?.some(di => di.order_ref?.trim() === order.contract_supplement?.trim() && di.product?.trim() === currentName);
        });
      };
      return (
        <div className={css.container}>
          <h2 className={css.title}>{selectedClient.client}</h2>
          <h3>{selectedClient.orders[0].manager}</h3>
          <p className={css.subtitle}>{`${selectedClient.address.region} обл., ${selectedClient.address.area} район, ${selectedClient.address.commune} громада, ${selectedClient.address.city}`}</p>
          <p className={css.orderCount}>Всього заявок: {selectedClient.count}</p>
          <p className={css.totalWeight}>Загальна вага: {selectedClient.totalWeight?.toFixed(2) || 0} кг</p>
          <div className={css.ordersContainer}>
            {Object.entries(groupedOrders).map(([contractNum, orders]) => (
              <div key={contractNum} className={css.contractGroup}>
                <h3 className={css.contractNumber}>Договір: {contractNum}</h3>
                <ul className={css.ordersList}>
                  {orders.map((order, index) => (
                    <li key={index} className={`${css.orderItem} ${isInDelivery(order) ? css.inDeliveryRow : ""}`}>
                      <div className={css.productName}>{order.nomenclature}{isInDelivery(order) && (<span className={css.deliveryBadge}>В ДОСТАВЦІ</span>)}</div>
                      <div className={css.orderDetails}>
                        <span>Кількість: {order.different} | Вага: {order.total_weight?.toFixed(2) || 0} кг</span>
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
        {!isGuest && (
          <button className={css.editButton} onClick={() => setEditClientRequest(selectedClient)}>Редагувати</button>
        )}
      </div>
    );
  }

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
      </div>
    </div>
  );
}
