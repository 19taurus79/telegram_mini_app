import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import css from "./EditDeliveryModal.module.css";
import { useApplicationsStore } from "../../store/applicationsStore";
import { getInitData } from "@/lib/getInitData";
import { getRemainsByProduct, updateDeliveryData } from "@/lib/api";
import toast from "react-hot-toast";

/**
 * Модальное окно для редактирования состава одной или нескольких доставок.
 */
export default function EditDeliveryModal() {
  const router = useRouter(); // For navigation to print page
  // --- STATE MANAGEMENT ---
  const { 
    isEditDeliveryModalOpen,
    setIsEditDeliveryModalOpen,
    selectedDeliveries,
    updateDeliveries,
    applications,
    removeDelivery
  } = useApplicationsStore();

  // Локальное состояние компонента
  const [deliveryItems, setDeliveryItems] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [activeItemIdx, setActiveItemIdx] = useState(null);
  const [stockRemains, setStockRemains] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoadingRemains, setIsLoadingRemains] = useState(false);
  
  // Состояние для управления процессом печати
  const [printData, setPrintData] = useState(null);
  const [isAskingDate, setIsAskingDate] = useState(false);
  const [printDeliveryDate, setPrintDeliveryDate] = useState(new Date().toISOString().split('T')[0]);

  // --- `useEffect` HOOKS ---

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsEditDeliveryModalOpen(false);
      }
    };
    if (isEditDeliveryModalOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditDeliveryModalOpen, setIsEditDeliveryModalOpen]);

  useEffect(() => {
    if (isEditDeliveryModalOpen && selectedDeliveries.length > 0) {
      const allItems = [];
      const cleanStr = (n) => (n || "").toString().trim().toLowerCase();
      const cleanName = (n) => (n || "").replace(/\s*рік\s*$/i, "").trim().toLowerCase();

      selectedDeliveries.forEach(d => {
        const sClient = cleanStr(d.client);
        
        const deliveryItemsList = (d.items || []).map(item => ({
          ...item,
          product: (item.product || "").replace(/\s*рік\s*$/i, "").trim(),
          client: d.client,
          deliveryId: d.id,
          orderRef: item.order_ref || "",
          parties: (item.parties || []).map(p => ({ ...p }))
        }));

        const clientApp = applications.find(a => cleanStr(a.client) === sClient);
        
        if (clientApp && clientApp.orders) {
          clientApp.orders.forEach(order => {
            const cleanedOrderProd = cleanName(order.nomenclature);
            const orderId = (order.id || "").toString();
            const orderSuppl = (order.contract_supplement || "").toString();

            const isIncluded = deliveryItemsList.some(di => {
              const diRef = (di.orderRef || "").toString();
              return (orderId && diRef === orderId) || 
                     (orderSuppl && diRef === orderSuppl) ||
                     cleanName(di.product) === cleanedOrderProd;
            });

            if (!isIncluded) {
              const parts = [];
              if (order.nomenclature) parts.push(order.nomenclature);
              if (order.party_sign && order.party_sign.trim() !== "") parts.push(order.party_sign.trim());
              if (order.buying_season && order.buying_season.trim() !== "") parts.push(order.buying_season.trim());
              const fullProductName = parts.join(" ").replace(/\s*рік\s*$/i, "").trim();

              deliveryItemsList.push({
                product: fullProductName,
                nomenclature: order.nomenclature || "",
                quantity: 0, 
                client: d.client,
                deliveryId: d.id,
                orderRef: order.contract_supplement || order.id || "",
                manager: order.manager || "",
                parties: [],
                isNew: true
              });
            }
          });
        }
        allItems.push(...deliveryItemsList);
      });

      setDeliveryItems(allItems);
      setSelectedProductId(null);
      setActiveItemIdx(null);
      setStockRemains([]);
    }
  }, [isEditDeliveryModalOpen, selectedDeliveries, applications]);

  useEffect(() => {
    if (!isEditDeliveryModalOpen) {
      setPrintData(null);
      setIsAskingDate(false);
    }
  }, [isEditDeliveryModalOpen]);

  useEffect(() => {
    const fetchRemains = async () => {
      if (!selectedProductId) return;
      setIsLoadingRemains(true);
      try {
        const initData = getInitData();
        const data = await getRemainsByProduct({ product: selectedProductId, initData });
        setStockRemains(data || []);
      } catch (error) {
        console.error("Error fetching remains:", error);
        setStockRemains([]);
        toast.error("Не вдалося завантажити залишки");
      } finally {
        setIsLoadingRemains(false);
      }
    };

    if (selectedProductId) {
      fetchRemains();
    }
  }, [selectedProductId]);

  // --- EVENT HANDLERS ---

  const handleItemClick = (item, idx) => {
    const productId = item.product_id || item.product;
    setSelectedProductId(productId);
    setActiveItemIdx(idx);
  };
   
  const handleAddPartyFromRemains = (remain) => {
    if (activeItemIdx === null) {
        toast.error("Спершу оберіть товар у лівій таблиці");
        return;
    }
    const nextItems = [...deliveryItems];
    const item = { ...nextItems[activeItemIdx] };
    const parties = [...(item.parties || [])];
    const exists = parties.some(p => (p.party || "").trim().toLowerCase() === (remain.nomenclature_series || "").trim().toLowerCase());
    if (exists) {
      toast.error("Ця партія вже додана до цього товару");
      return;
    }
    parties.push({ party: remain.nomenclature_series || "Без серії", party_quantity: "" });
    item.parties = parties;
    nextItems[activeItemIdx] = item;
    setDeliveryItems(nextItems);
    toast.success(`Партію ${remain.nomenclature_series || ""} додано`);
  };

  const handleDeleteParty = (itemIdx, partyIdx) => {
    const nextItems = [...deliveryItems];
    const item = { ...nextItems[itemIdx] };
    const parties = [...item.parties];
    parties.splice(partyIdx, 1);
    item.parties = parties;
    nextItems[itemIdx] = item;
    setDeliveryItems(nextItems);
  };

  const handleDeleteItem = (itemIdx) => {
    const nextItems = [...deliveryItems];
    nextItems.splice(itemIdx, 1);
    setDeliveryItems(nextItems);
    if (activeItemIdx === itemIdx) {
      setActiveItemIdx(null);
      setSelectedProductId(null);
      setStockRemains([]);
    } else if (activeItemIdx > itemIdx) {
      setActiveItemIdx(activeItemIdx - 1);
    }
    toast.success("Товар видалено з доставки");
  };

  const handleQuantityChange = (index, newValue) => {
    const nextItems = [...deliveryItems];
    nextItems[index].quantity = newValue === "" ? "" : (parseFloat(newValue) || 0);
    setDeliveryItems(nextItems);
  };

  const handlePartyQuantityChange = (itemIdx, partyIdx, newValue) => {
    const nextItems = [...deliveryItems];
    nextItems[itemIdx].parties[partyIdx].party_quantity = newValue === "" ? "" : (parseFloat(newValue) || 0);
    setDeliveryItems(nextItems);
  };

  // --- VALIDATION ---
  const getItemsWithErrors = () => {
    return deliveryItems.map(item => {
      const totalQty = parseFloat(item.quantity) || 0;
      const parties = item.parties || [];
      const partiesSum = parties.reduce((sum, p) => {
        const qStr = (p.party_quantity !== "" && p.party_quantity !== undefined) ? p.party_quantity : (p.moved_q || 0);
        return sum + (parseFloat(qStr) || 0);
      }, 0);
      const hasMismatch = totalQty > 0 && Math.abs(totalQty - partiesSum) > 0.0001;
      const hasValidParties = parties.length > 0 && parties.some(p => p.party && p.party.trim() !== "");
      const noParties = totalQty > 0 && !hasValidParties;
      return { ...item, hasError: hasMismatch || noParties, errorType: noParties ? 'no_parties' : (hasMismatch ? 'mismatch' : null) };
    });
  };

  const validatedItems = useMemo(() => getItemsWithErrors(), [deliveryItems]);

  // --- ACTION HANDLERS ---
  const handleReady = async () => {
    const itemsWithErrors = validatedItems.filter(item => item.hasError);
    if (itemsWithErrors.length > 0) {
      const mismatch = itemsWithErrors.find(i => i.errorType === 'mismatch');
      if (mismatch) {
        toast.error(`Невідповідность кількості у товарі: ${mismatch.product}.`);
      } else {
        const noParties = itemsWithErrors.find(i => i.errorType === 'no_parties');
        toast.error(`Оберіть хоча б одну партію для товару: ${noParties.product}`);
      }
      return;
    }

    const updatedDeliveries = selectedDeliveries.map(delivery => {
      const deliveryUpdatedItems = validatedItems
        .filter(item => item.deliveryId === delivery.id)
        .map(item => {
          const qty = parseFloat(item.quantity) || 0;
          let parties = (item.parties || []).map(p => {
            const qStr = (p.party_quantity !== "" && p.party_quantity !== undefined) ? p.party_quantity : (p.moved_q || 0);
            return { ...p, moved_q: parseFloat(qStr) || 0 };
          }).filter(p => p.moved_q > 0);
          return { ...item, quantity: qty, parties: parties };
        });
      return { ...delivery, status: 'В роботі', items: deliveryUpdatedItems };
    });

    try {
        const initData = getInitData();
        await Promise.all(updatedDeliveries.map(d => {
            const cleanItems = d.items.map(item => ({
                product: String(item.product),
                nomenclature: String(item.nomenclature || item.product),
                quantity: parseFloat(item.quantity) || 0,
                manager: String(item.manager || ""),
                client: String(item.client),
                order_ref: String(item.orderRef || item.order || item.order_ref || ""), 
                weight: parseFloat(item.weight) || 0,
                parties: item.parties.map(p => ({ party: String(p.party), moved_q: parseFloat(p.moved_q) || 0 }))
            }));
            return updateDeliveryData(d.id, d.status, cleanItems, initData);
        }));
        updateDeliveries(updatedDeliveries);
        toast.success("Доставки оновлено та переведено в роботу");
        
        const validDeliveries = updatedDeliveries.filter(d => d.items && d.items.length > 0 && d.items.some(i => i.quantity > 0)).map(d => ({ ...d, items: d.items.filter(i => i.quantity > 0) }));
        const sorted = [...validDeliveries].sort((a, b) => (a.manager || "").localeCompare(b.manager || ""));
        setPrintData(sorted);
        setIsAskingDate(true);
    } catch (error) {
        console.error("Failed to update deliveries:", error);
        toast.error("Помилка при збереженні змін");
    }
  };

  const handlePrintPreview = () => {
    const hasItems = deliveryItems.some(i => (parseFloat(i.quantity) || 0) > 0);
    if (!hasItems) {
      toast.error("Немає товарів з кількістю більше 0 для друку");
      return;
    }
    const validDeliveries = selectedDeliveries.map(delivery => {
      const items = deliveryItems
        .filter(item => item.deliveryId === delivery.id && (parseFloat(item.quantity) || 0) > 0)
        .map(item => ({
          ...item,
          quantity: parseFloat(item.quantity) || 0,
          parties: (item.parties || []).map(p => {
             const qStr = (p.party_quantity !== "" && p.party_quantity !== undefined) ? p.party_quantity : (p.moved_q || 0);
             return { ...p, moved_q: parseFloat(qStr) || 0 };
          }).filter(p => p.moved_q > 0)
        }));
      return { ...delivery, items };
    }).filter(d => d.items.length > 0);
    const sorted = [...validDeliveries].sort((a, b) => (a.manager || "").localeCompare(b.manager || ""));
    setPrintData(sorted);
    setIsAskingDate(true);
  };

  const confirmGlobalDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      const initData = getInitData();
      await Promise.all(selectedDeliveries.map(d => import("@/lib/api").then(m => m.deleteDeliveryData(String(d.id), initData))));
      toast.success("Доставки видалено");
      selectedDeliveries.forEach(d => removeDelivery(d.id));
      setIsEditDeliveryModalOpen(false);
    } catch (e) {
      console.error("Error deleting deliveries:", e);
      toast.error("Помилка при видаленні");
    }
  };

  const handleGlobalDelete = async () => {
    if (selectedDeliveries.length === 0) return;
    setShowDeleteConfirm(true);
  };

  // --- RENDER ---
  if (!isEditDeliveryModalOpen) return null;

  // Render date selection modal
  if (isAskingDate) {
     return (
       <div className={css.overlay}>
         <div className={css.modal} style={{ height: 'auto', maxWidth: '400px' }}>
           <div className={css.header}>
             <h2>📅 Оберіть дату доставки</h2>
           </div>
           <div className={css.content} style={{ display: 'block', padding: '30px', textAlign: 'center' }}>
              <p>Оберіть дату, яка буде відображена у друкованій формі:</p>
              <input 
               type="date" 
               className={css.inputDate} 
               value={printDeliveryDate}
               onChange={(e) => setPrintDeliveryDate(e.target.value)}
               style={{ fontSize: '1.2rem', padding: '10px', width: '100%' }}
              />
           </div>
           <div className={css.footer}>
             <button className={`${css.button} ${css.cancelButton}`} onClick={() => setIsAskingDate(false)}>Назад</button>
             <button 
               className={`${css.button} ${css.saveButton}`}
               onClick={() => {
                 try {
                   const dataToStore = {
                     deliveries: printData,
                     printDate: printDeliveryDate,
                   };
                   sessionStorage.setItem('statementPrintData', JSON.stringify(dataToStore));
                   router.push('/print/statement');
                   setIsEditDeliveryModalOpen(false);
                 } catch (e) {
                   console.error("Failed to process print data:", e);
                   toast.error("Не вдалося підготувати дані для друку.");
                 }
               }}
             >
               Сформувати форму
             </button>
           </div>
         </div>
       </div>
     );
  }
 
  // Main edit view rendering
  return (
    <div className={css.overlay}>
      <div className={css.modal}>
        <div className={css.header}>
          <h2>🚀 Редактор доставки ({selectedDeliveries.length})</h2>
          <button className={css.closeButton} onClick={() => setIsEditDeliveryModalOpen(false)}>
            &times;
          </button>
        </div>
        <div className={css.content}>
          {/* Left Panel */}
          <div className={css.leftPanel}>
            <h3 className={css.panelTitle}>📦 Товари у доставці</h3>
            <div className={css.tableContainer}>
              <table>
                <thead>
                  <tr>
                    <th>№ Заявки</th>
                    <th>Клієнт</th>
                    <th>Товар</th>
                    <th>Кількість</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {validatedItems.map((item, idx) => (
                    <React.Fragment key={`${item.deliveryId}-${idx}`}>
                      <tr 
                        className={`${activeItemIdx === idx ? css.selectedRow : ""} ${item.hasError ? css.rowError : ""}`}
                        onClick={() => handleItemClick(item, idx)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>{item.orderRef}</td>
                        <td>{item.client}</td>
                        <td style={{ fontWeight: 600 }}>{item.product}</td>
                        <td>
                          <input 
                            type="number" 
                            className={`${css.inputNumber} ${item.hasError ? css.inputError : ""}`}
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(idx, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            title={item.errorType === 'mismatch' ? "Сума партій не збігається з загальною кількістю" : (item.errorType === 'no_parties' ? "Необхідно обрати партію" : "")}
                          />
                        </td>
                        <td>
                          <button
                            className={css.deleteButton}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteItem(idx);
                            }}
                            title="Видалити товар"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                      {item.parties && item.parties.length > 0 && (
                        <tr>
                          <td colSpan={5} style={{ padding: '0 10px 10px 40px' }}>
                            <table className={css.nestedTable}>
                              <thead>
                                <tr>
                                  <th style={{ fontSize: '0.8rem' }}>Партія</th>
                                  <th style={{ fontSize: '0.8rem' }}>Кількість</th>
                                  <th style={{ width: '30px' }}></th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.parties.map((p, pIdx) => (
                                  <tr key={pIdx}>
                                    <td style={{ fontSize: '0.8rem' }}>{p.party}</td>
                                    <td>
                                      <input 
                                        type="number" 
                                        className={`${css.inputNumber} ${item.hasError && item.errorType === 'mismatch' ? css.inputError : ""}`}
                                        style={{ height: '24px', fontSize: '0.8rem' }}
                                        value={p.party_quantity}
                                        onChange={(e) => handlePartyQuantityChange(idx, pIdx, e.target.value)}
                                      />
                                    </td>
                                    <td>
                                      <button 
                                        className={css.deletePartyBtn}
                                        onClick={() => handleDeleteParty(idx, pIdx)}
                                        title="Видалити партію"
                                      >
                                        ✕
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Panel */}
          <div className={css.rightPanel}>
            <h3 className={css.panelTitle}>⚖️ Залишки на складі</h3>
            <div className={css.tableContainer}>
              {isLoadingRemains ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>Завантаження...</div>
              ) : stockRemains.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Партія / Склад</th>
                      <th>Бух.</th>
                      <th>Скл.</th>
                      <th>Збер.</th>
                      <th>Вага</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockRemains.map((remain, rIdx) => (
                      <tr 
                        key={rIdx} 
                        onClick={() => handleAddPartyFromRemains(remain)}
                        style={{ cursor: 'pointer' }}
                        className={css.remainRow}
                      >
                        <td>
                          <div style={{ fontWeight: 500 }}>{remain.nomenclature_series || "Без серії"}</div>
                          <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{remain.warehouse}</div>
                        </td>
                        <td>{remain.buh}</td>
                        <td>{remain.skl}</td>
                        <td>{remain.storage}</td>
                        <td>{remain.weight}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', opacity: 0.6 }}>
                  {selectedProductId ? "Залишків не знайдено" : "Оберіть товар зліва для перегляду залишків"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={css.footer}>
          <button 
            className={`${css.button} ${css.cancelButton}`}
            onClick={() => setIsEditDeliveryModalOpen(false)}
          >
            Скасувати
          </button>
          {selectedDeliveries.every(d => d.status !== "Виконано") && (
            <button 
              className={`${css.button} ${css.deleteDeliveryBtn}`}
              onClick={handleGlobalDelete}
            >
              Видалити доставку
            </button>
          )}
          <button 
            className={`${css.button} ${css.saveButton}`}
            onClick={handleReady}
          >
            Готово
          </button>
          <button 
            className={`${css.button} ${css.printButton}`}
            onClick={handlePrintPreview}
          >
            🖨️ Друк
          </button>
        </div>
 
        {/* Delete Confirm Modal */}
        {showDeleteConfirm && (
          <div className={css.confirmOverlay} onClick={() => setShowDeleteConfirm(false)}>
            <div className={css.confirmModal} onClick={e => e.stopPropagation()}>
              <h3>Видалення доставки</h3>
              <p>Ви впевнені, що хочете видалити {selectedDeliveries.length > 1 ? 'ці доставки' : 'цю доставку'} ({selectedDeliveries.map(d => d.id).join(", ")})?</p>
              <div className={css.confirmActions}>
                <button className={css.confirmCancel} onClick={() => setShowDeleteConfirm(false)}>Скасувати</button>
                <button className={css.confirmDeleteBtn} onClick={confirmGlobalDelete}>Видалити</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
