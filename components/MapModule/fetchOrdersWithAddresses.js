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
  
  // Создаем Map для быстрого поиска адреса по имени клиента
  const addressMap = new Map();
  addresses.forEach(addr => {
    addressMap.set(addr.client, addr);
  });

  // Группируем заявки по клиентам
  const clientOrdersMap = new Map();
  const clientsWithoutAddress = new Map(); // Новый Map для клиентов без адреса
  
  orders.forEach(order => {
    const clientName = order.client;
    const address = addressMap.get(clientName);
    
    if (address) {
      // Клиент с адресом
      if (!clientOrdersMap.has(clientName)) {
        clientOrdersMap.set(clientName, {
          client: clientName,
          address: address,
          orders: [],
          uniqueContracts: new Set(),
          totalQuantity: 0 // Общее количество товара
        });
      }
      
      const clientData = clientOrdersMap.get(clientName);
      clientData.orders.push(order);
      
      // Добавляем уникальный договор
      if (order.contract_supplement) {
        clientData.uniqueContracts.add(order.contract_supplement);
      }
      
      // Суммируем количество товара
      if (order.different && !isNaN(order.different)) {
        clientData.totalQuantity += parseFloat(order.different);
      }
    } else {
      // Клиент без адреса
      if (!clientsWithoutAddress.has(clientName)) {
        clientsWithoutAddress.set(clientName, {
          client: clientName,
          orders: [],
          uniqueContracts: new Set(),
          totalQuantity: 0
        });
      }
      
      const clientData = clientsWithoutAddress.get(clientName);
      clientData.orders.push(order);
      
      if (order.contract_supplement) {
        clientData.uniqueContracts.add(order.contract_supplement);
      }
      
      if (order.different && !isNaN(order.different)) {
        clientData.totalQuantity += parseFloat(order.different);
      }
    }
  });

  // Преобразуем Set в count и округляем totalQuantity
  const withAddresses = Array.from(clientOrdersMap.values()).map(item => ({
    ...item,
    count: item.uniqueContracts.size,
    totalQuantity: Math.round(item.totalQuantity * 100) / 100, // Округление до 2 знаков
    uniqueContracts: undefined // Удаляем Set из финального объекта
  }));
  
  const withoutAddresses = Array.from(clientsWithoutAddress.values()).map(item => ({
    ...item,
    count: item.uniqueContracts.size,
    totalQuantity: Math.round(item.totalQuantity * 100) / 100,
    uniqueContracts: undefined
  }));
  
  console.log('Merged result:', withAddresses.length, 'clients with addresses,', withoutAddresses.length, 'clients without addresses');
  
  return { withAddresses, withoutAddresses };
}

// Получить данные для тепловой карты
export async function fetchOrdersHeatmapData() {
  const { orders, addresses } = await fetchOrdersAndAddresses();

  const { withAddresses, withoutAddresses } = mergeOrdersWithAddresses(orders, addresses);
  
  // Формируем точки для тепловой карты: [lat, lon, intensity]
  const heatmapPoints = withAddresses.map(item => [
    item.address.latitude,
    item.address.longitude,
    item.totalQuantity // Интенсивность = общее количество товара
  ]);

  console.log('Heatmap points generated:', heatmapPoints.length);

  return {
    mergedData: withAddresses, // Для отображения маркеров с деталями
    unmappedData: withoutAddresses, // Заявки без адресов
    heatmapPoints // Для тепловой карты
  };
}
