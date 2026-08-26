export function cleanString(val?: string | null): string {
  return (val || "").trim();
}

export function normalizeString(val?: string | null): string {
  return cleanString(val).toLowerCase();
}

export function matchesLoB(lob?: string | null, selectedLoBs: string[] = []): boolean {
  if (!selectedLoBs || selectedLoBs.length === 0) return true;
  const cleanLob = cleanString(lob);
  if (!cleanLob) return false;
  return selectedLoBs.some(s => cleanString(s).toLowerCase() === cleanLob.toLowerCase());
}

export function matchesManager(
  managers: (string | null | undefined)[], 
  selectedManagers: string[] = []
): boolean {
  if (!selectedManagers || selectedManagers.length === 0) return true;
  const cleanSelected = selectedManagers.map(cleanString).filter(Boolean);
  if (cleanSelected.length === 0) return true;

  return managers.some(m => {
    const cleanM = cleanString(m);
    return cleanM && cleanSelected.some(s => s.toLowerCase() === cleanM.toLowerCase());
  });
}

export interface OrderItem {
  contract_supplement?: string;
  line_of_business?: string;
  manager?: string;
  different?: number | string;
  total_weight?: number | string;
  [key: string]: unknown;
}

export interface ApplicationItem {
  client: string;
  address?: {
    manager?: string;
    latitude?: number;
    longitude?: number;
    city?: string;
    area?: string;
    [key: string]: unknown;
  };
  orders?: OrderItem[];
  count?: number;
  totalQuantity?: number;
  totalWeight?: number;
  [key: string]: unknown;
}

export interface DeliveryItem {
  id?: string | number;
  status?: string;
  manager?: string;
  delivery_date?: string;
  client?: string;
  line_of_business?: string;
  items?: Array<{ line_of_business?: string; [key: string]: unknown }>;
  orders?: Array<{ line_of_business?: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

/**
 * Глубокая фильтрация объекта клиента (Application):
 * Возвращает новый объект Application только с теми заказами (orders), 
 * которые соответствуют выбранным менеджерам и видам деятельности.
 * Автоматически пересчитывает count, totalWeight, totalQuantity.
 * Возвращает null, если ни один заказ не подошел.
 */
export function filterApplication(
  app: ApplicationItem,
  selectedManagers: string[] = [],
  selectedLoBs: string[] = []
): ApplicationItem | null {
  if (!app || !Array.isArray(app.orders)) return null;

  const matchedOrders = app.orders.filter(order => {
    // Проверка вида деятельности заказа
    const lobOk = matchesLoB(order.line_of_business, selectedLoBs);
    if (!lobOk) return false;

    // Проверка менеджера (по адресу клиента или по менеджеру в самом заказе)
    const managerOk = matchesManager([app.address?.manager, order.manager], selectedManagers);
    if (!managerOk) return false;

    return true;
  });

  if (matchedOrders.length === 0) return null;

  // Динамический пересчет агрегированных метрик для отфильтрованного списка заказов
  const uniqueContracts = new Set<string>();
  let totalQuantity = 0;
  let totalWeight = 0;

  matchedOrders.forEach(order => {
    if (order.contract_supplement) {
      uniqueContracts.add(cleanString(order.contract_supplement));
    }

    if (order.different !== undefined && order.different !== null) {
      const qty = typeof order.different === 'number' ? order.different : parseFloat(String(order.different));
      if (!isNaN(qty)) totalQuantity += qty;
    }

    if (order.total_weight !== undefined && order.total_weight !== null) {
      const w = typeof order.total_weight === 'number' ? order.total_weight : parseFloat(String(order.total_weight));
      if (!isNaN(w)) totalWeight += w;
    }
  });

  return {
    ...app,
    orders: matchedOrders,
    count: uniqueContracts.size > 0 ? uniqueContracts.size : matchedOrders.length,
    totalQuantity: Math.round(totalQuantity * 100) / 100,
    totalWeight: Math.round(totalWeight * 100) / 100,
  };
}

/**
 * Групповая фильтрация списка заявок
 */
export function filterApplicationsList(
  applications: ApplicationItem[],
  selectedManagers: string[] = [],
  selectedLoBs: string[] = []
): ApplicationItem[] {
  if (!Array.isArray(applications)) return [];
  
  const result: ApplicationItem[] = [];
  applications.forEach(app => {
    const filtered = filterApplication(app, selectedManagers, selectedLoBs);
    if (filtered) {
      result.push(filtered);
    }
  });

  return result;
}

/**
 * Получение списка всех доступных видов деятельности 
 * с учетом выбранных менеджеров
 */
export function getAvailableLoBs(
  applications: ApplicationItem[],
  unmappedApplications: ApplicationItem[],
  selectedManagers: string[] = []
): string[] {
  const lobs = new Set<string>();

  const processApps = (apps: ApplicationItem[]) => {
    if (!Array.isArray(apps)) return;
    apps.forEach(app => {
      if (!Array.isArray(app.orders)) return;
      app.orders.forEach(order => {
        const managerOk = matchesManager([app.address?.manager, order.manager], selectedManagers);
        if (managerOk && order.line_of_business) {
          const cleanLob = cleanString(order.line_of_business);
          if (cleanLob) {
            lobs.add(cleanLob);
          }
        }
      });
    });
  };

  processApps(applications);
  processApps(unmappedApplications);

  return Array.from(lobs).sort((a, b) => a.localeCompare(b, 'uk'));
}

/**
 * Фильтрация доставок по статусу, менеджеру, дате и виду деятельности
 */
export function filterDelivery(
  delivery: DeliveryItem | null | undefined,
  selectedStatuses: string[] = [],
  selectedManagers: string[] = [],
  selectedDates: string[] = [],
  selectedLoBs: string[] = [],
  allApplications?: ApplicationItem[]
): boolean {
  if (!delivery) return false;

  // 1. Статус
  if (Array.isArray(selectedStatuses) && selectedStatuses.length > 0) {
    if (!selectedStatuses.some(s => normalizeString(s) === normalizeString(delivery.status))) {
      return false;
    }
  }

  // 2. Менеджер
  if (Array.isArray(selectedManagers) && selectedManagers.length > 0) {
    if (!matchesManager([delivery.manager], selectedManagers)) {
      return false;
    }
  }

  // 3. Дата
  if (Array.isArray(selectedDates) && selectedDates.length > 0) {
    const deliveryDate = delivery.delivery_date || "Без дати";
    if (!selectedDates.includes(deliveryDate)) {
      return false;
    }
  }

  // 4. Вид деятельности
  if (Array.isArray(selectedLoBs) && selectedLoBs.length > 0) {
    // Проверка 1: Прямое поле line_of_business у доставки или ее позиций
    if (delivery.line_of_business && matchesLoB(delivery.line_of_business, selectedLoBs)) {
      return true;
    }
    if (Array.isArray(delivery.items) && delivery.items.some(i => matchesLoB(i.line_of_business, selectedLoBs))) {
      return true;
    }
    if (Array.isArray(delivery.orders) && delivery.orders.some(o => matchesLoB(o.line_of_business, selectedLoBs))) {
      return true;
    }

    // Fallback removed to ensure strict LoB filtering based on mapped DB records

    return false;
  }

  return true;
}
