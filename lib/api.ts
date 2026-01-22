import {
  AvRemains,
  Client,
  Contract,
  ContractDetails,
  DeliveryPayload,
  GroupRemains,
  Order,
  OrdersDetails,
  PartyData,
  Product,
  DeliveryUpdateItem,
  Remains,
  WeightCalculationItem,
  TotalOrder,
  Event,
  User,
  TaskStatus,
  InnerEvent,
  TaskInner,
  TaskGoogle,
  BiRemains,
  BiOrders,
  FiltersState, MovedData, DeliveryRequest, ClientAddress
} from "@/types/types";
import axios from "axios";
import { useInitData } from "@/store/InitData";
import { useAuthStore } from "@/store/Auth";

const url = process.env.NEXT_PUBLIC_URL_API;
const api = axios.create({
  baseURL: url,
  withCredentials: true,
});

// Создаем перехватчик запросов
api.interceptors.request.use(
  (config) => {
    // Не логируем в продакшене, чтобы не засорять консоль
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Axios Interceptor] Making request to: ${config.url}`);
    }

    let initData = useInitData.getState().initData;
    const accessToken = useAuthStore.getState().accessToken;

    // Резистентность к race condition: если в сторе еще нет, но в окне уже есть - берем из окна
    if (!initData && typeof window !== "undefined" && (window as any).Telegram?.WebApp?.initData) {
      initData = (window as any).Telegram.WebApp.initData;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Axios Interceptor] URL: ${config.url}, initData: ${initData ? 'PRESENT' : 'ABSENT'}, token: ${accessToken ? 'PRESENT' : 'ABSENT'}`);
    }

    if (initData) {
      config.headers["X-Telegram-Init-Data"] = initData;
    } else if (accessToken) {
      config.headers["Authorization"] = `Bearer ${accessToken}`;
    } else {
      if (process.env.NODE_ENV === 'development') console.log("[Axios Interceptor] No initData or accessToken found. Sending request without auth headers.");
    }
    
    config.headers["Content-Type"] = "application/json";

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const loginWithWidget = async (user: unknown) => {
  const { data } = await api.post<{ status: string; access_token: string; token_type: string; user: User }>(
    "/auth/login-widget",
    user
  );
  return data;
};

export const getRemainsById = async (productId: string) => {
  const { data } = await api.get<Remains[]>(`/data/remains/${productId}`);
  return data;
};

export const getRemainsByProduct = async (product: string) => {
  const { data } = await api.get<Remains[]>(`/data/remains_by_product/${encodeURIComponent(product)}`);
  return data;
};

export const getGroupRemainsById = async (productId: string) => {
  const { data } = await api.get<GroupRemains[]>(`/data/remains_group/${productId}`);
  return data;
};

export const getAvRemainsById = async (productId: string) => {
  const { data } = await api.get<AvRemains[]>(`/data/av_stock/${productId}`);
  return data;
};

export const getProductOnWarehouse = async (params: { group: string | null; searchValue: string | null; }) => {
  const { data } = await api.get<Product[]>("/data/product_on_warehouse", {
    params: {
      category: params.group,
      name_part: params.searchValue,
    },
  });
  return data;
};

export const getOrders = async (client: string) => {
  const { data } = await api.get<Order[]>(`/data/orders/${client}`, {
    params: { client },
  });
  return data;
};

export const getClients = async (searchValue: string | null) => {
  const { data } = await api.get<Client[]>("/data/clients", {
    params: { name_part: searchValue },
  });
  return data;
};

export const getContracts = async (client: number) => {
  const { data } = await api.get<Contract[]>(`/data/contracts/${client}`, {
    params: { client },
  });
  return data;
};

export const getContractDetails = async (contract: string) => {
  const { data } = await api.get<ContractDetails[]>(
    `/data/contract_detail/${contract}`,
    { params: { contract } }
  );
  return data;
};

export const sendDeliveryData = async (payload: DeliveryPayload) => {
  const { data } = await api.post<{ status: string }>("/delivery/send", payload);
  return data;
};

export const updateDeliveryData = async (deliveryId: string, status: string, items: DeliveryUpdateItem[]) => {
  const { data } = await api.post<{ status: string }>(
    "/delivery/update",
    { delivery_id: deliveryId, status, items }
  );
  return data;
};

export const getTotalSumOrderByProduct = async (product: string) => {
  const { data } = await api.get<TotalOrder[]>(
    `/data/sum_order_by_product/${product}`,
    { params: { product } }
  );
  return data;
};

export const getOrdersByProduct = async (product: string) => {
  const { data } = await api.get<Order[]>(
    `/data/order_by_product/${product}`,
    { params: { product } }
  );
  return data;
};

export const getProductDetailsById = async (product: string) => {
  const { data } = await api.get<Product>(`/data/product/${product}`, {
    params: { product },
  });
  return data;
};

export const getAllProduct = async (params: { group: string | null; searchValue: string | null; }) => {
  const { data } = await api.get<Product[]>("/data/products", {
    params: {
      category: params.group,
      name_part: params.searchValue,
    },
  });
  return data;
};

export const getAllProductByGuide = async (params: { group: string | null; searchValue: string | null; }) => {
  const { data } = await api.get<Product[]>("/data/all_products", {
    params: {
      category: params.group,
      name_part: params.searchValue,
    },
  });
  return data;
};

export const getPartyData = async (params: { party?: string; id?: string; }) => {
  const { data } = await api.get<PartyData[]>(`/data/party_data`, { params });
  return data;
};

export const getIdRemainsByParty = async (party: string) => {
  const { data } = await api.get(`/data/id_in_remains`, { params: { party } });
  return data;
};

export const getOrdersDetailsById = async (orderId: string) => {
  const { data } = await api.get<OrdersDetails[]>(
    `/data/details_for_orders/${orderId}`,
    { params: { orderId } }
  );
  return data;
};

export const getMovedDataByProduct = async (productId: string) => {
  const { data } = await api.get<MovedData[]>(`/data/moved_products/${productId}`);
  return data;
};

export const getAllTasks = async () => {
  const { data } = await api.get<TaskInner[]>("/data/get_all_tasks");
  return data;
};

export const getEvents = async () => {
  const { data } = await api.get<Event[]>("/data/calendar_events");
  return data;
};

export const getEventById = async (eventId: string) => {
  const { data } = await api.get<Event>(`/data/calendar_event_by_id`, {
    params: { id: eventId },
  });
  return data;
};

export const getEventByUser = async () => {
  const { data } = await api.get<InnerEvent[]>("/data/calendar_events_by_user");
  return data;
};

export const getTaskById = async (taskId: string) => {
  const { data } = await api.get<TaskGoogle>(`/data/get_task/`, {
    params: { task_id: taskId },
  });
  return data;
};

export const checkTaskInProgress = async (taskId: string) => {
  const { data } = await api.patch(`/data/task_in_progress`, { tasks_status: 1 }, { params: { task_id: taskId } });
  return data;
};

export const checkEventInProgress = async (eventId: string) => {
  const { data } = await api.patch(`/data/event_in_progress`, { events_status: 1 }, { params: { event_id: eventId } });
  return data;
};

export const checkTaskCompleted = async (taskId: string) => {
  const { data } = await api.patch(`/data/task_completed`, { tasks_status: 2 }, { params: { task_id: taskId } });
  return data;
};

export const checkEventCompleted = async (eventId: string) => {
  const { data } = await api.patch(`/data/event_completed`, { events_status: 2 }, { params: { event_id: eventId } });
  return data;
};

export const chengedEventDate = async (eventId: string, date: string) => {
  const { data } = await api.patch(`/data/event_changed_date`, { new_date: date }, { params: { event_id: eventId } });
  return data;
};

export const getTaskStatus = async (task_id: string) => {
  const { data } = await api.get<TaskStatus>("/data/get_task_status", {
    params: { task_id },
  });
  if (!data) {
    return { id: "", task_id, task_status: 0, task_creator: null, task_who_changed_id: null, task_who_changed_name: null };
  }
  return data;
};

export const getUser = async () => {
  const { data } = await api.get<User>("/get_user");
  return data;
};

export const createTask = async (title: string, note: string) => {
  const { data } = await api.post<TaskInner>("/data/add_task", { title, note });
  return data;
};

export const getRemainsForBi = async () => {
  const { data } = await api.get<BiRemains>("/api/remains");
  return data;
};

export const getAddressByClient = async (client: string) => {
  const { data } = await api.get<ClientAddress[]>(`/get_address_by_client/${client}`);
  return data;
};

export const dataForOrderByProduct = async (filters?: FiltersState) => {
  const params = new URLSearchParams();
  if (filters?.document_status?.length) {
    filters.document_status.forEach((status) => params.append("document_status", status));
  }
  if (filters?.delivery_status?.length) {
    filters.delivery_status.forEach((status) => params.append("order_status", status));
  }
  const { data } = await api.get<BiOrders>("/api/combined", { params });
  return data;
};

export const createClientAddress = async (clientData: Omit<ClientAddress, "id">) => {
  const { data } = await api.post(`/add_address_for_client`, clientData);
  return data;
};

export const updateClientAddress = async (id: number, clientData: Omit<ClientAddress, "id">) => {
  const { data } = await api.put(`/update_address_for_client/${id}`, clientData);
  return data;
};

export const getDeliveries = async () => {
  const { data } = await api.get<DeliveryRequest[]>("/delivery/get_data_for_delivery");
  return data;
};

const parseWeight = (weightStr: string | number | null | undefined): number => {
  if (typeof weightStr === "number") return weightStr;
  if (!weightStr || typeof weightStr !== "string") return 0;
  const cleaned = String(weightStr).replace(/[^0-9.,]/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
};

export const getWeightForProduct = async (item: WeightCalculationItem) => {
  let calculatedWeight = 0;
  try {
    let lineOfBusiness = "";
    if (item.product_id && item.product_id !== 'undefined') {
      const productDetails = await getProductDetailsById(item.product_id);
      if (productDetails) {
        lineOfBusiness = productDetails.line_of_business;
      }
    }

    const isSeed = ["Насіння", "Власне виробництво насіння"].includes(lineOfBusiness);
    const firstSpecificParty = item.parties?.find((p) => p.party);

    if (firstSpecificParty) {
      const partyData = await getPartyData({ party: firstSpecificParty.party });
      if (partyData?.length) {
        calculatedWeight = parseWeight(partyData[0].weight);
        if (calculatedWeight > 0) return calculatedWeight;
      }
    }

    const isValidProductId = item.product_id && item.product_id !== 'undefined' && item.product_id !== 'null';
    if (isSeed && isValidProductId) {
      const remains = await getRemainsById(item.product_id);
      if (remains?.length) {
        const weights = remains.map((r) => parseWeight(r.weight)).filter((w) => w > 0);
        if (weights.length > 0) {
          const sum = weights.reduce((a, b) => a + b, 0);
          calculatedWeight = sum / weights.length;
          if (calculatedWeight > 0) return calculatedWeight;
        }
      }
    } else if (isValidProductId) {
      const remains = await getRemainsById(item.product_id);
      if (remains?.length) {
        const validRemain = remains.find(r => parseWeight(r.weight) > 0);
        if (validRemain) {
          calculatedWeight = parseWeight(validRemain.weight);
          if (calculatedWeight > 0) return calculatedWeight;
        }
      }
    }
  } catch (error) {
    console.error("Error calculating weight:", error);
  }
  return calculatedWeight;
};

export const getTelegramIdByEventId = async (id: string) => {
  const { data } = await api.get(`/delivery/get_telegram_id_from_delivery_by_id/${id}`);
  return data;
};

export const sendTelegramMessage = async (telegramId: string, text: string) => {
  const { data } = await api.post("/send_telegram_message_by_event", {
    chat_id: telegramId,
    text: text,
  });
  return data;
};

export default api;
