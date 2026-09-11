import React, { useState, useEffect, useMemo, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { useRouter } from "next/navigation";
import css from "./EditDeliveryModal.module.css";
import { useApplicationsStore } from "../../store/applicationsStore";
import { getInitData } from "@/lib/getInitData";
import { getRemainsByProduct, updateDeliveryData, sendDeliveryData } from "@/lib/api";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import DetailsOrdersByProduct from "@/components/DetailsOrdersByProduct/DetailsOrdersByProduct";
import { useUser } from "@/store/User";
import { formatQuantity } from "@/lib/utils/productUtils";
import SendAccountantDialog from "../SendAccountantDialog/SendAccountantDialog";
import { useOrderCart } from "@/store/OrderCart";
import {
  ArrowLeft,
  Check,
  Printer,
  Send,
  Truck,
  Scissors,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Package,
  Scale,
  X,
  Plus,
  Minus,
  ShoppingCart,
  Zap,
  PlusCircle,
  Boxes,
  FileText,
  BarChart3,
  Maximize2,
  Copy,
  Info
} from "lucide-react";

/**
 * EditDeliveryModal — Полноэкранный логистический воркспейс для комплектации и редактирования доставки.
 * Интегрирован прямо в интерфейс карты: занимает 100% экрана без модальных рамок,
 * мгновенно возвращает пользователя на карту без перезагрузки и сброса координат.
 */
export default function EditDeliveryModal() {
  const router = useRouter();

  // Глобальное состояние Zustand
  const {
    isEditDeliveryModalOpen,
    setIsEditDeliveryModalOpen,
    selectedDeliveries,
    updateDeliveries,
    applications,
    removeDelivery
  } = useApplicationsStore();

  const queryClient = useQueryClient();
  const userData = useUser(state => state.userData);
  const actorName = userData?.full_name_for_orders || "";

  // Локальное состояние компонента
  const [deliveryItems, setDeliveryItems] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [activeItemIdx, setActiveItemIdx] = useState(null);
  const [stockRemains, setStockRemains] = useState([]);
  const [productBuhMap, setProductBuhMap] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoadingRemains, setIsLoadingRemains] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState("stock"); // 'stock' | 'analytics'
  const [expandedRows, setExpandedRows] = useState({}); // { [idx]: boolean }
  const [focusedPane, setFocusedPane] = useState("left"); // 'left' | 'right'

  // Печать
  const [isPrintView, setIsPrintView] = useState(false);
  const [printData, setPrintData] = useState(null);
  const [isAskingDate, setIsAskingDate] = useState(false);
  const [printDeliveryDate, setPrintDeliveryDate] = useState(new Date().toISOString().split("T")[0]);

  // Разделение и удаление
  const [itemToDelete, setItemToDelete] = useState(null);
  const [selectedItemsToSplit, setSelectedItemsToSplit] = useState({});
  const [splitQuantities, setSplitQuantities] = useState({});
  const [isSplitting, setIsSplitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPartiesWarning, setShowPartiesWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [isAccountantDialogOpen, setIsAccountantDialogOpen] = useState(false);

  const contentRef = useRef(null);
  const reactToPrintFn = useReactToPrint({ contentRef });

  // Закрытие по Escape
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

  // Инициализация позиций доставки при открытии
  useEffect(() => {
    if (isEditDeliveryModalOpen && selectedDeliveries.length > 0) {
      if (isPrintView) return;

      const allItems = [];
      const cleanStr = (n) => (n || "").toString().trim().toLowerCase();
      const cleanName = (n) => (n || "").replace(/\s*рік\s*$/i, "").trim().toLowerCase();

      selectedDeliveries.forEach(d => {
        const sClient = cleanStr(d.client);
        const clientApp = applications.find(a => cleanStr(a.client) === sClient);

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
            const orderProductClean = cleanName(order.nomenclature);
            const orderRef = (order.contract_supplement || order.id || "").toString();

            const isAlreadyInDelivery = deliveryItemsList.some(item => {
              const itemProductClean = cleanName(item.product);
              const itemRef = (item.orderRef || "").toString();
              return (orderRef && itemRef && orderRef === itemRef) || (itemProductClean === orderProductClean);
            });

            if (!isAlreadyInDelivery) {
              const totalW = parseFloat(order.total_weight) || 0;
              const diffQ = parseFloat(order.different) || 0;
              const uWeight = parseFloat(order.weight) || (diffQ > 0 ? totalW / diffQ : 0);
              const ordersQ = parseFloat(order.orders_q) || diffQ;

              deliveryItemsList.push({
                product: (order.nomenclature || "").replace(/\s*рік\s*$/i, "").trim(),
                quantity: 0,
                client: d.client,
                deliveryId: d.id,
                orderRef: orderRef,
                unit_weight: uWeight,
                weight: 0,
                orders_q: ordersQ,
                parties: [],
                isNew: true,
                manager: order.manager || d.manager || "",
                line_of_business: order.line_of_business || "ЗЗР"
              });
            }
          });
        }

        allItems.push(...deliveryItemsList);
      });

      setDeliveryItems(allItems);

      // Автовыбор первой позиции
      if (allItems.length > 0) {
        const firstActiveIdx = allItems.findIndex(i => (parseFloat(i.quantity) || 0) > 0);
        const idxToSelect = firstActiveIdx >= 0 ? firstActiveIdx : 0;
        setActiveItemIdx(idxToSelect);
        setSelectedProductId(allItems[idxToSelect].product_id || allItems[idxToSelect].product);
        setExpandedRows({ [idxToSelect]: true });
      } else {
        setActiveItemIdx(null);
        setSelectedProductId(null);
      }

      setStockRemains([]);
      setSelectedItemsToSplit({});
      setSplitQuantities({});
    }
  }, [isEditDeliveryModalOpen, selectedDeliveries, applications, isPrintView]);

  // Сброс режима печати при закрытии
  useEffect(() => {
    if (!isEditDeliveryModalOpen) {
      setIsPrintView(false);
      setPrintData(null);
      setIsAskingDate(false);
    }
  }, [isEditDeliveryModalOpen]);

  // Предварительная загрузка остатков для всех уникальных товаров
  useEffect(() => {
    if (!isEditDeliveryModalOpen || !deliveryItems.length) return;

    const uniqueProducts = Array.from(new Set(
      deliveryItems
        .filter(item => (parseFloat(item.quantity) || 0) > 0)
        .map(item => item.product_id || item.product)
        .filter(Boolean)
    ));

    const initData = getInitData();

    uniqueProducts.forEach(async (prod) => {
      setProductBuhMap(prev => {
        if (prev[prod] && !prev[prod].loading) return prev;
        return { ...prev, [prod]: { ...(prev[prod] || {}), loading: true } };
      });

      try {
        const data = await getRemainsByProduct({ product: prod, initData });
        const totalBuh = (data || []).reduce((sum, r) => sum + (parseFloat(r.buh) || 0), 0);
        setProductBuhMap(prev => ({
          ...prev,
          [prod]: { totalBuh, remains: data || [], loading: false }
        }));
      } catch (e) {
        console.error(`Failed to fetch remains for ${prod}:`, e);
        setProductBuhMap(prev => ({
          ...prev,
          [prod]: { totalBuh: 0, remains: [], loading: false }
        }));
      }
    });
  }, [isEditDeliveryModalOpen, deliveryItems]);

  // Загрузка остатков для выбранного товара
  useEffect(() => {
    if (!selectedProductId) return;

    if (productBuhMap[selectedProductId]?.remains) {
      setStockRemains(productBuhMap[selectedProductId].remains);
      return;
    }

    const fetchRemains = async () => {
      setIsLoadingRemains(true);
      try {
        const initData = getInitData();
        const data = await getRemainsByProduct({ product: selectedProductId, initData });
        setStockRemains(data || []);
        const totalBuh = (data || []).reduce((sum, r) => sum + (parseFloat(r.buh) || 0), 0);
        setProductBuhMap(prev => ({
          ...prev,
          [selectedProductId]: { totalBuh, remains: data || [], loading: false }
        }));
      } catch (error) {
        console.error("Error fetching remains:", error);
        setStockRemains([]);
        toast.error("Не вдалося завантажити залишки");
      } finally {
        setIsLoadingRemains(false);
      }
    };

    fetchRemains();
  }, [selectedProductId, productBuhMap]);

  // Хелпер остатка по бухучету
  const getItemBuhInfo = (item) => {
    const prodKey = item.product_id || item.product;
    const buhInfo = productBuhMap[prodKey];
    const totalBuh = buhInfo ? buhInfo.totalBuh : 0;
    const isLoading = buhInfo ? buhInfo.loading : true;
    const qty = parseFloat(item.quantity) || 0;
    const deficitBuh = Math.max(0, qty - totalBuh);
    const hasDeficit = !isLoading && qty > 0 && totalBuh < qty;
    return { totalBuh, deficitBuh, hasDeficit, isLoading };
  };

  // Товары с дефицитом
  const deficitItems = useMemo(() => {
    return deliveryItems
      .map((item, idx) => ({ item, idx, ...getItemBuhInfo(item) }))
      .filter(({ item, hasDeficit }) => (parseFloat(item.quantity) || 0) > 0 && hasDeficit);
  }, [deliveryItems, productBuhMap]);

  // Выбранные чекбоксами индексы
  const selectedIndices = useMemo(() => {
    return Object.entries(selectedItemsToSplit)
      .filter(([_, val]) => Boolean(val))
      .map(([idx]) => parseInt(idx, 10));
  }, [selectedItemsToSplit]);

  // Валидация товаров
  const validatedItems = useMemo(() => {
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
        partiesSum,
        hasError: hasMismatch || noParties,
        errorType: noParties ? "no_parties" : (hasMismatch ? "mismatch" : null)
      };
    });
  }, [deliveryItems]);

  // Суммарный вес доставки
  const totalWeightSummary = useMemo(() => {
    const total = validatedItems
      .filter(i => (parseFloat(i.quantity) || 0) > 0)
      .reduce((sum, i) => sum + (parseFloat(i.weight) || 0), 0);
    return Math.round(total * 100) / 100;
  }, [validatedItems]);

  // Карта складских остатков по сериям
  const partyStockMap = useMemo(() => {
    const map = {};
    stockRemains.forEach(r => {
      const key = (r.nomenclature_series || "").trim().toLowerCase();
      if (!key) return;
      if (!map[key]) map[key] = { totalBuh: 0, totalSkl: 0, totalStorage: 0 };
      map[key].totalBuh += parseFloat(r.buh) || 0;
      map[key].totalSkl += parseFloat(r.skl) || 0;
      map[key].totalStorage += parseFloat(r.storage) || 0;
    });
    return map;
  }, [stockRemains]);

  const getPartyStockStatus = (partyName, partyQty) => {
    if (!stockRemains.length) return "unknown";
    const key = (partyName || "").trim().toLowerCase();
    const stock = partyStockMap[key];
    if (!stock) return "missing";
    const qty = parseFloat(partyQty) || 0;
    if (qty <= 0) return "unknown";

    const realBuh = stock.totalBuh;
    const realSkl = stock.totalSkl - stock.totalStorage;

    return (realBuh >= qty && realSkl >= qty) ? "ok" : "low";
  };

  // Переход в BI
  const handleOrderToBi = (itemsToProcess, label = "товарів") => {
    if (!itemsToProcess || itemsToProcess.length === 0) {
      toast.error("Немає товарів для замовлення");
      return;
    }

    const { setItems, selectedItems: existingCart } = useOrderCart.getState();
    const newCartItems = [...existingCart];

    itemsToProcess.forEach(({ item, idx }) => {
      const prodKey = item.product_id || item.product;
      const buh = productBuhMap[prodKey]?.totalBuh || 0;
      const cleanProductName = (item.product || "").replace(/\s*рік\s*$/i, "").trim();
      const orderRef = (item.orderRef || item.order_ref || "").trim();
      const client = (item.client || "").trim();
      const id = `delivery_${item.deliveryId || "del"}_${orderRef}_${cleanProductName}_${idx}`.trim();

      const existingIdx = newCartItems.findIndex(ci => ci.id === id || (orderRef && ci.contract_supplement === orderRef && ci.product === cleanProductName));

      const cartItemObj = {
        id,
        product: cleanProductName,
        nomenclature: item.nomenclature || cleanProductName,
        party_sign: "",
        buying_season: "",
        different: parseFloat(item.quantity) || 0,
        orders_q: item.orders_q || (parseFloat(item.quantity) || 0),
        client: client,
        contract_supplement: orderRef,
        manager: item.manager || "",
        buh: buh,
        skl: 0,
        qok: "",
        line_of_business: item.line_of_business || "ЗЗР",
      };

      if (existingIdx >= 0) {
        newCartItems[existingIdx] = cartItemObj;
      } else {
        newCartItems.push(cartItemObj);
      }
    });

    setItems(newCartItems);
    toast.success(`Завантажено ${itemsToProcess.length} ${label} у вкладку Замовити!`);
    setIsEditDeliveryModalOpen(false);
    router.push("/bi?showSelected=true");
  };

  // Клик по строке товара
  const handleItemClick = (item, idx) => {
    const productId = item.product_id || item.product;
    setSelectedProductId(productId);
    setActiveItemIdx(idx);
    setExpandedRows(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Добавить партию из правой панели
  const handleAddPartyFromRemains = (remainOrName) => {
    if (activeItemIdx === null) {
      toast.error("Спершу оберіть товар у лівій таблиці");
      return;
    }

    const partyName = typeof remainOrName === "string"
      ? remainOrName
      : (remainOrName.nomenclature_series || "Без серії");

    const nextItems = [...deliveryItems];
    const item = { ...nextItems[activeItemIdx] };
    const parties = [...(item.parties || [])];

    const exists = parties.some(p =>
      (p.party || "").trim().toLowerCase() === partyName.trim().toLowerCase()
    );
    if (exists) {
      toast.error("Ця партія вже додана до цього товару");
      return;
    }

    // Вычисляем сколько еще не распределено по партиям
    const totalQty = parseFloat(item.quantity) || 0;
    const currentPartiesSum = parties.reduce((sum, p) => {
      const qStr = (p.party_quantity !== "" && p.party_quantity !== undefined) ? p.party_quantity : (p.moved_q || 0);
      return sum + (parseFloat(qStr) || 0);
    }, 0);
    const unallocated = Math.max(0, Math.round((totalQty - currentPartiesSum) * 1000) / 1000);

    parties.push({
      party: partyName,
      party_quantity: unallocated > 0 ? unallocated : ""
    });

    item.parties = parties;
    nextItems[activeItemIdx] = item;
    setDeliveryItems(nextItems);
    setExpandedRows(prev => ({ ...prev, [activeItemIdx]: true }));
    toast.success(`Партію ${partyName} додано`);
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

  const handleDeleteItemClick = (itemIdx) => {
    setItemToDelete(itemIdx);
  };

  const confirmDeleteItem = () => {
    if (itemToDelete === null) return;
    const nextItems = [...deliveryItems];
    nextItems.splice(itemToDelete, 1);
    setDeliveryItems(nextItems);

    if (activeItemIdx === itemToDelete) {
      setActiveItemIdx(null);
      setSelectedProductId(null);
      setStockRemains([]);
    } else if (activeItemIdx > itemToDelete) {
      setActiveItemIdx(activeItemIdx - 1);
    }

    setSelectedItemsToSplit({});
    setSplitQuantities({});
    setItemToDelete(null);
    toast.success("Товар видалено з форми");
  };

  const handleQuantityChange = (index, newValue) => {
    const nextItems = [...deliveryItems];
    const newQty = newValue === "" ? "" : (parseFloat(newValue) || 0);
    nextItems[index].quantity = newQty;
    if (nextItems[index].unit_weight !== undefined) {
      nextItems[index].weight = (parseFloat(newQty) || 0) * nextItems[index].unit_weight;
    }
    setDeliveryItems(nextItems);
  };

  const toggleItemSplitSelection = (idx) => {
    const isCurrentlyChecked = !!selectedItemsToSplit[idx];
    setSelectedItemsToSplit(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
    if (!isCurrentlyChecked) {
      const item = deliveryItems[idx];
      setSplitQuantities(prev => ({
        ...prev,
        [idx]: parseFloat(item.quantity) || 0
      }));
    } else {
      setSplitQuantities(prev => {
        const next = { ...prev };
        delete next[idx];
        return next;
      });
    }
  };

  const handleSplitQuantityChange = (idx, newValue) => {
    const item = deliveryItems[idx];
    const maxQty = parseFloat(item.quantity) || 0;
    let val = parseFloat(newValue) || 0;
    if (val < 0) val = 0;
    if (val > maxQty) val = maxQty;
    setSplitQuantities(prev => ({
      ...prev,
      [idx]: val
    }));
  };

  const handlePartyQuantityChange = (itemIdx, partyIdx, newValue) => {
    const nextItems = [...deliveryItems];
    nextItems[itemIdx].parties[partyIdx].party_quantity = newValue === "" ? "" : (parseFloat(newValue) || 0);
    setDeliveryItems(nextItems);
  };

  const handleStepPartyQty = (itemIdx, partyIdx, delta) => {
    const nextItems = [...deliveryItems];
    const party = nextItems[itemIdx].parties[partyIdx];
    const current = parseFloat(party.party_quantity !== "" && party.party_quantity !== undefined ? party.party_quantity : party.moved_q) || 0;
    const nextVal = Math.max(0, Math.round((current + delta) * 1000) / 1000);
    party.party_quantity = nextVal;
    setDeliveryItems(nextItems);
  };

  // Подготовка отправки на сервер
  const buildCleanItems = (items) =>
    items
      .filter(item => (parseFloat(item.quantity) || 0) > 0)
      .map(item => {
        const qty = parseFloat(item.quantity) || 0;
        const parties = (item.parties || [])
          .map(p => {
            const qStr = (p.party_quantity !== "" && p.party_quantity !== undefined)
              ? p.party_quantity
              : (p.moved_q || 0);
            return { ...p, moved_q: parseFloat(qStr) || 0 };
          })
          .filter(p => p.moved_q > 0);
        return {
          product: String(item.product),
          nomenclature: String(item.nomenclature || item.product),
          quantity: qty,
          manager: String(item.manager || ""),
          client: String(item.client),
          orderRef: String(item.orderRef || item.order || item.order_ref || ""),
          weight: parseFloat(item.weight) || 0,
          parties: parties.map(p => ({ party: String(p.party), moved_q: parseFloat(p.moved_q) || 0 })),
          line_of_business: item.line_of_business ? String(item.line_of_business) : undefined
        };
      });

  const executeReady = async () => {
    setIsSaving(true);
    const updatedDeliveries = selectedDeliveries.map(delivery => {
      const deliveryUpdatedItems = validatedItems
        .filter(item => item.deliveryId === delivery.id && (parseFloat(item.quantity) || 0) > 0)
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

      const newTotalWeight = deliveryUpdatedItems.reduce((sum, item) => sum + (item.weight || 0), 0);
      return { ...delivery, status: "В роботі", items: deliveryUpdatedItems, total_weight: newTotalWeight };
    });

    try {
      const initData = getInitData();
      await Promise.all(updatedDeliveries.map(async (d) => {
        const cleanItems = buildCleanItems(d.items);
        const res = await updateDeliveryData(d.id, d.status, cleanItems, d.total_weight, initData, actorName);
        if (res && res.warnings && res.warnings.length > 0) {
          res.warnings.forEach(warn => toast(warn, { icon: "⚠️", duration: 6000 }));
        }
        return res;
      }));

      updateDeliveries(updatedDeliveries);
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      toast.success("Доставки оновлено та переведено в роботу");

      const validDeliveries = updatedDeliveries.filter(d =>
        d.items && d.items.length > 0 && d.items.some(i => i.quantity > 0)
      ).map(d => ({ ...d, items: d.items.filter(i => i.quantity > 0) }));

      const groupedByClient = validDeliveries.reduce((acc, delivery) => {
        const client = delivery.client || "Невідомий клієнт";
        if (!acc[client]) {
          acc[client] = { client, manager: delivery.manager || "", items: [], comments: [] };
        }
        acc[client].items.push(...delivery.items);
        if (delivery.comment && !acc[client].comments.includes(delivery.comment)) {
          acc[client].comments.push(delivery.comment);
        }
        return acc;
      }, {});

      const sorted = Object.values(groupedByClient)
        .map(group => ({ ...group, comment: group.comments.join(" | ") }))
        .sort((a, b) => (a.manager || "").localeCompare(b.manager || ""));
      setPrintData(sorted);
      setIsAskingDate(true);
    } catch (error) {
      console.error("Failed to update deliveries:", error);
      toast.error("Помилка при збереженні змін");
    } finally {
      setIsSaving(false);
    }
  };

  const executeCODelivery = async () => {
    setIsSaving(true);
    const updatedDeliveries = selectedDeliveries.map(delivery => {
      const deliveryUpdatedItems = validatedItems
        .filter(item => item.deliveryId === delivery.id && (parseFloat(item.quantity) || 0) > 0)
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
      const newTotalWeight = deliveryUpdatedItems.reduce((sum, item) => sum + (item.weight || 0), 0);
      return { ...delivery, status: "Доставка з ЦО на клієнта", items: deliveryUpdatedItems, total_weight: newTotalWeight };
    });

    try {
      const initData = getInitData();
      await Promise.all(updatedDeliveries.map(async (d) => {
        const cleanItems = buildCleanItems(d.items);
        const res = await updateDeliveryData(d.id, d.status, cleanItems, d.total_weight, initData, actorName);
        if (res && res.warnings && res.warnings.length > 0) {
          res.warnings.forEach(warn => toast(warn, { icon: "⚠️", duration: 6000 }));
        }
        return res;
      }));
      updateDeliveries(updatedDeliveries);
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      toast.success("Оформлено доставку з ЦО напряму клієнту");
      setIsEditDeliveryModalOpen(false);
    } catch (error) {
      console.error("Failed to update CO delivery:", error);
      toast.error("Помилка при збереженні змін");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReady = async () => {
    const itemsWithErrors = validatedItems.filter(item => item.hasError && (parseFloat(item.quantity) || 0) > 0);
    const mismatch = itemsWithErrors.find(i => i.errorType === "mismatch");
    if (mismatch) {
      toast.error(`Невідповідність кількості у товарі: ${mismatch.product}.`);
      return;
    }
    const noPartiesItems = itemsWithErrors.filter(i => i.errorType === "no_parties");
    if (noPartiesItems.length > 0) {
      setPendingAction("ready");
      setShowPartiesWarning(true);
      return;
    }
    await executeReady();
  };

  const handleCODelivery = async () => {
    const itemsWithErrors = validatedItems.filter(item => item.hasError && (parseFloat(item.quantity) || 0) > 0);
    const mismatch = itemsWithErrors.find(i => i.errorType === "mismatch");
    if (mismatch) {
      toast.error(`Невідповідність кількості у товарі: ${mismatch.product}.`);
      return;
    }
    const noPartiesItems = itemsWithErrors.filter(i => i.errorType === "no_parties");
    if (noPartiesItems.length > 0) {
      setPendingAction("co");
      setShowPartiesWarning(true);
      return;
    }
    await executeCODelivery();
  };

  const handlePartiesWarningContinue = async () => {
    setShowPartiesWarning(false);
    if (pendingAction === "ready") {
      await executeReady();
    } else if (pendingAction === "co") {
      await executeCODelivery();
    }
    setPendingAction(null);
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

    const groupedByClient = validDeliveries.reduce((acc, delivery) => {
      const client = delivery.client || "Невідомий клієнт";
      if (!acc[client]) {
        acc[client] = { client, manager: delivery.manager || "", items: [], comments: [] };
      }
      acc[client].items.push(...delivery.items);
      if (delivery.comment && !acc[client].comments.includes(delivery.comment)) {
        acc[client].comments.push(delivery.comment);
      }
      return acc;
    }, {});

    const sorted = Object.values(groupedByClient)
      .map(group => ({ ...group, comment: group.comments.join(" | ") }))
      .sort((a, b) => (a.manager || "").localeCompare(b.manager || ""));
    setPrintData(sorted);
    setIsAskingDate(true);
  };

  const handleSplitDelivery = async () => {
    const selectedIndices = Object.keys(selectedItemsToSplit).filter(k => selectedItemsToSplit[k]).map(Number);
    if (selectedIndices.length === 0) return;

    const itemsToSplitByDeliveryId = {};
    selectedIndices.forEach(idx => {
      const item = deliveryItems[idx];
      if (item.isNew) return;
      if (!itemsToSplitByDeliveryId[item.deliveryId]) {
        itemsToSplitByDeliveryId[item.deliveryId] = [];
      }
      itemsToSplitByDeliveryId[item.deliveryId].push({ item, originalIdx: idx });
    });

    if (Object.keys(itemsToSplitByDeliveryId).length === 0) return;

    setIsSplitting(true);
    let successCount = 0;

    try {
      const initData = getInitData();
      let nextItems = [...deliveryItems];

      for (const [delivId, splitGroup] of Object.entries(itemsToSplitByDeliveryId)) {
        const originalDelivery = selectedDeliveries.find(d => String(d.id) === String(delivId));
        if (!originalDelivery) continue;

        const ordersMap = {};

        splitGroup.forEach(({ item, originalIdx }) => {
          const transferQty = parseFloat(splitQuantities[originalIdx]) || parseFloat(item.quantity) || 0;
          const totalQty = parseFloat(item.quantity) || 0;
          const unitWeight = parseFloat(item.unit_weight) || (totalQty > 0 ? (parseFloat(item.weight) || 0) / totalQty : 0);
          const transferWeight = unitWeight * transferQty;
          const orderRefName = item.orderRef || item.order || "Без заявки";

          if (!ordersMap[orderRefName]) {
            ordersMap[orderRefName] = { order: orderRefName, items: [] };
          }

          const partiesSum = (item.parties || []).reduce((s, p) => {
            const q = parseFloat((p.party_quantity !== "" && p.party_quantity !== undefined) ? p.party_quantity : p.moved_q) || 0;
            return s + q;
          }, 0);

          const scaleClone = partiesSum > 0 ? transferQty / partiesSum : 1;
          const cleanParties = (item.parties || []).map(p => {
            const q = parseFloat((p.party_quantity !== "" && p.party_quantity !== undefined) ? p.party_quantity : p.moved_q) || 0;
            return { party: String(p.party), moved_q: Math.round(q * scaleClone * 1000) / 1000 };
          }).filter(p => p.moved_q > 0);

          ordersMap[orderRefName].items.push({
            product: String(item.product),
            nomenclature: String(item.nomenclature || item.product),
            quantity: transferQty,
            weight: transferWeight,
            parties: cleanParties,
            line_of_business: item.line_of_business ? String(item.line_of_business) : undefined
          });

          const remainQty = totalQty - transferQty;
          const scaleRemain = partiesSum > 0 ? remainQty / partiesSum : 1;
          const remainParties = (item.parties || []).map(p => {
            const q = parseFloat((p.party_quantity !== "" && p.party_quantity !== undefined) ? p.party_quantity : p.moved_q) || 0;
            const newQ = Math.round(q * scaleRemain * 1000) / 1000;
            return { ...p, party_quantity: newQ, moved_q: newQ };
          }).filter(p => p.moved_q > 0);

          if (remainQty <= 0.0001) {
            nextItems[originalIdx] = null;
          } else {
            nextItems[originalIdx] = {
              ...nextItems[originalIdx],
              quantity: Math.round(remainQty * 1000) / 1000,
              weight: unitWeight * remainQty,
              parties: remainParties
            };
          }
        });

        let sumWeight = 0;
        Object.values(ordersMap).forEach(order => order.items.forEach(i => { sumWeight += i.weight; }));

        const clonePayload = {
          manager: String(originalDelivery.manager || ""),
          client: String(originalDelivery.client || ""),
          address: String(originalDelivery.address || ""),
          contact: String(originalDelivery.contact || ""),
          phone: String(originalDelivery.phone || ""),
          date: String(originalDelivery.date || originalDelivery.delivery_date || new Date().toISOString().split("T")[0]),
          comment: String(originalDelivery.comment || "") + " (Розділено)",
          is_custom_address: !!originalDelivery.is_custom_address,
          latitude: parseFloat(originalDelivery.latitude) || 0,
          longitude: parseFloat(originalDelivery.longitude) || 0,
          total_weight: sumWeight,
          orders: Object.values(ordersMap),
          override_created_by: originalDelivery.created_by || null,
          actor_name: actorName,
          status: originalDelivery.status || "Створено"
        };

        const res = await sendDeliveryData(clonePayload, initData);
        if (res && res.warnings && res.warnings.length > 0) {
          res.warnings.forEach(warn => toast(warn, { icon: "⚠️", duration: 6000 }));
        }

        const updatedOriginalItems = nextItems
          .filter(it => it !== null && it.deliveryId === String(delivId) && (parseFloat(it.quantity) || 0) > 0)
          .map(it => ({
            product: String(it.product),
            nomenclature: String(it.nomenclature || it.product),
            quantity: parseFloat(it.quantity) || 0,
            manager: String(it.manager || ""),
            client: String(it.client),
            orderRef: String(it.orderRef || it.order || it.order_ref || ""),
            weight: parseFloat(it.weight) || 0,
            parties: (it.parties || []).map(p => {
              const q = parseFloat((p.party_quantity !== "" && p.party_quantity !== undefined) ? p.party_quantity : p.moved_q) || 0;
              return { party: String(p.party), moved_q: q };
            }).filter(p => p.moved_q > 0),
            line_of_business: it.line_of_business ? String(it.line_of_business) : undefined
          }));

        const newOriginalWeight = updatedOriginalItems.reduce((s, it) => s + (it.weight || 0), 0);
        await updateDeliveryData(delivId, originalDelivery.status || "В роботі", updatedOriginalItems, newOriginalWeight, initData, actorName);
        successCount++;
      }

      const finalItems = nextItems.filter(it => it !== null);
      setDeliveryItems(finalItems);
      setSelectedItemsToSplit({});
      setSplitQuantities({});
      setActiveItemIdx(null);
      setSelectedProductId(null);
      setStockRemains([]);

      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      toast.success(`Розділено! ${successCount} доставок оновлено.`);
    } catch (e) {
      console.error("Помилка під час розділення доставки", e);
      toast.error("Не вдалося розділити доставку. Перевірте підключення.");
    } finally {
      setIsSplitting(false);
    }
  };

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

  const handleGlobalDelete = async () => {
    if (selectedDeliveries.length === 0) return;
    setShowDeleteConfirm(true);
  };

  if (!isEditDeliveryModalOpen) return null;

  // Диалог подтверждения удаления позиции товара
  if (itemToDelete !== null) {
    const item = deliveryItems[itemToDelete];
    return (
      <div className={css.confirmOverlay}>
        <div className={css.confirmCard}>
          <h3>⚠️ Підтвердження видалення</h3>
          <p>Ви впевнені, що хочете видалити товар <strong>{item?.product}</strong> з цієї доставки?</p>
          <div className={css.confirmActions}>
            <button className={css.btnSecondary} onClick={() => setItemToDelete(null)}>
              Скасувати
            </button>
            <button className={css.btnDangerGhost} onClick={confirmDeleteItem}>
              Так, видалити
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Диалог выбора даты печати
  if (isAskingDate) {
    return (
      <div className={css.confirmOverlay}>
        <div className={css.confirmCard}>
          <h3>📅 Оберіть дату доставки</h3>
          <p>Оберіть дату, яка буде відображена у друкованій формі:</p>
          <input
            type="date"
            className={css.inputDate}
            value={printDeliveryDate}
            onChange={(e) => setPrintDeliveryDate(e.target.value)}
          />
          <div className={css.confirmActions} style={{ marginTop: "20px" }}>
            <button className={css.btnSecondary} onClick={() => setIsAskingDate(false)}>
              Назад
            </button>
            <button
              className={css.btnPrimary}
              onClick={() => {
                setIsAskingDate(false);
                setIsPrintView(true);
              }}
            >
              До друку
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Предпросмотр печати
  if (isPrintView && printData) {
    return (
      <div className={css.workspaceShell} style={{ overflowY: "auto" }}>
        <div className={css.topBar}>
          <div className={css.topBarLeft}>
            <button className={css.backBtn} onClick={() => setIsEditDeliveryModalOpen(false)}>
              <ArrowLeft size={16} /> Назад
            </button>
            <h2 className={css.deliveryTitle}>📄 Форма для друку відомості</h2>
          </div>
          <div className={css.topBarRight}>
            <button className={css.btnSecondary} onClick={() => setIsEditDeliveryModalOpen(false)}>
              Закрити
            </button>
            <button className={css.btnPrimary} onClick={() => reactToPrintFn()}>
              <Printer size={16} /> Друкувати зараз
            </button>
          </div>
        </div>

        <div style={{ padding: "24px", maxWidth: "1100px", margin: "0 auto", width: "100%" }}>
          <div className={css.printableArea} ref={contentRef}>
            <div style={{ textAlign: "center", borderBottom: "2px solid #333", marginBottom: "20px", paddingBottom: "10px" }}>
              <h2 style={{ margin: 0 }}>Відомість доставки</h2>
              <div style={{ fontSize: "0.9rem", marginTop: "5px" }}>Дата: {new Date().toLocaleDateString("uk-UA")}</div>
            </div>

            {printData.length > 0 ? (
              printData.map((delivery, dIdx) => (
                <div key={dIdx} className={css.printGroup}>
                  <div className={css.printDeliveryHeader}>
                    <div><strong>Менеджер:</strong> {delivery.manager}</div>
                    <div><strong>Клієнт:</strong> {delivery.client}</div>
                    <div><strong>Дата доставки:</strong> {new Date(printDeliveryDate).toLocaleDateString("uk-UA")}</div>
                  </div>
                  {delivery.comment && (
                    <div className={css.printComment}>
                      <strong>Примітка:</strong> {delivery.comment}
                    </div>
                  )}
                  <table className={css.printTable}>
                    <thead>
                      <tr>
                        <th style={{ width: "15%" }}>Заявка</th>
                        <th style={{ width: "40%" }}>Товар</th>
                        <th style={{ width: "10%", textAlign: "center" }}>К-сть</th>
                        <th>Партії</th>
                      </tr>
                    </thead>
                    <tbody>
                      {delivery.items.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.orderRef || item.order}</td>
                          <td style={{ fontWeight: 500 }}>{item.product}</td>
                          <td style={{ textAlign: "center", fontWeight: "bold" }}>{formatQuantity(item.quantity)}</td>
                          <td style={{ fontSize: "0.85rem" }}>
                            {item.parties?.map(p => `${p.party} (${formatQuantity(p.moved_q)})`).join(", ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            ) : (
              <div style={{ textAlign: "center", padding: "20px" }}>Немає товарів для друку</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Метаданные текущей доставки
  const primaryDelivery = selectedDeliveries[0] || {};
  const activeItems = validatedItems.filter(item => (parseFloat(item.quantity) || 0) > 0);
  const activeProductTitle = selectedProductId
    ? (deliveryItems.find(i => (i.product_id || i.product) === selectedProductId)?.product || selectedProductId)
    : "Оберіть товар";

  return (
    <div className={css.workspaceShell}>
      {/* ─── ВЕРХНИЙ КОКПИТ-ХЕДЕР ─── */}
      <header className={css.topBar}>
        <div className={css.topBarLeft}>
          <button
            className={css.backBtn}
            onClick={() => setIsEditDeliveryModalOpen(false)}
            title="Повернутися до карти доставок (Esc)"
          >
            <ArrowLeft size={16} />
            <span>До карти доставок</span>
          </button>

          <div className={css.deliveryBadgeGroup}>
            <h2 className={css.deliveryTitle}>
              <Package size={18} color="#38bdf8" />
              <span>
                {selectedDeliveries.length > 1
                  ? `${selectedDeliveries.length} доставок обрано`
                  : `Доставка #${primaryDelivery.id || primaryDelivery.order_ref || ""}`}
              </span>
            </h2>
            <span className={css.statusBadge}>
              {primaryDelivery.status || "В обробці"}
            </span>
            {primaryDelivery.client && (
              <span className={css.clientSubtitle} title={primaryDelivery.client}>
                • {primaryDelivery.client}
              </span>
            )}
          </div>
        </div>

        {/* Сводные метрики доставки */}
        <div className={css.metricsStrip}>
          <div className={css.metricChip} title="Кількість активних позицій у доставці">
            <Boxes size={15} color="#94a3b8" />
            <span><strong>{activeItems.length}</strong> поз.</span>
          </div>

          <div className={css.metricChip} title="Загальна вага доставки">
            <Scale size={15} color="#94a3b8" />
            <span><strong>{totalWeightSummary}</strong> кг</span>
          </div>

          {deficitItems.length > 0 ? (
            <div
              className={`${css.metricChip} ${css.chipDeficit}`}
              style={{ cursor: "pointer" }}
              onClick={() => handleOrderToBi(deficitItems, "дефіцитних позицій")}
              title="Натисніть для переходу у замовлення дефіциту"
            >
              <AlertTriangle size={15} />
              <span>Дефіцит: <strong>{deficitItems.length}</strong> поз.</span>
            </div>
          ) : (
            <div className={`${css.metricChip} ${css.chipSuccess}`}>
              <CheckCircle2 size={15} />
              <span>Всі товари забезпечені</span>
            </div>
          )}
        </div>

        {/* Действия хедера */}
        <div className={css.topBarRight}>
          {selectedDeliveries.every(d => d.status !== "Виконано") && (
            <button
              className={css.btnSecondary}
              onClick={handleCODelivery}
              disabled={isSaving}
              title="Оформити доставку напряму з Центрального Офісу"
            >
              <Truck size={15} color="#a78bfa" />
              <span>Доставка з ЦО</span>
            </button>
          )}

          <button
            className={css.btnSecondary}
            onClick={() => {
              const hasItems = deliveryItems.some(i => (parseFloat(i.quantity) || 0) > 0);
              if (!hasItems) {
                toast.error("Немає товарів для відправки");
                return;
              }
              setIsAccountantDialogOpen(true);
            }}
            disabled={isSaving}
            title="Надіслати відвантаження бухгалтеру"
          >
            <Send size={15} color="#38bdf8" />
            <span>Бухгалтеру</span>
          </button>

          <button
            className={css.btnSecondary}
            onClick={handlePrintPreview}
            disabled={isSaving}
            title="Форма для друку відомості"
          >
            <Printer size={15} />
            <span>Друк</span>
          </button>

          {selectedDeliveries.every(d => d.status !== "Виконано") && (
            <button
              className={css.btnDangerGhost}
              onClick={handleGlobalDelete}
              title="Видалити цю доставку"
            >
              <Trash2 size={15} />
            </button>
          )}

          <button
            className={css.btnPrimary}
            onClick={handleReady}
            disabled={isSaving}
            title="Зберегти всі зміни та призначити статус 'В роботі'"
          >
            <Check size={16} />
            <span>{isSaving ? "Збереження..." : "Готово"}</span>
          </button>
        </div>
      </header>

      {/* ─── ОСНОВНОЙ РАБОЧИЙ ГРИД С ДИНАМИЧЕСКИМ ЗУМОМ ─── */}
      <main className={`${css.workspaceBody} ${focusedPane === "right" ? css.focusRight : css.focusLeft}`}>
        {/* Индикатор сохранения */}
        {isSaving && (
          <div className={css.loadingOverlay}>
            <div className={css.spinner} />
            <span>Збереження змін...</span>
          </div>
        )}

        {/* ЛЕВАЯ ПАНЕЛЬ: ТОВАРЫ В ДОСТАВКЕ */}
        <section
          className={`${css.leftPane} ${focusedPane === "left" ? css.paneActive : ""}`}
          onClick={() => setFocusedPane("left")}
        >
          <div className={css.paneHeader}>
            <h3 className={css.paneTitle}>
              <Boxes size={18} color="#38bdf8" />
              <span>Товари у доставці ({activeItems.length})</span>
            </h3>

            {/* Быстрые действия над всеми и индикатор зума */}
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                type="button"
                className={`${css.zoomHintBtn} ${focusedPane === "left" ? css.zoomHintBtnActive : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setFocusedPane(focusedPane === "left" ? "right" : "left");
                }}
                title={focusedPane === "left" ? "Блок збільшено (активний фокус)" : "Натисніть для збільшення блоку товарів"}
              >
                <Maximize2 size={11} />
                <span>{focusedPane === "left" ? "Збільшено" : "Збільшити"}</span>
              </button>

              <button
                className={css.btnSecondary}
                style={{ padding: "5px 10px", fontSize: "0.78rem" }}
                onClick={(e) => {
                  e.stopPropagation();
                  const allActive = validatedItems
                    .map((item, idx) => ({ item, idx }))
                    .filter(x => (parseFloat(x.item.quantity) || 0) > 0);
                  handleOrderToBi(allActive, "товарів");
                }}
                title="Перенести всі товари у кошик замовлень BI"
              >
                <PlusCircle size={13} />
                <span>Замовити всі</span>
              </button>
            </div>
          </div>

          {/* Плавающая плашка групповых действий при выборе чекбоксами */}
          {selectedIndices.length > 0 && (
            <div className={css.bulkBar}>
              <div className={css.bulkInfo}>
                <CheckCircle2 size={16} />
                <span>Обрано: <strong>{selectedIndices.length}</strong> з {activeItems.length}</span>
              </div>
              <div className={css.bulkActions}>
                <button
                  className={`${css.bulkBtn} ${css.bulkBtnPrimary}`}
                  onClick={() => {
                    const selectedList = selectedIndices
                      .map(idx => ({ item: validatedItems[idx], idx }))
                      .filter(x => x.item && (parseFloat(x.item.quantity) || 0) > 0);
                    handleOrderToBi(selectedList, "обраних позицій");
                  }}
                >
                  <ShoppingCart size={13} />
                  <span>Замовити обрані</span>
                </button>

                <button
                  className={`${css.bulkBtn} ${css.bulkBtnGhost}`}
                  onClick={handleSplitDelivery}
                  disabled={isSplitting}
                  title="Обрані товари будуть відокремлені у нову доставку"
                >
                  <Scissors size={13} />
                  <span>{isSplitting ? "Обробка..." : "Розділити в нову доставку"}</span>
                </button>

                <button
                  className={`${css.bulkBtn} ${css.bulkBtnGhost}`}
                  onClick={() => setSelectedItemsToSplit({})}
                  title="Зняти виділення"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          )}

          {/* Таблица товаров */}
          <div className={css.tableContainer}>
            <table className={css.dataTable}>
              <thead>
                <tr>
                  <th style={{ width: "1%", whiteSpace: "nowrap", textAlign: "center" }}>
                    <input
                      type="checkbox"
                      title="Обрати всі позиції"
                      checked={activeItems.length > 0 && activeItems.every((_, idx) => !!selectedItemsToSplit[idx])}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        const newSel = {};
                        if (isChecked) {
                          validatedItems.forEach((item, idx) => {
                            if ((parseFloat(item.quantity) || 0) > 0) newSel[idx] = true;
                          });
                        }
                        setSelectedItemsToSplit(newSel);
                      }}
                    />
                  </th>
                  <th style={{ width: "1%", whiteSpace: "nowrap" }}>Заявка</th>
                  <th style={{ minWidth: "140px" }}>Клієнт</th>
                  <th style={{ minWidth: "180px" }}>Товар та залишки</th>
                  <th style={{ width: "1%", whiteSpace: "nowrap", textAlign: "right" }}>Кількість</th>
                  <th style={{ width: "1%", whiteSpace: "nowrap", minWidth: "135px" }}>Комплектація</th>
                  {selectedIndices.length > 0 && (
                    <>
                      <th style={{ width: "1%", whiteSpace: "nowrap", textAlign: "center", color: "#818cf8" }}>Перенести</th>
                      <th style={{ width: "1%", whiteSpace: "nowrap", textAlign: "center", color: "#64748b" }}>Залишок</th>
                    </>
                  )}
                  <th style={{ width: "1%", whiteSpace: "nowrap" }}></th>
                </tr>
              </thead>
              <tbody>
                {validatedItems.map((item, idx) => {
                  const qty = parseFloat(item.quantity) || 0;
                  if (qty <= 0 && !item.isNew) return null;

                  const isSelectedForSplit = !!selectedItemsToSplit[idx];
                  const isRowActive = activeItemIdx === idx;
                  const isExpanded = !!expandedRows[idx];
                  const { totalBuh, deficitBuh, hasDeficit, isLoading: isBuhLoading } = getItemBuhInfo(item);

                  const partiesSum = item.partiesSum || 0;
                  const percentAllocated = qty > 0 ? Math.min(100, Math.round((partiesSum / qty) * 100)) : 0;
                  const isFullyAllocated = qty > 0 && Math.abs(qty - partiesSum) < 0.0001;

                  return (
                    <React.Fragment key={`${item.deliveryId}-${idx}`}>
                      <tr
                        className={`${css.itemRow} ${isRowActive ? css.itemRowSelected : ""} ${item.hasError ? css.itemRowError : ""}`}
                        onClick={() => handleItemClick(item, idx)}
                      >
                        {/* Чекбокс */}
                        <td onClick={(e) => e.stopPropagation()} style={{ width: "1%", whiteSpace: "nowrap", textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={isSelectedForSplit}
                            onChange={() => toggleItemSplitSelection(idx)}
                            disabled={isSplitting}
                          />
                        </td>

                        {/* Номер заявки */}
                        <td style={{ width: "1%", whiteSpace: "nowrap" }}>
                          <span className={css.orderRefPill} title={item.orderRef}>
                            {item.orderRef || "—"}
                          </span>
                        </td>

                        {/* Клиент */}
                        <td>
                          <div className={css.clientName}>{item.client}</div>
                          {item.manager && <div className={css.clientCity}>Менеджер: {item.manager}</div>}
                        </td>

                        {/* Товар и бейджи остатков */}
                        <td>
                          <div className={css.productTitle}>{item.product}</div>
                          <div className={css.productMeta}>
                            {isBuhLoading ? (
                              <span className={css.buhLoadingBadge}>⏳ перевірка залишку...</span>
                            ) : hasDeficit ? (
                              <span
                                className={css.buhDeficitBadge}
                                title={`Потреба: ${formatQuantity(qty)}, Бух. залишок: ${formatQuantity(totalBuh)}. Дефіцит: -${formatQuantity(deficitBuh)}`}
                              >
                                🔴 Бух: {formatQuantity(totalBuh)} (деф: -{formatQuantity(deficitBuh)})
                              </span>
                            ) : (
                              <span
                                className={css.buhOkBadge}
                                title={`Бух. залишок: ${formatQuantity(totalBuh)}`}
                              >
                                🟢 Бух: {formatQuantity(totalBuh)}
                              </span>
                            )}
                            {item.orders_q > 0 && (
                              <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                                Замовлено в заявці: {formatQuantity(item.orders_q)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Количество */}
                        <td onClick={(e) => e.stopPropagation()} style={{ width: "1%", whiteSpace: "nowrap", textAlign: "right" }}>
                          <input
                            type="number"
                            className={`${css.inputNumber} ${item.hasError ? css.inputError : ""}`}
                            value={item.quantity}
                            step="any"
                            onChange={(e) => handleQuantityChange(idx, e.target.value)}
                            title={
                              item.errorType === "mismatch"
                                ? "Сума партій не збігається з кількістю"
                                : item.errorType === "no_parties"
                                ? "Необхідно вказати партію"
                                : ""
                            }
                          />
                        </td>

                        {/* Индикатор комплектации партий */}
                        <td style={{ width: "1%", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "135px" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", marginBottom: "3px" }}>
                                <span style={{ color: isFullyAllocated ? "#34d399" : "#94a3b8", fontWeight: 600 }}>
                                  {formatQuantity(partiesSum)} / {formatQuantity(qty)}
                                </span>
                                <span style={{ color: "#64748b" }}>{percentAllocated}%</span>
                              </div>
                              <div className={css.progressBarContainer} style={{ width: "100%" }}>
                                <div
                                  className={css.progressBarFill}
                                  style={{
                                    width: `${percentAllocated}%`,
                                    background: isFullyAllocated ? "#10b981" : (partiesSum > qty ? "#ef4444" : "#38bdf8")
                                  }}
                                />
                              </div>
                            </div>
                            <span style={{ color: "#64748b" }}>
                              {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                            </span>
                          </div>
                        </td>

                        {/* Перенос (при разделении) */}
                        {selectedIndices.length > 0 && (
                          <>
                            <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
                              {isSelectedForSplit && (
                                <input
                                  type="number"
                                  className={css.splitTransferInput}
                                  value={splitQuantities[idx] !== undefined ? splitQuantities[idx] : qty}
                                  min={0.001}
                                  max={qty}
                                  step="any"
                                  disabled={isSplitting}
                                  onChange={(e) => handleSplitQuantityChange(idx, e.target.value)}
                                  title="Кількість для переносу в нову доставку"
                                />
                              )}
                            </td>
                            <td style={{ textAlign: "center", fontSize: "0.82rem" }}>
                              {isSelectedForSplit && (
                                <span style={{
                                  color: (qty - (splitQuantities[idx] || qty)) <= 0 ? "#ef4444" : "#94a3b8",
                                  fontWeight: 600
                                }}>
                                  {Math.max(0, Math.round((qty - (splitQuantities[idx] || qty)) * 1000) / 1000)}
                                </span>
                              )}
                            </td>
                          </>
                        )}

                        {/* Удаление */}
                        <td onClick={(e) => e.stopPropagation()} style={{ width: "1%", whiteSpace: "nowrap", textAlign: "center" }}>
                          <button
                            className={css.deleteItemBtn}
                            onClick={() => handleDeleteItemClick(idx)}
                            title="Видалити товар з цієї форми"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>

                      {/* РАСКРЫВАЮЩАЯСЯ СЕКЦИЯ КОМПЛЕКТАЦИИ ПАРТИЙ ДЛЯ ЭТОГО ТОВАРА */}
                      {isExpanded && (
                        <tr className={css.batchAccordionRow}>
                          <td colSpan={selectedIndices.length > 0 ? 9 : 7}>
                            <div className={css.batchStrip}>
                              <div className={css.batchStripHeader}>
                                <div className={css.batchProgressLabel}>
                                  <span>Розподіл за складовими партіями ({item.parties?.length || 0})</span>
                                  {item.hasError && item.errorType === "mismatch" && (
                                    <span style={{ color: "#ef4444", fontSize: "0.75rem" }}>
                                      ⚠️ Різниця: {formatQuantity(qty - partiesSum)}
                                    </span>
                                  )}
                                  {item.hasError && item.errorType === "no_parties" && (
                                    <span style={{ color: "#f59e0b", fontSize: "0.75rem" }}>
                                      ⚠️ Оберіть партію у правому вікні залишків
                                    </span>
                                  )}
                                </div>
                              </div>

                              {item.parties && item.parties.length > 0 ? (
                                <table className={css.allocatedTable}>
                                  <thead>
                                    <tr>
                                      <th style={{ width: "1%", whiteSpace: "nowrap" }}></th>
                                      <th>Серія / Партія</th>
                                      <th style={{ width: "1%", whiteSpace: "nowrap" }}>Залишки на складі</th>
                                      <th style={{ width: "1%", whiteSpace: "nowrap", textAlign: "center" }}>Кількість для списання</th>
                                      <th style={{ width: "1%", whiteSpace: "nowrap" }}></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {item.parties.map((p, pIdx) => {
                                      const partyQty = (p.party_quantity !== "" && p.party_quantity !== undefined)
                                        ? p.party_quantity
                                        : (p.moved_q || 0);
                                      const stockStatus = isRowActive ? getPartyStockStatus(p.party, partyQty) : "unknown";

                                      const key = (p.party || "").trim().toLowerCase();
                                      const st = partyStockMap[key];
                                      const realBuh = st ? st.totalBuh : 0;
                                      const realSkl = st ? (st.totalSkl - st.totalStorage) : 0;

                                      return (
                                        <tr key={pIdx}>
                                          <td style={{ width: "1%", whiteSpace: "nowrap" }}>
                                            {stockStatus === "ok" && <CheckCircle2 size={14} color="#10b981" />}
                                            {stockStatus === "low" && <AlertTriangle size={14} color="#f59e0b" />}
                                            {stockStatus === "missing" && <AlertTriangle size={14} color="#ef4444" />}
                                          </td>
                                          <td style={{ fontWeight: 600, color: "#f8fafc" }}>
                                            {p.party && p.party.trim() !== "" ? (
                                              p.party
                                            ) : (
                                              <span style={{ color: "#f87171", fontStyle: "italic", fontSize: "0.8rem" }}>
                                                ⚠️ Партія не призначена
                                              </span>
                                            )}
                                          </td>
                                          <td style={{ width: "1%", whiteSpace: "nowrap" }}>
                                            {st ? (
                                              <span style={{ fontSize: "0.78rem", color: stockStatus === "ok" ? "#34d399" : "#fca5a5" }}>
                                                Бух: {formatQuantity(realBuh)} · Склад: {formatQuantity(realSkl)}
                                              </span>
                                            ) : (
                                              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                                Немає на поточному складі
                                              </span>
                                            )}
                                          </td>
                                          <td style={{ width: "1%", whiteSpace: "nowrap", textAlign: "center" }}>
                                            <div className={css.stepperGroup}>
                                              <button
                                                type="button"
                                                className={css.stepperBtn}
                                                onClick={() => handleStepPartyQty(idx, pIdx, -1)}
                                                title="-1"
                                              >
                                                <Minus size={12} />
                                              </button>
                                              <input
                                                type="number"
                                                className={css.stepperInput}
                                                value={p.party_quantity !== undefined ? p.party_quantity : (p.moved_q || 0)}
                                                step="any"
                                                onChange={(e) => handlePartyQuantityChange(idx, pIdx, e.target.value)}
                                              />
                                              <button
                                                type="button"
                                                className={css.stepperBtn}
                                                onClick={() => handleStepPartyQty(idx, pIdx, +1)}
                                                title="+1"
                                              >
                                                <Plus size={12} />
                                              </button>
                                            </div>
                                          </td>
                                          <td style={{ width: "1%", whiteSpace: "nowrap", textAlign: "center" }}>
                                            <button
                                              className={css.deletePartyBtn}
                                              onClick={() => handleDeleteParty(idx, pIdx)}
                                              title="Видалити цю партію"
                                            >
                                              <X size={14} />
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              ) : (
                                <div style={{ fontSize: "0.8rem", color: "#64748b", padding: "8px 0" }}>
                                  ⚠️ Партії ще не розподілені. Натисніть на потрібну партію у правому вікні, щоб призначити її.
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ПРАВАЯ ПАНЕЛЬ: ИНСПЕКТОР СКЛАДА И АНАЛИТИКА (С ТАБАМИ) */}
        <section
          className={`${css.rightPane} ${focusedPane === "right" ? css.paneActive : ""}`}
          onClick={() => setFocusedPane("right")}
        >
          <div className={css.paneHeader}>
            <h3 className={css.paneTitle} style={{ maxWidth: "45%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <Package size={17} color="#38bdf8" />
              <span title={activeProductTitle}>{activeProductTitle}</span>
            </h3>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {/* Вкладки: Остатки vs Аналитика заказов */}
              <div className={css.tabGroup}>
                <button
                  className={`${css.tabBtn} ${activeRightTab === "stock" ? css.tabBtnActive : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveRightTab("stock");
                    setFocusedPane("right");
                  }}
                >
                  <Boxes size={13} />
                  <span>Залишки ({stockRemains.length})</span>
                </button>
                <button
                  className={`${css.tabBtn} ${activeRightTab === "analytics" ? css.tabBtnActive : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveRightTab("analytics");
                    setFocusedPane("right");
                  }}
                >
                  <BarChart3 size={13} />
                  <span>Аналітика товару</span>
                </button>
              </div>

              <button
                type="button"
                className={`${css.zoomHintBtn} ${focusedPane === "right" ? css.zoomHintBtnActive : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setFocusedPane(focusedPane === "right" ? "left" : "right");
                }}
                title={focusedPane === "right" ? "Блок збільшено (активний фокус)" : "Натисніть для збільшення блоку аналітики"}
              >
                <Maximize2 size={11} />
                <span>{focusedPane === "right" ? "Збільшено" : "Збільшити"}</span>
              </button>
            </div>
          </div>

          <div className={css.inspectorBody}>
            {/* ТАБ 1: СКЛАДСКИЕ ОСТАТКИ */}
            {activeRightTab === "stock" && (
              <>
                {isLoadingRemains ? (
                  <div className={css.emptyState}>
                    <div className={css.spinner} />
                    <span>Завантаження залишків по товару...</span>
                  </div>
                ) : stockRemains.length > 0 ? (
                  <table className={css.remainsTable}>
                    <thead>
                      <tr>
                        <th>Партія / Склад</th>
                        <th style={{ width: "55px", textAlign: "right" }}>Бух.</th>
                        <th style={{ width: "55px", textAlign: "right" }}>Скл.</th>
                        <th style={{ width: "50px", textAlign: "right" }}>Збер.</th>
                        <th style={{ width: "50px", textAlign: "right" }}>Вага</th>
                        <th style={{ width: "80px", textAlign: "center" }}>Дія</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockRemains.map((remain, rIdx) => (
                        <tr
                          key={rIdx}
                          className={css.remainRow}
                          onClick={() => handleAddPartyFromRemains(remain)}
                          title="Натисніть для додавання цієї партії до обраного товару"
                        >
                          <td>
                            <div style={{ fontWeight: 600, color: "#f8fafc" }}>
                              {remain.nomenclature_series || "Без серії"}
                            </div>
                            <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "2px" }}>
                              {remain.warehouse}
                            </div>
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 600, color: "#34d399" }}>
                            {formatQuantity(remain.buh)}
                          </td>
                          <td style={{ textAlign: "right", color: "#cbd5e1" }}>
                            {formatQuantity(remain.skl)}
                          </td>
                          <td style={{ textAlign: "right", color: "#94a3b8" }}>
                            {formatQuantity(remain.storage)}
                          </td>
                          <td style={{ textAlign: "right", color: "#64748b", fontSize: "0.78rem" }}>
                            {remain.weight || "—"}
                          </td>
                          <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                            <button
                              className={css.usePartyBtn}
                              onClick={() => handleAddPartyFromRemains(remain)}
                            >
                              <Plus size={11} />
                              <span>Додати</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className={css.emptyState}>
                    <Info size={28} color="#64748b" />
                    <span>
                      {selectedProductId
                        ? "Залишків по цьому товару не виявлено"
                        : "Оберіть товар у лівій таблиці, щоб побачити складські залишки"}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* ТАБ 2: АНАЛИТИКА ЗАЯВОК (DetailsOrdersByProduct) */}
            {activeRightTab === "analytics" && (
              <div style={{ height: "100%", overflowY: "auto" }}>
                {selectedProductId && stockRemains && stockRemains.length > 0 && stockRemains[0].product ? (
                  <DetailsOrdersByProduct
                    selectedProductId={stockRemains[0].product}
                    onPartyClick={handleAddPartyFromRemains}
                  />
                ) : (
                  <div className={css.emptyState}>
                    <AlertTriangle size={24} color="#f59e0b" />
                    <span>Аналітика черги заявок доступна при наявності ідентифікованого товару.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ─── МОДАЛКА ПОДТВЕРЖДЕНИЯ УДАЛЕНИЯ ВСЕХ ДОСТАВОК ─── */}
      {showDeleteConfirm && (
        <div className={css.confirmOverlay} onClick={() => setShowDeleteConfirm(false)}>
          <div className={css.confirmCard} onClick={e => e.stopPropagation()}>
            <h3>Видалення доставки</h3>
            <p>
              Ви впевнені, що хочете видалити {selectedDeliveries.length > 1 ? "ці доставки" : "цю доставку"} (
              {selectedDeliveries.map(d => d.id).join(", ")})?
            </p>
            <div className={css.confirmActions}>
              <button className={css.btnSecondary} onClick={() => setShowDeleteConfirm(false)}>
                Скасувати
              </button>
              <button className={css.btnDangerGhost} onClick={confirmGlobalDelete}>
                Видалити
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ПРЕДУПРЕЖДЕНИЕ: ТОВАРЫ БЕЗ ПАРТИЙ ─── */}
      {showPartiesWarning && (
        <div className={css.confirmOverlay} onClick={() => { setShowPartiesWarning(false); setPendingAction(null); }}>
          <div className={css.confirmCard} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: "#f59e0b" }}>⚠️ Товари без партій</h3>
            <p style={{ marginBottom: "10px" }}>Наступні товари не мають прив&apos;язки до партій:</p>
            <ul style={{ margin: "0 0 14px 18px", fontSize: "0.85rem", color: "#cbd5e1" }}>
              {validatedItems
                .filter(i => i.errorType === "no_parties" && (parseFloat(i.quantity) || 0) > 0)
                .map((i, idx) => (
                  <li key={idx}>{i.product}{i.orderRef ? ` (${i.orderRef})` : ""}</li>
                ))}
            </ul>
            <p style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
              Товари можуть бути відвантажені без зазначення партій. Продовжити?
            </p>
            <div className={css.confirmActions}>
              <button
                className={css.btnSecondary}
                onClick={() => { setShowPartiesWarning(false); setPendingAction(null); }}
              >
                Виправити
              </button>
              <button
                className={css.btnPrimary}
                style={{ background: "#d97706", borderColor: "#f59e0b" }}
                onClick={handlePartiesWarningContinue}
              >
                Продовжити без партій
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── МОДАЛКА ОТПРАВКИ БУХГАЛТЕРУ ─── */}
      <SendAccountantDialog
        isOpen={isAccountantDialogOpen}
        delivery={selectedDeliveries[0] || {}}
        items={deliveryItems}
        onClose={() => setIsAccountantDialogOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["deliveries"] });
        }}
      />
    </div>
  );
}
