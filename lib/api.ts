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
  ApiResponse,
  // TaskGoogle,
  TotalOrder,
  Event,
  User,
  TaskStatus,
  InnerEvent,
  TaskInner,
  TaskGoogle,
  BiRemains,
  BiOrders,
  FiltersState, MovedData, DeliveryRequest, ClientAddress,
  OrderComment,
  CreateOrderCommentPayload,
  ChatMessage,
  CreateChatMessagePayload,
  UpdateChatMessagePayload
} from "@/types/types";
import axios from "axios";

const url = process.env.NEXT_PUBLIC_URL_API;
axios.defaults.baseURL = url;

export const getRemainsById = async ({
  productId,
  initData,
}: {
  productId: string;
  initData: string;
}) => {
  const { data } = await axios.get<Remains[]>(`/data/remains/${productId}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": initData,
    },
  });
  return data;
};

export const getRemainsByProduct = async ({
  product,
  initData,
}: {
  product: string;
  initData: string;
}) => {
  const { data } = await axios.get<Remains[]>(`/data/remains_by_product`, {
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": initData,
    },
    params: {
      product: product,
    },
  });
  return data;
};
export const getGroupRemainsById = async ({
  productId,
  initData,
}: {
  productId: string;
  initData: string;
}) => {
  const { data } = await axios.get<GroupRemains[]>(
    `/data/remains_group/${productId}`,
    {
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": initData,
      },
    }
  );
  return data;
};
export const getAvRemainsById = async ({
  productId,
  initData,
}: {
  productId: string;
  initData: string;
}) => {
  const { data } = await axios.get<AvRemains[]>(`/data/av_stock/${productId}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": initData,
    },
  });
  return data;
};

export const getProductOnWarehouse = async ({
  group,
  parentGroup,
  searchValue,
  initData,
}: {
  group: string | null;
  parentGroup?: string | null;
  searchValue: string | null;
  initData: string;
}) => {
  const { data } = await axios.get<Product[]>("/data/product_on_warehouse", {
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": initData,
    },
    params: {
      category: group,
      parent_category: parentGroup,
      name_part: searchValue,
    },
  });
  return data;
};

export const getOrders = async ({
  client,
  initData,
}: {
  client: string;
  initData: string;
}) => {
  const { data } = await axios.get<Order[]>(`/data/orders`, {
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": initData,
    },
    params: {
      client: client,
    },
  });
  return data;
};

export const getClients = async ({
  searchValue,
  initData,
}: {
  searchValue: string | null;
  initData: string;
}) => {
  const { data } = await axios.get<Client[]>("/data/clients", {
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": initData,
    },
    params: {
      name_part: searchValue,
    },
  });
  return data;
};

export const getContracts = async ({
  client,
  initData,
}: {
  client: number;
  initData: string;
}) => {
  const { data } = await axios.get<Contract[]>(`/data/contracts`, {
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": initData,
    },
    params: {
      client: client,
    },
  });
  return data;
};

export const getContractDetails = async ({
  contract,
  initData,
}: {
  contract: string;
  initData: string;
}) => {
  const { data } = await axios.get<ContractDetails[]>(
    `/data/contract_detail/${contract}`,
    {
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": initData,
      },
      params: {
        contract: contract,
      },
    }
  );
  return data;
};

export const sendDeliveryData = async (
  payload: DeliveryPayload,
  initData: string
) => {
  const { data } = await axios.post<ApiResponse>(
    "/delivery/send",
    payload,
    {
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": initData,
      },
    }
  );

  return data;
};

export const updateDeliveryData = async (
  deliveryId: string,
  status: string,
  items: DeliveryUpdateItem[],
  totalWeight: number,
  initData: string,
  actorName: string = ""
) => {
  const { data } = await axios.post<ApiResponse>(
    "/delivery/update",
    {
       delivery_id: deliveryId,
       status: status,
       total_weight: totalWeight, 
       items: items,
       actor_name: actorName
    },
    {
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": initData,
      },
    }
  );

  return data;
};

export const changeDeliveryDate = async (
  deliveryId: string,
  newDate: string,
  initData: string
) => {
  const { data } = await axios.post<{ status: string; message: string }>(
    "/delivery/change_date",
    {
      delivery_id: deliveryId,
      new_date: newDate,
    },
    {
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": initData,
      },
    }
  );

  return data;
};

export const batchUpdateDeliveries = async (
  deliveryIds: number[],
  status: string | null,
  newDate: string | null,
  initData: string
) => {
  const { data } = await axios.post<{ status: string; message: string }>(
    "/delivery/batch_update",
    {
      delivery_ids: deliveryIds,
      status: status,
      new_date: newDate,
    },
    {
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": initData,
      },
    }
  );

  return data;
};

export const deleteDeliveryData = async (deliveryId: string, initData: string) => {
  const { data } = await axios.delete<{ status: string }>(
    "/delivery/delete",
    {
      data: { delivery_id: deliveryId },
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": initData,
      },
    }
  );
  return data;
};

export const getTotalSumOrderByProduct = async ({
  product,
  initData,
}: {
  product: string;
  initData: string;
}) => {
  const { data } = await axios.get<TotalOrder[]>(
    `/data/sum_order_by_product`,
    {
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": initData,
      },
      params: {
        product: product,
      },
    }
  );
  return data;
};

export const getOrdersTiersByProduct = async ({
  product,
  initData,
}: {
  product: string;
  initData: string;
}) => {
  const { data } = await axios.get<{
    product_id: string;
    orders_q: number;
    orders_q_product_confirmed: number;
    orders_q_total: number;
  }>(`/data/sum_orders_tiers_by_product`, {
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": initData,
    },
    params: { product },
  });
  return data;
};

export const getOrdersByProduct = async ({
  product,
  initData,
}: {
  product: string;
  initData: string;
}) => {
  const { data } = await axios.get<Order[]>(
    `/data/order_by_product`,
    {
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": initData,
      },
      params: {
        product: product,
      },
    }
  );
  return data;
};

export const getProductDetailsById = async ({
  product,
  initData,
}: {
  product: string;
  initData: string;
}) => {
  const { data } = await axios.get<Product>(`/data/product/${product}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": initData,
    },
    params: {
      product: product,
    },
  });
  return data;
};
export const getAllProduct = async ({
  group,
  searchValue,
  initData,
}: {
  group: string | null;
  searchValue: string | null;
  initData: string;
}) => {
  const { data } = await axios.get<Product[]>("/data/products", {
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": initData,
    },
    params: {
      category: group,
      name_part: searchValue,
    },
  });
  return data;
};

export const getAllProductByGuide = async ({
                                      group,
                                      parentGroup,
                                      searchValue,
                                      initData,
                                    }: {
  group: string | null;
  parentGroup?: string | null;
  searchValue: string | null;
  initData: string;
}) => {
  const { data } = await axios.get<Product[]>("/data/all_products", {
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": initData,
    },
    params: {
      category: group,
      parent_category: parentGroup,
      name_part: searchValue,
    },
  });
  return data;
};

export const getCategoryTree = async (initData: string) => {
  const { data } = await axios.get<{line_of_business: string, parent_element: string}[]>("/data/categories_tree", {
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": initData,
    },
  });
  return data;
};

export const getPartyData = async ({
  party,
  id,
  initData,
}: {
  party?: string;
  id?: string;
  initData: string;
}) => {
  // console.log("party", party);
  const { data } = await axios.get<PartyData[]>(`/data/party_data`, {
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": initData,
    },
    params: {
      party: party,
      id: id,
    },
  });
  return data;
};

export const getIdRemainsByParty = async ({
  party,
  initData,
}: {
  party: string;
  initData: string;
}) => {
  const { data } = await axios.get(`/data/id_in_remains`, {
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": initData,
    },
    params: {
      party: party,
    },
  });
  return data;
};

export const getOrdersDetailsById = async ({
  orderId,
  initData,
}: {
  orderId: string | string[];
  initData: string;
}) => {
  const isBatch = Array.isArray(orderId);
  const config = {
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": initData,
    },
  };

  if (isBatch) {
    const { data } = await axios.post<OrdersDetails[]>(
      "/data/details_for_orders/batch",
      orderId,
      config
    );
    return data;
  } else {
    const { data } = await axios.get<OrdersDetails[]>(
      `/data/details_for_orders/${orderId}`,
      config
    );
    return data;
  }
};

export const getMovedDataByProduct = async ({
  productId,
  initData,
}: {
  productId: string;
  initData: string;
}) => {
  const { data } = await axios.get<MovedData[]>(
    `/data/moved_products`,
    {
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": initData,
      },
      params: {
        product_id: productId,
      },
    }
  );
  return data;
};

export const getAllTasks = async (initData: string) => {
  const { data } = await axios.get<TaskInner[]>("/data/get_all_tasks", {
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": initData,
    },
  });
  return data;
};

export const getEvents = async () => {
  const { data } = await axios.get<Event[]>("/data/calendar_events");
  return data;
};

export const getEventById = async (eventId: string) => {
  const { data } = await axios.get<Event>(`/data/calendar_event_by_id`, {
    params: {
      id: eventId,
    },
  });
  return data;
};

export const getEventByUser = async (initData: string) => {
  const { data } = await axios.get<InnerEvent[]>(
    "/data/calendar_events_by_user",
    {
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": initData,
      },
    }
  );
  return data;
};

export const getTaskById = async (taskId: string) => {
  const { data } = await axios.get<TaskGoogle>(`/data/get_task/`, {
    params: {
      task_id: taskId,
    },
  });
  return data;
};

export const getDeliveryByTask = async (taskId: string) => {
  const { data } = await axios.get<{
    found: boolean;
    order_ref?: string;
    message?: string;
    delivery?: {
      id: number;
      client: string;
      manager: string;
      address: string;
      contact: string;
      phone: string;
      delivery_date: string | null;
      comment: string;
      total_weight: number;
      status: string;
    };
    items?: {
      id: number;
      delivery: number;
      order_ref: string;
      product: string;
      quantity: number;
      party: string | null;
      party_quantity: number | null;
    }[];
  }>(`/data/get_delivery_by_task`, {
    params: {
      task_id: taskId,
    },
  });
  return data;
};

export const getDeliveryByEvent = async (eventId: string) => {
  const { data } = await axios.get<{
    found: boolean;
    message?: string;
    delivery?: {
      id: number;
      client: string;
      manager: string;
      address: string;
      contact: string;
      phone: string;
      delivery_date: string | null;
      comment: string;
      total_weight: number;
      status: string;
    };
    items?: {
      id: number;
      delivery: number;
      order_ref: string;
      product: string;
      quantity: number;
      party: string | null;
      party_quantity: number | null;
    }[];
  }>(`/data/get_delivery_by_event`, {
    params: {
      event_id: eventId,
    },
  });
  return data;
};

export const checkTaskInProgress = async (taskId: string, initData: string) => {
  const { data } = await axios.patch(
    `/data/task_in_progress`,
    {
      tasks_status: 1,
    },
    {
      params: {
        task_id: taskId,
      },
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": initData,
      },
    }
  );

  return data;
};

export const checkEventInProgress = async (
  eventId: string,
  initData: string
) => {
  const { data } = await axios.patch(
    `/data/event_in_progress`,
    {
      events_status: 1,
    },
    {
      params: {
        event_id: eventId,
      },
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": initData,
      },
    }
  );

  return data;
};
export const checkTaskCompleted = async (taskId: string, initData: string, solution: string) => {
  const { data } = await axios.patch(
    `/data/task_completed`,
    {
      tasks_status: 2,
      solution,
    },
    {
      params: {
        task_id: taskId,
      },
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": initData,
      },
    }
  );

  return data;
};

export const checkEventCompleted = async (
  eventId: string,
  initData: string
) => {
  const { data } = await axios.patch(
    `/data/event_completed`,
    {
      events_status: 2,
    },
    {
      params: {
        event_id: eventId,
      },
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": initData,
      },
    }
  );

  return data;
};
export const chengedEventDate = async (
  eventId: string,
  initData: string,
  date: string
) => {
  const { data } = await axios.patch(
    `/data/event_changed_date`,
    {
      new_date: date,
    },
    {
      params: {
        event_id: eventId,
      },
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": initData,
      },
    }
  );

  return data;
};

export const getTaskStatus = async (task_id: string) => {
  const { data } = await axios.get<TaskStatus>("/data/get_task_status", {
    params: {
      task_id: task_id,
    },
  });
  if (!data) {
    return {
      id: "",
      task_id: task_id,
      task_status: 0,
      task_creator: null,
      task_creator_name: null,
      task_who_changed_id: null,
      task_who_changed_name: null,
    };
  }
  return data;
};

export const getUserByinitData = async (initData: string) => {
  const { data } = await axios.get<User>("/get_user", {
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": initData,
    },
  });
  return data;
};

export const loginWithTelegramWidget = async (
  user: import("@/types/types").TelegramWidgetUser
): Promise<{ init_data: string }> => {
  const { data } = await axios.post<{ init_data: string }>(
    "/auth/login-widget",
    user
  );
  return data;
};

export const generateLoginToken = async (): Promise<{
  token: string;
  deep_link: string;
  web_link: string;
  expires_in: number;
}> => {
  const { data } = await axios.post("/auth/generate-login-token");
  return data;
};

export const checkLoginToken = async (
  token: string
): Promise<{
  status: "pending" | "confirmed" | "expired" | "not_found" | "forbidden";
  init_data?: string;
}> => {
  const { data } = await axios.get(`/auth/check-login-token/${token}`);
  return data;
};

export const createTask = async (
  initData: string,
  title: string,
  note: string
) => {
  const { data } = await axios.post<TaskInner>(
    "/data/add_task",
    {
      title: title,
      note: note,
    },
    {
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": initData,
      },
    }
  );
  return data;
};

export const getRemainsForBi = async () => {
  const { data } = await axios.get<BiRemains>("/api/remains");
  return data;
};

export const getAddressByClient = async (client: string)=>{
  const { data }=await axios.get<ClientAddress[]>(`/get_address_by_client/${client}`);
  return data;
};

export const dataForOrderByProduct = async (filters?: FiltersState) => {
  const params = new URLSearchParams();

  if (filters?.document_status && filters.document_status.length > 0) {
    filters.document_status.forEach((status: string) => {
      params.append("document_status", status);
    });
  }

  if (filters?.delivery_status && filters.delivery_status.length > 0) {
    filters.delivery_status.forEach((status: string) => {
      params.append("order_status", status);
    });
  }

  const { data } = await axios.get<BiOrders>("/api/combined", {
    params,
  });

  return data;
};

export const createClientAddress = async ({
  clientData,
  initData,
}: {
  clientData: {
    client: string;
    manager: string;
    representative: string;
    phone1: string;
    phone2?: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  initData: string;
}) => {
  const { data } = await axios.post(
    `/add_address_for_client`,
    clientData,
    {
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": initData,
      },
    }
  );
  return data;
};

export const updateClientAddress = async ({
  id,
  clientData,
  initData,
}: {
  id: number;
  clientData: {
    client: string;
    manager: string;
    representative: string;
    phone1: string;
    phone2?: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  initData: string;
}) => {
  const { data } = await axios.put(
    `/update_address_for_client/${id}`,
    clientData,
    {
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": initData,
      },
    }
  );
  return data;
};

export const getDeliveries = async (initData: string) => {
  const { data } = await axios.get<DeliveryRequest[]>("/delivery/get_data_for_delivery", {
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": initData,
    },
  });
  return data;
};

const parseWeight = (weightStr: string | number | null | undefined): number => {
  if (typeof weightStr === "number") return weightStr;
  if (!weightStr || typeof weightStr !== "string") return 0;
  const cleaned = weightStr.replace(/[^0-9.,]/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
};

export const getWeightForProduct = async ({
  item,
  initData,
}: { item: WeightCalculationItem,
  initData: string;
}) => {
  let calculatedWeight = 0;

  try {
    let lineOfBusiness = "";
    
    try {
        if (item.product_id && item.product_id !== 'undefined') {
            const productDetails = await getProductDetailsById({ product: item.product_id, initData });
            if (productDetails) {
                lineOfBusiness = productDetails.line_of_business;
            }
        }
    } catch (e) {
        console.warn("Could not fetch product details for weight calc", e);
    }

    const isSeed = ["Насіння", "Власне виробництво насіння"].includes(
      lineOfBusiness
    );

    const firstSpecificParty = item.parties?.find((p) => p.party);
    
    if (firstSpecificParty) {
      const partyData = await getPartyData({
        party: firstSpecificParty.party,
        initData,
      });
      if (partyData && partyData.length > 0) {
        calculatedWeight = parseWeight(partyData[0].weight);
        if (calculatedWeight > 0) return calculatedWeight;
      }
    }

    const isValidProductId = item.product_id && item.product_id !== 'undefined' && item.product_id !== 'null';

    if (isSeed && isValidProductId) {
      const remains = await getRemainsById({ productId: item.product_id, initData });
      if (remains && remains.length > 0) {
        const weights = remains
          .map((r) => parseWeight(r.weight))
          .filter((w) => w > 0);
        
        if (weights.length > 0) {
           const sum = weights.reduce((a, b) => a + b, 0);
           calculatedWeight = sum / weights.length;
           if (calculatedWeight > 0) return calculatedWeight;
        }
      }
    } else if (isValidProductId) {
       const remains = await getRemainsById({ productId: item.product_id, initData });
       if (remains && remains.length > 0) {
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

export const getTelegramIdByEventId = async (id:string)=>{
  const {data}=await axios.get(`/delivery/get_telegram_id_from_delivery_by_id/${id}`);
  return data;
}

export const sendTelegramMessage = async (
  telegramId: string,
  text: string,
  initData: string
) => {
  const { data } = await axios.post(
    "/send_telegram_message_by_event",
    {
      chat_id: telegramId,
      text: text,
    },
    {
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": initData,
      },
    }
  );
  return data;
};

// ============================================
// Order Comments API
// ============================================

// Створення коментаря для заявки або товару
export const createOrderComment = async (
  payload: CreateOrderCommentPayload,
  initData: string
) => {
  const { data } = await axios.post<OrderComment>(
    '/orders/comments/create',
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': initData,
      },
    }
  );
  return data;
};

// Кеш для дедуплікації одночасних запитів
const commentsPromiseCache = new Map<string, Promise<OrderComment[]>>();

// Отримання коментарів для заявки
export const getOrderComments = async (
  orderRef: string | string[],
  productId?: string,
  initData?: string
) => {
  const isBatch = Array.isArray(orderRef);
  const cacheKey = `${isBatch ? orderRef.join(",") : orderRef}_${initData || ''}`;
  
  if (commentsPromiseCache.has(cacheKey)) {
    return commentsPromiseCache.get(cacheKey)!;
  }

  const config = {
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': initData || '',
    },
  };

  // Використовуємо POST для масивів (батчинг), щоб уникнути лімітів довжини URL
  const promise = isBatch 
    ? axios.post<OrderComment[]>('/orders/comments/list', orderRef, config).then(res => res.data)
    : axios.get<OrderComment[]>('/orders/comments/list', { ...config, params: { order_ref: orderRef } }).then(res => res.data);

  promise.finally(() => {
    setTimeout(() => commentsPromiseCache.delete(cacheKey), 2000); 
  });

  commentsPromiseCache.set(cacheKey, promise);
  return promise;
};

// Оновлення коментаря
export const updateOrderComment = async (
  commentId: string,
  commentText: string,
  initData: string
) => {
  const { data } = await axios.put<OrderComment>(
    `/orders/comments/${commentId}`,
    { comment_text: commentText },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': initData,
      },
    }
  );
  return data;
};

// Видалення коментаря
export const deleteOrderComment = async (
  commentId: string,
  initData: string
) => {
  await axios.delete(
    `/orders/comments/${commentId}`,
    {
      headers: {
        'X-Telegram-Init-Data': initData,
      },
    }
  );
};

// ============= CHAT API =============

// Отримання повідомлень чату для заявки
export const getChatMessages = async (
  orderRef: string,
  initData: string
): Promise<ChatMessage[]> => {
  const { data } = await axios.get<ChatMessage[]>(
    `/orders/${orderRef}/chat/messages`,
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': initData,
      },
    }
  );
  return data;
};

// Створення повідомлення в чаті
export const createChatMessage = async (
  payload: CreateChatMessagePayload,
  initData: string
): Promise<ChatMessage> => {
  const { data } = await axios.post<ChatMessage>(
    `/orders/${payload.order_ref}/chat/messages`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': initData,
      },
    }
  );
  return data;
};

// Редагування повідомлення
export const updateChatMessage = async (
  orderRef: string,
  messageId: string,
  payload: UpdateChatMessagePayload,
  initData: string
): Promise<ChatMessage> => {
  const { data } = await axios.put<ChatMessage>(
    `/orders/${orderRef}/chat/messages/${messageId}`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': initData,
      },
    }
  );
  return data;
};

// Видалення повідомлення
export const deleteChatMessage = async (
  orderRef: string,
  messageId: string,
  initData: string
): Promise<void> => {
  await axios.delete(
    `/orders/${orderRef}/chat/messages/${messageId}`,
    {
      headers: {
        'X-Telegram-Init-Data': initData,
      },
    }
  );
};

// Відправка Telegram сповіщення про нове повідомлення
export const sendChatNotification = async (
  orderRef: string,
  messageId: string,
  initData: string
): Promise<void> => {
  await axios.post(
    `/orders/${orderRef}/chat/messages/${messageId}/notify`,
    {},
    {
      headers: {
        'X-Telegram-Init-Data': initData,
      },
    }
  );
};

// --- Nova Poshta API ---

export interface NPCity {
  present: string;
  main_description: string;
  area: string;
  region: string;
  settlement_ref: string;
  ref: string;
}

export interface NPWarehouse {
  description: string;
  ref: string;
  number: string;
  type_ref: string;
  post_machine: boolean;
}

export interface NPStreet {
  ref: string;
  description: string;
  street_type: string;
}

export interface NPCounterparty {
  Description: string;
  Ref: string;
  EDRPOU: string;
}

export interface NPResponse<T> {
  success: boolean;
  data: T;
  errors?: string[];
}

export const getNPCities = async (q: string, initData: string): Promise<NPResponse<NPCity[]>> => {
  const { data } = await axios.get<NPResponse<NPCity[]>>(`/nova-poshta/cities`, {
    params: { q },
    headers: { 'X-Telegram-Init-Data': initData }
  });
  return data;
};

export const getNPWarehouses = async (cityRef: string, initData: string, q?: string, typeRef?: string): Promise<NPResponse<NPWarehouse[]>> => {
  const { data } = await axios.get<NPResponse<NPWarehouse[]>>(`/nova-poshta/warehouses`, {
    params: { city_ref: cityRef, q, type_ref: typeRef },
    headers: { 'X-Telegram-Init-Data': initData }
  });
  return data;
};

export const getNPStreets = async (cityRef: string, q: string, initData: string): Promise<NPResponse<NPStreet[]>> => {
  const { data } = await axios.get<NPResponse<NPStreet[]>>(`/nova-poshta/streets`, {
    params: { city_ref: cityRef, q },
    headers: { 'X-Telegram-Init-Data': initData }
  });
  return data;
};

export const getNPCounterparty = async (edrpou: string, initData: string): Promise<NPResponse<NPCounterparty[]>> => {
  const { data } = await axios.get<NPResponse<NPCounterparty[]>>(`/nova-poshta/counterparty`, {
    params: { edrpou },
    headers: { 'X-Telegram-Init-Data': initData }
  });
  return data;
};

export default axios;
