import axios from "axios";

// Получить заявки и адреса одним запросом
export async function fetchOrdersAndAddresses() {
  try {
    console.log('Fetching orders and addresses from:', `${process.env.NEXT_PUBLIC_URL_API}/get_all_orders_and_address`);
    const response = await axios.get(`${process.env.NEXT_PUBLIC_URL_API}/get_all_orders_and_address`);
    
    const [orders, addresses] = response.data;
    console.log('Orders received:', orders.length, 'items');
    console.log('Addresses received:', addresses.length, 'items');
    
    return { orders, addresses };
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
    return { orders: [], addresses: [] };
  }
}

// Вспомогательная функция для парсинга веса
const parseWeight = (weightStr) => {
  if (typeof weightStr === "number") return weightStr;
  if (!weightStr || typeof weightStr !== "string") return 0;
  const cleaned = weightStr.replace(/[^0-9.,]/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
};

// Функция для получения веса продуктов (с кешированием)
async function getProductWeights(productIds, initData) {
  const weightsCache = {};
  const url = process.env.NEXT_PUBLIC_URL_API;
  const headers = { "X-Telegram-Init-Data": initData };

  // Ограничим количество параллельных запросов для стабильности
  const batchSize = 10;
  for (let i = 0; i < productIds.length; i += batchSize) {
    const batch = productIds.slice(i, i + batchSize);
    await Promise.all(batch.map(async (id) => {
      try {
        if (!id || id === 'undefined' || id === 'null') {
          weightsCache[id] = 0;
          return;
        }

        // 1. Получаем детали продукта
        const prodRes = await axios.get(`${url}/data/product/${id}`, { headers });
        const lineOfBusiness = prodRes.data?.line_of_business || "";
        const isSeed = ["Насіння", "Власне виробництво насіння"].includes(lineOfBusiness);

        // 2. Получаем остатки
        const remainsRes = await axios.get(`${url}/data/remains/${id}`, { headers });
        const remains = remainsRes.data || [];

        if (remains.length > 0) {
          const weights = remains.map(r => parseWeight(r.weight)).filter(w => w > 0);
          if (weights.length > 0) {
            if (isSeed) {
              // Для семян - среднее
              const sum = weights.reduce((a, b) => a + b, 0);
              weightsCache[id] = sum / weights.length;
            } else {
              // Для остального - первый попавшийся валидный вес
              weightsCache[id] = weights[0];
            }
          } else {
            weightsCache[id] = 0;
          }
        } else {
          weightsCache[id] = 0;
        }
      } catch (e) {
        console.warn(`Error fetching weight for product ${id}:`, e.message);
        weightsCache[id] = 0;
      }
    }));
  }
  return weightsCache;
}

// Объединить заявки с адресами и сгруппировать по клиентам
export function mergeOrdersWithAddresses(orders, addresses) {
  console.log('Merging orders with addresses...');
  
  const addressMap = new Map();
  addresses.forEach(addr => {
    addressMap.set(addr.client, addr);
  });

  const clientOrdersMap = new Map();
  const clientsWithoutAddress = new Map();
  
  orders.forEach(order => {
    const clientName = order.client;
    const address = addressMap.get(clientName);
    const weight = order.calculatedWeight || 0;
    
    const targetMap = address ? clientOrdersMap : clientsWithoutAddress;
    
    if (!targetMap.has(clientName)) {
      targetMap.set(clientName, {
        client: clientName,
        address: address, // может быть undefined для withoutAddress
        orders: [],
        uniqueContracts: new Set(),
        totalQuantity: 0,
        totalWeight: 0
      });
    }
    
    const clientData = targetMap.get(clientName);
    clientData.orders.push(order);
    
    if (order.contract_supplement) {
      clientData.uniqueContracts.add(order.contract_supplement);
    }
    
    if (order.different && !isNaN(order.different)) {
      const g = parseFloat(order.different);
      clientData.totalQuantity += g;
      clientData.totalWeight += (g * weight);
    }
  });

  const withAddresses = Array.from(clientOrdersMap.values()).map(item => ({
    ...item,
    count: item.uniqueContracts.size,
    totalQuantity: Math.round(item.totalQuantity * 100) / 100,
    totalWeight: Math.round(item.totalWeight * 100) / 100,
    uniqueContracts: undefined
  }));
  
  const withoutAddresses = Array.from(clientsWithoutAddress.values()).map(item => ({
    ...item,
    count: item.uniqueContracts.size,
    totalQuantity: Math.round(item.totalQuantity * 100) / 100,
    totalWeight: Math.round(item.totalWeight * 100) / 100,
    uniqueContracts: undefined
  }));
  
  console.log('Merged result:', withAddresses.length, 'clients with addresses');
  
  return { withAddresses, withoutAddresses };
}

// Получить данные для тепловой карты
export async function fetchOrdersHeatmapData(initData) {
  const { orders, addresses } = await fetchOrdersAndAddresses();

  // Рассчитываем веса для всех ордеров
  const uniqueProductIds = [...new Set(orders.map(o => o.product).filter(Boolean))];
  console.log(`Calculating weights for ${uniqueProductIds.length} unique products...`);
  const weightsMap = await getProductWeights(uniqueProductIds, initData);

  const ordersWithWeight = orders.map(o => ({
    ...o,
    calculatedWeight: weightsMap[o.product] || 0
  }));

  const { withAddresses, withoutAddresses } = mergeOrdersWithAddresses(ordersWithWeight, addresses);
  
  // Формируем точки для тепловой карты: [lat, lon, intensity]
  const heatmapPoints = withAddresses.map(item => [
    item.address.latitude,
    item.address.longitude,
    item.totalWeight // Интенсивность = ОБЩИЙ ВЕС товара
  ]);

  console.log('Heatmap points generated (by weight):', heatmapPoints.length);

  return {
    mergedData: withAddresses,
    unmappedData: withoutAddresses,
    heatmapPoints
  };
}
