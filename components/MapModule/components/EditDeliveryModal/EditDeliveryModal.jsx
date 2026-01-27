import React, { useState, useEffect, useMemo } from "react";
import css from "./EditDeliveryModal.module.css";
import { useApplicationsStore } from "../../store/applicationsStore";
import { getInitData } from "@/lib/getInitData";
import { getRemainsByProduct, updateDeliveryData } from "@/lib/api";
import toast from "react-hot-toast";

export default function EditDeliveryModal() {
  const { 
    isEditDeliveryModalOpen, 
    setIsEditDeliveryModalOpen, 
    selectedDeliveries,
    updateDeliveries,
    applications
  } = useApplicationsStore();

  const [deliveryItems, setDeliveryItems] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [activeItemIdx, setActiveItemIdx] = useState(null); 
  const [stockRemains, setStockRemains] = useState([]);
  const [isLoadingRemains, setIsLoadingRemains] = useState(false);
  const [isPrintView, setIsPrintView] = useState(false);
  const [printData, setPrintData] = useState(null);
  const [isAskingDate, setIsAskingDate] = useState(false);
  const [printDeliveryDate, setPrintDeliveryDate] = useState(new Date().toISOString().split('T')[0]);

  // Close on Escape
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

  // Initialize delivery items from selectedDeliveries
  useEffect(() => {
    if (isEditDeliveryModalOpen && selectedDeliveries.length > 0) {
      if (isPrintView) return;

      const allItems = [];
      const cleanStr = (n) => (n || "").toString().trim().toLowerCase();
      const cleanName = (n) => (n || "").replace(/\s*рік\s*$/i, "").trim().toLowerCase();

      selectedDeliveries.forEach(d => {
        const sClient = cleanStr(d.client);
        
        // 1. Existing items in this delivery
        const deliveryItemsList = (d.items || []).map(item => ({
          ...item,
          product: (item.product || "").replace(/\s*рік\s*$/i, "").trim(),
          client: d.client,
          deliveryId: d.id,
          orderRef: item.order_ref || "",
          parties: (item.parties || []).map(p => ({ ...p }))
        }));

        // 2. Add missing products from the client's original orders (applications)
        // Match client by trimmed/lowercased name
        const clientApp = applications.find(a => cleanStr(a.client) === sClient);
        
        if (clientApp && clientApp.orders) {
          clientApp.orders.forEach(order => {
            const cleanedOrderProd = cleanName(order.nomenclature);
            const orderId = (order.id || "").toString();
            const orderSuppl = (order.contract_supplement || "").toString();

            // Match by order ID, supplement or product name
            const isIncluded = deliveryItemsList.some(di => {
              const diRef = (di.orderRef || "").toString();
              return (orderId && diRef === orderId) || 
                     (orderSuppl && diRef === orderSuppl) ||
                     cleanName(di.product) === cleanedOrderProd;
            });

            if (!isIncluded) {
              // Construct full product name: nomenclature + party_sign + buying_season
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
  }, [isEditDeliveryModalOpen, selectedDeliveries, applications, isPrintView]);

  // Reset print view when modal is closed
  useEffect(() => {
    if (!isEditDeliveryModalOpen) {
      setIsPrintView(false);
      setPrintData(null);
      setIsAskingDate(false);
    }
  }, [isEditDeliveryModalOpen]);

  // Load remains when product is selected
  useEffect(() => {
    const fetchRemains = async () => {
      if (!selectedProductId) return;
      setIsLoadingRemains(true);
      try {
        const initData = getInitData();
        // Use the new endpoint that takes the product identifier (name or ID)
        const data = await getRemainsByProduct({ product: selectedProductId, initData });
        setStockRemains(data || []);
        console.log("Stock remains:", data);
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

  const handleItemClick = (item, idx) => {
    // If the item has a specific product_id, use it, otherwise use product name (fallback)
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

    // Check if already exists (case insensitive)
    const exists = parties.some(p => 
        (p.party || "").trim().toLowerCase() === (remain.nomenclature_series || "").trim().toLowerCase()
    );
    if (exists) {
      toast.error("Ця партія вже додана до цього товару");
      return;
    }

    parties.push({
      party: remain.nomenclature_series || "Без серії",
      party_quantity: "" // Initialize empty for easier typing
    });

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
    // Clear selection if deleted item was selected
    if (activeItemIdx === itemIdx) {
      setActiveItemIdx(null);
      setSelectedProductId(null);
      setStockRemains([]);
    } else if (activeItemIdx > itemIdx) {
      // Adjust active index if it was after the deleted item
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

  // Helper to validate items and highlight mismatches
  const getItemsWithErrors = () => {
    return deliveryItems.map(item => {
      const totalQty = parseFloat(item.quantity) || 0;
      const parties = item.parties || [];
      
      const partiesSum = parties.reduce((sum, p) => {
        // Correct fallback: use party_quantity if it's not an empty string, otherwise use moved_q
        const qStr = (p.party_quantity !== "" && p.party_quantity !== undefined) 
          ? p.party_quantity 
          : (p.moved_q || 0);
        return sum + (parseFloat(qStr) || 0);
      }, 0);
      
      const hasMismatch = totalQty > 0 && Math.abs(totalQty - partiesSum) > 0.0001;
      
      // noParties logic: Must have at least one party and it must have a non-empty name
      const hasValidParties = parties.length > 0 && parties.some(p => p.party && p.party.trim() !== "");
      const noParties = totalQty > 0 && !hasValidParties;

      if (totalQty > 0) {
        console.log(`Validating [${item.product}]: totalQty=${totalQty}, partiesSum=${partiesSum}, length=${parties.length}, hasMismatch=${hasMismatch}, noParties=${noParties}`, parties);
      }

      return {
        ...item,
        hasError: hasMismatch || noParties,
        errorType: noParties ? 'no_parties' : (hasMismatch ? 'mismatch' : null)
      };
    });
  };

  const validatedItems = useMemo(() => getItemsWithErrors(), [deliveryItems]);

  const handleReady = async () => {
    console.log("handleReady clicked. current validatedItems:", validatedItems);
    // Final validation
    const itemsWithErrors = validatedItems.filter(item => item.hasError);
    console.log("itemsWithErrors count:", itemsWithErrors.length, itemsWithErrors);

    if (itemsWithErrors.length > 0) {
      const mismatch = itemsWithErrors.find(i => i.errorType === 'mismatch');
      if (mismatch) {
        console.warn("Validation failed: mismatch", mismatch);
        toast.error(`Невідповідность кількості у товарі: ${mismatch.product}. Загальна кількість не збігається з сумою по партіях.`);
      } else {
        const noParties = itemsWithErrors.find(i => i.errorType === 'no_parties');
        console.warn("Validation failed: no_parties", noParties);
        toast.error(`Оберіть хоча б одну партію для товару: ${noParties.product}`);
      }
      return;
    }

    // Reconstruct deliveries with updated items and status
    const updatedDeliveries = selectedDeliveries.map(delivery => {
      const deliveryUpdatedItems = validatedItems
        .filter(item => item.deliveryId === delivery.id)
        .map(item => {
          const qty = parseFloat(item.quantity) || 0;
          let parties = (item.parties || [])
            .map(p => {
              const qStr = (p.party_quantity !== "" && p.party_quantity !== undefined)
                ? p.party_quantity
                : (p.moved_q || 0);
              return {
                ...p,
                moved_q: parseFloat(qStr) || 0
              };
            })
            .filter(p => p.moved_q > 0);

          return {
            ...item,
            quantity: qty,
            parties: parties
          };
        });
      
      return {
        ...delivery,
        status: 'В роботі',
        items: deliveryUpdatedItems
      };
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
                orderRef: String(item.orderRef || item.order || ""),
                order: String(item.orderRef || item.order || ""), 
                weight: parseFloat(item.weight) || 0,
                parties: item.parties.map(p => ({
                    party: String(p.party),
                    moved_q: parseFloat(p.moved_q) || 0
                }))
            }));

            return updateDeliveryData(d.id, d.status, cleanItems, initData);
        }));

        updateDeliveries(updatedDeliveries);
        toast.success("Доставки оновлено та переведено в роботу");
        
        const validDeliveries = updatedDeliveries.filter(d => 
          d.items && d.items.length > 0 && d.items.some(i => i.quantity > 0)
        ).map(d => ({
          ...d,
          items: d.items.filter(i => i.quantity > 0)
        }));

        const sorted = [...validDeliveries].sort((a, b) => 
          (a.manager || "").localeCompare(b.manager || "")
        );

        setPrintData(sorted);
        setIsAskingDate(true);
    } catch (error) {
        console.error("Failed to update deliveries:", error);
        toast.error("Помилка при збереженні змін");
    }
  };


  if (!isEditDeliveryModalOpen) return null;

  // 1. Date selection view
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
                 setIsAskingDate(false);
                 setIsPrintView(true);
               }}
             >
               Сформувати форму
             </button>
           </div>
         </div>
       </div>
     );
  }
 
  if (isPrintView && printData) {
    return (
      <div className={css.overlay}>
        <div className={css.modal} style={{ height: 'auto', maxHeight: '95vh' }}>
          <div className={`${css.header} ${css.noPrint}`}>
            <h2>📄 Форма для друку</h2>
            <button className={css.closeButton} onClick={() => setIsEditDeliveryModalOpen(false)}>
              &times;
            </button>
          </div>
          <div className={css.content} style={{ overflow: 'auto', display: 'block' }}>
            <div className={css.printableArea}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #333', marginBottom: '20px', paddingBottom: '10px' }}>
                <h2 style={{ margin: 0 }}>Відомість доставки</h2>
                <div style={{ fontSize: '0.9rem', marginTop: '5px' }}>Дата: {new Date().toLocaleDateString('uk-UA')}</div>
              </div>

              {printData.length > 0 ? (
                printData.map((delivery, dIdx) => (
                  <div key={dIdx} className={css.printGroup}>
                    <div className={css.printDeliveryHeader}>
                      <div><strong>Менеджер:</strong> {delivery.manager}</div>
                      <div><strong>Клієнт:</strong> {delivery.client}</div>
                      <div><strong>Дата доставки:</strong> {new Date(printDeliveryDate).toLocaleDateString('uk-UA')}</div>
                    </div>
                    <table className={css.printTable}>
                      <thead>
                        <tr>
                          <th style={{ width: '15%' }}>Заявка</th>
                          <th style={{ width: '40%' }}>Товар</th>
                          <th style={{ width: '10%', textAlign: 'center' }}>К-сть</th>
                          <th>Партії</th>
                        </tr>
                      </thead>
                      <tbody>
                        {delivery.items.map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.orderRef || item.order}</td>
                            <td style={{ fontWeight: 500 }}>{item.product}</td>
                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
                            <td style={{ fontSize: '0.85rem' }}>
                              {item.parties?.map(p => `${p.party} (${p.moved_q})`).join(", ")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '20px' }}>Немає товарів для друку</div>
              )}
            </div>
          </div>
          <div className={`${css.footer} ${css.noPrint}`}>
            <button 
              className={`${css.button} ${css.cancelButton}`}
              onClick={() => setIsEditDeliveryModalOpen(false)}
            >
              Закрити
            </button>
            <button 
              className={`${css.button} ${css.saveButton}`}
              onClick={() => window.print()}
            >
              🖨️ Друк
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                      {/* Nested parties row */}
                      {item.parties && item.parties.length > 0 && (
                        <tr>
                          <td colSpan="5" style={{ padding: '0 10px 10px 40px' }}>
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

          {/* Правая таблица: Остатки */}
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

        <div className={css.footer}>
          <button 
            className={`${css.button} ${css.cancelButton}`}
            onClick={() => setIsEditDeliveryModalOpen(false)}
          >
            Скасувати
          </button>
          <button 
            className={`${css.button} ${css.saveButton}`}
            onClick={handleReady}
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
}
