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
    
    // Используем total_weight, который приходит напрямую от бэкенда, и гарантируем, что это число
    const weight = parseFloat(order.total_weight) || 0;
    
    const targetMap = address ? clientOrdersMap : clientsWithoutAddress;
    
    if (!targetMap.has(clientName)) {
      targetMap.set(clientName, {
        client: clientName,
        address: address, // может быть undefined для withoutAddress
        orders: [],
        uniqueContracts: new Set(),
        totalQuantity: 0,
        totalWeight: 0 // Инициализируем общий вес
      });
    }
    
    const clientData = targetMap.get(clientName);
    clientData.orders.push(order);
    
    if (order.contract_supplement) {
      clientData.uniqueContracts.add(order.contract_supplement);
    }
    
    // Суммируем общий вес напрямую, без перемножения
    clientData.totalWeight += weight;

    if (order.different && !isNaN(order.different)) {
      const quantity = parseFloat(order.different);
      clientData.totalQuantity += quantity;
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

// Получить данные для заявок (старое название, но теперь без тепловой карты)
export async function fetchOrdersHeatmapData() {
  // 1. Получаем данные. Бэкенд уже посчитал total_weight для каждой заявки.
  const { orders, addresses } = await fetchOrdersAndAddresses();

  // 2. Сразу передаем данные на группировку.
  const { withAddresses, withoutAddresses } = mergeOrdersWithAddresses(orders, addresses);
  
  return {
    mergedData: withAddresses,
    unmappedData: withoutAddresses,
  };
}
