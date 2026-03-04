import React, { useState, useEffect, useMemo, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import css from "./EditDeliveryModal.module.css";
import { useApplicationsStore } from "../../store/applicationsStore";
import { getInitData } from "@/lib/getInitData";
import { getRemainsByProduct, updateDeliveryData, sendDeliveryData } from "@/lib/api";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Модальное окно для редактирования состава одной или нескольких доставок.
 * Позволяет изменять количество товаров, распределять их по партиям,
 * просматривать остатки и сохранять изменения.
 */
export default function EditDeliveryModal() {
  // --- STATE MANAGEMENT ---

  // Глобальное состояние из Zustand
  const { 
    isEditDeliveryModalOpen,    // Флаг, открыто ли модальное окно
    setIsEditDeliveryModalOpen, // Функция для управления видимостью окна
    selectedDeliveries,         // Массив выбранных на карте доставок для редактирования
    updateDeliveries,           // Функция для обновления данных о доставках в глобальном сторе
    applications,               // Список всех заявок (для поиска не добавленных товаров)
    removeDelivery              // Функция для удаления доставки из стора
  } = useApplicationsStore();
  
  const queryClient = useQueryClient();

  // Локальное состояние компонента
  const [deliveryItems, setDeliveryItems] = useState([]); // Массив всех товаров из всех выбранных доставок
  const [selectedProductId, setSelectedProductId] = useState(null); // ID/название продукта, выбранного для просмотра остатков
  const [activeItemIdx, setActiveItemIdx] = useState(null); // Индекс активной строки товара в левой таблице
  const [stockRemains, setStockRemains] = useState([]); // Остатки по выбранному товару
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // Флаг для модального окна подтверждения удаления
  const [isLoadingRemains, setIsLoadingRemains] = useState(false); // Флаг загрузки остатков
  
  // Состояние для управления процессом печати
  const [isPrintView, setIsPrintView] = useState(false); // Флаг режима предпросмотра печати
  const [printData, setPrintData] = useState(null); // Данные, подготовленные для печати
  const [isAskingDate, setIsAskingDate] = useState(false); // Флаг для модалки запроса даты печати
  const [printDeliveryDate, setPrintDeliveryDate] = useState(new Date().toISOString().split('T')[0]); // Дата для печатной формы
  
  // Состояния для новых фич: удаление с предупреждением и разделение
  const [itemToDelete, setItemToDelete] = useState(null); // Индекс удаляемого товара для модалки подтверждения
  const [selectedItemsToSplit, setSelectedItemsToSplit] = useState({}); // Хранение выбранных чекбоксов { [idx]: boolean }
  const [isSplitting, setIsSplitting] = useState(false); // Флаг загрузки при разделении доставки


  // --- REFS AND HOOKS ---

  const contentRef = useRef(null); // Ref для области, которая будет отправлена на печать
  const reactToPrintFn = useReactToPrint({ contentRef }); // Хук для печати содержимого `contentRef`

  // --- `useEffect` HOOKS ---

  // Закрытие модального окна по нажатию на 'Escape'
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

  /**
   * Инициализация состояния `deliveryItems` при открытии модального окна.
   * Собирает все товары из `selectedDeliveries`, а также ищет в `applications`
   * товары, которые относятся к клиенту, но еще не были добавлены в доставку,
   * и добавляет их с количеством 0.
   */
  useEffect(() => {
    if (isEditDeliveryModalOpen && selectedDeliveries.length > 0) {
      if (isPrintView) return; // Не выполнять, если мы в режиме печати

      const allItems = [];
      const cleanStr = (n) => (n || "").toString().trim().toLowerCase();
      const cleanName = (n) => (n || "").replace(/\s*рік\s*$/i, "").trim().toLowerCase();

      selectedDeliveries.forEach(d => {
        const sClient = cleanStr(d.client);
        
        // 2. Ищем товары в заявках этого клиента, которые еще не в доставке (и базу для веса существующих товаров)
        const clientApp = applications.find(a => cleanStr(a.client) === sClient);
        
        // 1. Берем существующие товары из доставки
        const totalDeliveryQuantity = (d.items || []).reduce((sum, item) => sum + parseFloat(item.quantity || 0), 0);
        const fallbackUnitWeight = totalDeliveryQuantity > 0 ? (parseFloat(d.total_weight) || 0) / totalDeliveryQuantity : 0;

        const deliveryItemsList = (d.items || []).map(item => {
          let unitWeight = fallbackUnitWeight;
          let ordersQ = 0;
          const cleanedItemProduct = cleanName(item.product);
          
          if (clientApp && clientApp.orders) {
             const matchedOrder = clientApp.orders.find(o => {
                const oRef = (o.contract_supplement || o.id || "").toString();
                const iRef = (item.order_ref || "").toString();
                const oName = cleanName(o.nomenclature);
                return (oRef && iRef && oRef === iRef) || (oName === cleanedItemProduct);
             });
             
             if (matchedOrder) {
                // The backend returns 'total_weight' and 'different' (quantity), but not a singular 'weight' field.
                const totalW = parseFloat(matchedOrder.total_weight) || 0;
                const diffQ = parseFloat(matchedOrder.different) || 0;
                unitWeight = parseFloat(matchedOrder.weight) || (diffQ > 0 ? totalW / diffQ : 0);
                
                ordersQ = parseFloat(matchedOrder.orders_q) || diffQ;
             }
          }

          const qty = parseFloat(item.quantity) || 0;

          return {
            ...item,
            product: (item.product || "").replace(/\s*рік\s*$/i, "").trim(),
            client: d.client,
            deliveryId: d.id,
            orderRef: item.order_ref || "",
            unit_weight: unitWeight,
            weight: unitWeight * qty,
            orders_q: ordersQ,
            parties: (item.parties || []).map(p => ({ ...p }))
          };
        });
        
        if (clientApp && clientApp.orders) {
          clientApp.orders.forEach(order => {
            const cleanedOrderProd = cleanName(order.nomenclature);
            const orderId = (order.id || "").toString();
            const orderSuppl = (order.contract_supplement || "").toString();

            // Проверяем, есть ли уже такой товар в списке
            const isIncluded = deliveryItemsList.some(di => {
              const diRef = (di.orderRef || "").toString();
              return (orderId && diRef === orderId) || 
                     (orderSuppl && diRef === orderSuppl) ||
                     cleanName(di.product) === cleanedOrderProd;
            });

            // Если не включен, добавляем его с количеством 0
            if (!isIncluded) {
              const parts = [];
              if (order.nomenclature) parts.push(order.nomenclature);
              if (order.party_sign && order.party_sign.trim() !== "") parts.push(order.party_sign.trim());
              if (order.buying_season && order.buying_season.trim() !== "") parts.push(order.buying_season.trim());
              const fullProductName = parts.join(" ").replace(/\s*рік\s*$/i, "").trim();

              const totalW = parseFloat(order.total_weight) || 0;
              const diffQ = parseFloat(order.different) || 0;
              const unitWeight = parseFloat(order.weight) || (diffQ > 0 ? totalW / diffQ : 0);
              const ordersQ = parseFloat(order.orders_q) || diffQ;

              deliveryItemsList.push({
                product: fullProductName,
                nomenclature: order.nomenclature || "",
                quantity: 0, 
                client: d.client,
                deliveryId: d.id,
                orderRef: order.contract_supplement || order.id || "",
                manager: order.manager || "",
                unit_weight: unitWeight,
                weight: 0,
                orders_q: ordersQ,
                parties: [],
                isNew: true // Флаг, что это новый, не сохраненный товар
              });
            }
          });
        }
        allItems.push(...deliveryItemsList);
      });

      // Инициализируем состояние
      setDeliveryItems(allItems);
      setSelectedProductId(null);
      setActiveItemIdx(null);
      setStockRemains([]);
      setSelectedItemsToSplit({});
    }
  }, [isEditDeliveryModalOpen, selectedDeliveries, applications, isPrintView]);

  // Сброс состояния печати при закрытии модального окна
  useEffect(() => {
    if (!isEditDeliveryModalOpen) {
      setIsPrintView(false);
      setPrintData(null);
      setIsAskingDate(false);
    }
  }, [isEditDeliveryModalOpen]);

  // Загрузка остатков по товару при выборе товара в левой таблице
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

  /**
   * Обработчик клика по строке товара в левой таблице.
   * Устанавливает активный товар для загрузки остатков.
   */
  const handleItemClick = (item, idx) => {
    const productId = item.product_id || item.product;
    setSelectedProductId(productId);
    setActiveItemIdx(idx);
  };
   
  /**
   * Добавляет партию из таблицы остатков (справа) к выбранному товару (слева).
   */
  const handleAddPartyFromRemains = (remain) => {
    if (activeItemIdx === null) {
        toast.error("Спершу оберіть товар у лівій таблиці");
        return;
    }

    const nextItems = [...deliveryItems];
    const item = { ...nextItems[activeItemIdx] };
    const parties = [...(item.parties || [])];

    // Проверка, что такая партия еще не добавлена
    const exists = parties.some(p => 
        (p.party || "").trim().toLowerCase() === (remain.nomenclature_series || "").trim().toLowerCase()
    );
    if (exists) {
      toast.error("Ця партія вже додана до цього товару");
      return;
    }

    parties.push({
      party: remain.nomenclature_series || "Без серії",
      party_quantity: "" // Инициализируем пустым значением для удобного ввода
    });

    item.parties = parties;
    nextItems[activeItemIdx] = item;
    setDeliveryItems(nextItems);
    toast.success(`Партію ${remain.nomenclature_series || ""} додано`);
  };

  /**
   * Удаляет партию у товара.
   */
  const handleDeleteParty = (itemIdx, partyIdx) => {
    const nextItems = [...deliveryItems];
    const item = { ...nextItems[itemIdx] };
    const parties = [...item.parties];
    parties.splice(partyIdx, 1);
    item.parties = parties;
    nextItems[itemIdx] = item;
    setDeliveryItems(nextItems);
  };

  /**
   * Открывает диалог удаления товара.
   */
  const handleDeleteItemClick = (itemIdx) => {
    setItemToDelete(itemIdx);
  };

  /**
   * Подтверждает удаление товара из списка доставки.
   */
  const confirmDeleteItem = () => {
    if (itemToDelete === null) return;
    const nextItems = [...deliveryItems];
    nextItems.splice(itemToDelete, 1);
    setDeliveryItems(nextItems);
    
    // Сбрасываем выбор, если удалили активный товар
    if (activeItemIdx === itemToDelete) {
      setActiveItemIdx(null);
      setSelectedProductId(null);
      setStockRemains([]);
    } else if (activeItemIdx > itemToDelete) {
      setActiveItemIdx(activeItemIdx - 1);
    }
    
    // Сбрасываем чекбоксы разделения так как индексы сместились
    setSelectedItemsToSplit({});
    setItemToDelete(null);
    toast.success("Товар видалено з форми");
  };

  /**
   * Обрабатывает изменение общего количества товара.
   */
  const handleQuantityChange = (index, newValue) => {
    const nextItems = [...deliveryItems];
    const newQty = newValue === "" ? "" : (parseFloat(newValue) || 0);
    nextItems[index].quantity = newQty;
    if (nextItems[index].unit_weight !== undefined) {
      nextItems[index].weight = (parseFloat(newQty) || 0) * nextItems[index].unit_weight;
    }
    setDeliveryItems(nextItems);
  };

  /**
   * Обрабатывает переключение чекбокса разделения товара.
   */
  const toggleItemSplitSelection = (idx) => {
    setSelectedItemsToSplit(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  /**
   * Обрабатывает изменение количества в конкретной партии.
   */
  const handlePartyQuantityChange = (itemIdx, partyIdx, newValue) => {
    const nextItems = [...deliveryItems];
    nextItems[itemIdx].parties[partyIdx].party_quantity = newValue === "" ? "" : (parseFloat(newValue) || 0);
    setDeliveryItems(nextItems);
  };

  // --- VALIDATION LOGIC ---

  /**
   * Хелпер, который проходит по всем товарам и проверяет корректность данных:
   * 1. `mismatch`: Общее количество не совпадает с суммой по партиям.
   * 2. `no_parties`: У товара с количеством > 0 не указана ни одна партия.
   * Возвращает новый массив с флагами ошибок для каждой строки.
   */
  const getItemsWithErrors = () => {
    return deliveryItems.map(item => {
      const totalQty = parseFloat(item.quantity) || 0;
      const parties = item.parties || [];
      
      const partiesSum = parties.reduce((sum, p) => {
        const qStr = (p.party_quantity !== "" && p.party_quantity !== undefined) 
          ? p.party_quantity 
          : (p.moved_q || 0);
        return sum + (parseFloat(qStr) || 0);
      }, 0);
      
      const hasMismatch = totalQty > 0 && Math.abs(totalQty - partiesSum) > 0.0001;
      const hasValidParties = parties.length > 0 && parties.some(p => p.party && p.party.trim() !== "");
      const noParties = totalQty > 0 && !hasValidParties;

      return {
        ...item,
        hasError: hasMismatch || noParties,
        errorType: noParties ? 'no_parties' : (hasMismatch ? 'mismatch' : null)
      };
    });
  };

  // Мемоизированный результат валидации, пересчитывается только при изменении `deliveryItems`
  const validatedItems = useMemo(() => getItemsWithErrors(), [deliveryItems]);

  // --- MAIN ACTION HANDLERS ---

  /**
   * Кнопка "Готово". Финальная валидация и отправка данных на сервер.
   */
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

    // Собираем обновленные данные по доставкам
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
              return { ...p, moved_q: parseFloat(qStr) || 0 };
            })
            .filter(p => p.moved_q > 0);

          return { ...item, quantity: qty, parties: parties, weight: parseFloat(item.weight) || 0 };
        });
      
      // Считаем новый общий вес для этой обновленной доставки
      const newTotalWeight = deliveryUpdatedItems.reduce((sum, item) => {
        console.log(`[Ready] Delivery ${delivery.id} | Item: ${item.product} | Qty: ${item.quantity} | UnitWeight: ${item.unit_weight} | Weight: ${item.weight}`);
        return sum + (item.weight || 0);
      }, 0);
      console.log(`[Ready] Delivery ${delivery.id} | newTotalWeight: ${newTotalWeight}`);

      return { ...delivery, status: 'В роботі', items: deliveryUpdatedItems, total_weight: newTotalWeight };
    });

    try {
        const initData = getInitData();
        // Отправляем данные по каждой доставке параллельно
        await Promise.all(updatedDeliveries.map(d => {
            const cleanItems = d.items.map(item => ({
                product: String(item.product),
                nomenclature: String(item.nomenclature || item.product),
                quantity: parseFloat(item.quantity) || 0,
                manager: String(item.manager || ""),
                client: String(item.client),
                orderRef: String(item.orderRef || item.order || item.order_ref || ""), 
                weight: parseFloat(item.weight) || 0,
                parties: item.parties.map(p => ({ party: String(p.party), moved_q: parseFloat(p.moved_q) || 0 }))
            }));
            // Передаем d.total_weight как 4-й аргумент
            return updateDeliveryData(d.id, d.status, cleanItems, d.total_weight, initData);
        }));

        updateDeliveries(updatedDeliveries); // Обновляем глобальный стор
        
        // Инвалидируем кэш, чтобы подтянуть свежие данные с бэкенда (особенно если изменился общий вес)
        queryClient.invalidateQueries({ queryKey: ["deliveries"] });

        toast.success("Доставки оновлено та переведено в роботу");
        
        // Готовим данные для печати и переходим к выбору даты
        const validDeliveries = updatedDeliveries.filter(d => 
          d.items && d.items.length > 0 && d.items.some(i => i.quantity > 0)
        ).map(d => ({
          ...d,
          items: d.items.filter(i => i.quantity > 0)
        }));
        const sorted = [...validDeliveries].sort((a, b) => (a.manager || "").localeCompare(b.manager || ""));
        setPrintData(sorted);
        setIsAskingDate(true);
    } catch (error) {
        console.error("Failed to update deliveries:", error);
        toast.error("Помилка при збереженні змін");
    }
  };

  /**
   * Кнопка "Друк". Готовит данные для печати и открывает окно выбора даты.
   */
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

  /**
   * Разделяет выбранные чекбоксом товары в новую доставку.
   */
  const handleSplitDelivery = async () => {
    const selectedIndices = Object.keys(selectedItemsToSplit).filter(k => selectedItemsToSplit[k]).map(Number);
    if (selectedIndices.length === 0) return;

    // Группируем выбранные элементы по исходным доставкам
    // (Поскольку в EditDeliveryModal могут редактироваться несколько доставок сразу, мы разделяем каждую отдельно)
    const itemsToSplitByDeliveryId = {};
    selectedIndices.forEach(idx => {
      const item = deliveryItems[idx];
      if (!itemsToSplitByDeliveryId[item.deliveryId]) {
         itemsToSplitByDeliveryId[item.deliveryId] = [];
      }
      itemsToSplitByDeliveryId[item.deliveryId].push({ item, originalIdx: idx });
    });

    setIsSplitting(true);
    let successCount = 0;

    try {
      const initData = getInitData();

      // Проходим по каждой затронутой доставке
      for (const [delivId, splitGroup] of Object.entries(itemsToSplitByDeliveryId)) {
         const originalDelivery = selectedDeliveries.find(d => String(d.id) === String(delivId));
         if (!originalDelivery) continue;

         // Подготовка Payload для клонированной доставки 
         // Используем данные из originalDelivery, но берем только выделенные товары
         const ordersMap = {};
         
         splitGroup.forEach(({ item }) => {
            const orderRefName = item.orderRef || item.order || "Без заявки";
            if (!ordersMap[orderRefName]) {
               ordersMap[orderRefName] = { order: orderRefName, items: [] };
            }

            const cleanParties = (item.parties || []).map(p => ({
               party: String(p.party),
               moved_q: parseFloat((p.party_quantity !== "" && p.party_quantity !== undefined) ? p.party_quantity : p.moved_q) || 0
            })).filter(p => p.moved_q > 0);

            const itemWeight = parseFloat(item.weight) || 0;
            const itemQuantity = parseFloat(item.quantity) || 0;
            console.log(`[Split] Item: ${item.product} | Qty: ${itemQuantity} | UnitWt: ${item.unit_weight} | Weight: ${itemWeight}`);
            
            // Рассчитываем суммарный вес. Согласно логике приложения, weight уже является 
            // общим весом для данной строки товара (без перемножения)
            
            ordersMap[orderRefName].items.push({
               product: String(item.product),
               nomenclature: String(item.nomenclature || item.product),
               quantity: itemQuantity,
               weight: itemWeight,
               parties: cleanParties
            });
         });

         // Считаем общий вес для новой доставки
         let sumWeight = 0;
         Object.values(ordersMap).forEach(order => {
            order.items.forEach(i => {
               sumWeight += i.weight; // Суммируем готовый вес всех товаров напрямую
            });
         });

         const clonePayload = {
            manager: String(originalDelivery.manager || ""),
            client: String(originalDelivery.client || ""),
            address: String(originalDelivery.address || ""),
            contact: String(originalDelivery.contact || ""),
            phone: String(originalDelivery.phone || ""),
            date: String(originalDelivery.date || originalDelivery.delivery_date || new Date().toISOString().split('T')[0]),
            comment: String(originalDelivery.comment || "") + " (Розділено)",
            is_custom_address: !!originalDelivery.is_custom_address,
            latitude: parseFloat(originalDelivery.latitude) || 0,
            longitude: parseFloat(originalDelivery.longitude) || 0,
            total_weight: sumWeight,
            orders: Object.values(ordersMap)
         };
         console.log(`[Split] Cloned Delivery total_weight: ${sumWeight}`, clonePayload);

         // Отправляем клон в базу через sendDeliveryData API
         await sendDeliveryData(clonePayload, initData);
         successCount++;
      }

      // После успешного создания клонов в БД, удаляем товары из локального состояния (формы)
      // Разделение завершено, при нажатии "Сберечь" оригинальная доставка сохранится уже без них
      const indicesToRemove = new Set(selectedIndices);
      const nextItems = deliveryItems.filter((_, idx) => !indicesToRemove.has(idx));
      
      setDeliveryItems(nextItems);
      setSelectedItemsToSplit({});
      setActiveItemIdx(null);
      setSelectedProductId(null);
      setStockRemains([]);

      // Обязательно сбрасываем кэш, чтобы новая клонированная доставка появилась на карте
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });

      toast.success(`Розділено товарів у ${successCount} доставках! Не забудьте зберегти форму.`);
    } catch (e) {
      console.error("Помилка під час розділення доставки", e);
      toast.error("Не вдалося розділити доставку. Перевірте підключення.");
    } finally {
      setIsSplitting(false);
    }
  };

  /**
   * Подтверждает и выполняет удаление всех выбранных доставок.
   */
  const confirmGlobalDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      const initData = getInitData();
      await Promise.all(selectedDeliveries.map(d => 
        import("@/lib/api").then(m => m.deleteDeliveryData(String(d.id), initData))
      ));
      
      toast.success("Доставки видалено");
      selectedDeliveries.forEach(d => removeDelivery(d.id));
      setIsEditDeliveryModalOpen(false);
    } catch (e) {
      console.error("Error deleting deliveries:", e);
      toast.error("Помилка при видаленні");
    }
  };

  /**
   * Открывает окно подтверждения удаления.
   */
  const handleGlobalDelete = async () => {
    if (selectedDeliveries.length === 0) return;
    setShowDeleteConfirm(true);
  };

  // --- RENDER LOGIC ---

  // Если модальное окно не должно быть открыто, ничего не рендерим
  if (!isEditDeliveryModalOpen) return null;

  // Модальное окно подтверждения удаления товара
  if (itemToDelete !== null) {
      const item = deliveryItems[itemToDelete];
      return (
        <div className={css.overlay} style={{ zIndex: 1100 }}>
          <div className={css.modal} style={{ height: 'auto', maxWidth: '400px', backgroundColor: '#2f3136' }}>
             <div className={css.header} style={{ backgroundColor: '#202225', borderBottom: '1px solid #4f545c' }}>
               <h2 style={{ color: '#dcddde' }}>⚠️ Підтвердження видалення</h2>
             </div>
             <div className={css.content} style={{ display: 'block', padding: '30px', textAlign: 'center', color: '#dcddde' }}>
                <p>Ви впевнені, що хочете видалити товар <strong>{item?.product}</strong> з цієї форми доставки?</p>
                <p style={{ fontSize: '0.85rem', color: '#b9bbbe', marginTop: '10px' }}>
                  Товар не буде переведено "в роботу", але заявка залишиться нерозподіленою.
                </p>
             </div>
             <div className={css.footer} style={{ backgroundColor: '#202225', borderTop: '1px solid #4f545c', padding: '15px' }}>
                <button 
                  className={`${css.button} ${css.cancelButton}`}
                  onClick={() => setItemToDelete(null)}
                  style={{ backgroundColor: '#4f545c', color: 'white' }}
                >
                  Ні, скасувати
                </button>
                <button 
                  className={css.button}
                  style={{ backgroundColor: '#ed4245', color: 'white', border: 'none' }}
                  onClick={confirmDeleteItem}
                >
                  Так, видалити
                </button>
             </div>
          </div>
        </div>
      );
  }

  // Рендеринг модального окна для выбора даты печати
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
 
  // Рендеринг вида для предпросмотра печати
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
            <div className={css.printableArea} ref={contentRef}>
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
              onClick={() => reactToPrintFn()}
            >
              🖨️ Друк
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Рендеринг основного вида редактирования
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
          {/* Левая панель: Товары в доставке */}
          <div className={css.leftPanel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
               <h3 className={css.panelTitle} style={{ marginBottom: 0 }}>📦 Товари у доставці</h3>
               <button 
                  className={css.splitButton}
                  onClick={handleSplitDelivery}
                  disabled={isSplitting || Object.values(selectedItemsToSplit).filter(Boolean).length === 0}
                  style={{
                    backgroundColor: Object.values(selectedItemsToSplit).filter(Boolean).length > 0 ? '#5865f2' : '#4f545c',
                    color: 'white',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    cursor: Object.values(selectedItemsToSplit).filter(Boolean).length > 0 ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.9rem',
                    transition: 'opacity 0.2s',
                    opacity: Object.values(selectedItemsToSplit).filter(Boolean).length > 0 ? 1 : 0.6
                  }}
                  title="Обрані товари будуть видалені з цієї форми та перенесені у нову ідентичну доставку"
               >
                  {isSplitting ? "⏳ Обробка..." : "✂️ Розділити обрані"}
               </button>
            </div>
            <div className={css.tableContainer}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }} title="Вибрати для розділення">✂️</th>
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
                        <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
                          <input 
                            type="checkbox" 
                            checked={!!selectedItemsToSplit[idx]}
                            onChange={() => toggleItemSplitSelection(idx)}
                            disabled={isSplitting}
                          />
                        </td>
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
                              handleDeleteItemClick(idx);
                            }}
                            title="Видалити товар з форми"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                      {/* Вложенная таблица для партий */}
                      {item.parties && item.parties.length > 0 && (
                        <tr>
                          <td colSpan="5" style={{ padding: '0 10px 10px 40px' }}>
                            <table className={css.nestedTable}>
                              <thead>
                                <tr>
                                  <th style={{ width: '40px' }}></th>
                                  <th style={{ fontSize: '0.8rem' }}>Партія</th>
                                  <th style={{ fontSize: '0.8rem' }}>Кількість</th>
                                  <th style={{ width: '30px' }}></th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.parties.map((p, pIdx) => (
                                  <tr key={pIdx}>
                                    <td></td>
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

          {/* Правая панель: Остатки на складе */}
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

        {/* Футер с кнопками действий */}
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
 
        {/* Скрытое окно подтверждения удаления */}
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
