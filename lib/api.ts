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
  Remains,
  TotalOrder,
} from "@/types/types";
import axios from "axios";

declare global {
  interface Window {
    Telegram: {
      WebApp: {
        initData: string;
      };
    };
  }
}

const initData = window.Telegram.WebApp.initData;
const url = process.env.NEXT_PUBLIC_URL_API;
axios.defaults.baseURL = url;

export const getRemainsById = async ({ productId }: { productId: string }) => {
  const { data } = await axios.get<Remains[]>(`/data/remains/${productId}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": initData,
    },
  });
  console.log(data);
  return data;
};
export const getGroupRemainsById = async ({
  productId,
}: {
  productId: string;
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
  console.log(data);
  return data;
};
export const getAvRemainsById = async ({
  productId,
}: {
  productId: string;
}) => {
  const { data } = await axios.get<AvRemains[]>(`/data/av_stock/${productId}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": initData,
    },
  });
  console.log(data);
  return data;
};

export const getProductOnWarehouse = async ({
  group,
  searchValue,
}: {
  group: string | null;
  searchValue: string | null;
}) => {
  const { data } = await axios.get<Product[]>("/data/product_on_warehouse", {
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

export const getOrders = async ({ client }: { client: string }) => {
  const { data } = await axios.get<Order[]>(`/data/orders/${client}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": initData,
    },
    params: {
      client: client,
    },
  });
  console.log(data);
  return data;
};

export const getClients = async ({
  searchValue,
}: {
  searchValue: string | null;
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

export const getContracts = async ({ client }: { client: string }) => {
  const { data } = await axios.get<Contract[]>(`/data/contracts/${client}`, {
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
}: {
  contract: string;
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

export const sendDeliveryData = async (payload: DeliveryPayload) => {
  const { data } = await axios.post<{ status: string }>(
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

export const getTotalSumOrderByProduct = async ({
  product,
}: {
  product: string;
}) => {
  const { data } = await axios.get<TotalOrder[]>(
    `/data/sum_order_by_product/${product}`,
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

export const getOrdersByProduct = async ({ product }: { product: string }) => {
  const { data } = await axios.get<Order[]>(
    `/data/order_by_product/${product}`,
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
}: {
  product: string;
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
}: {
  group: string | null;
  searchValue: string | null;
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

export const getEnoughRemains = async () => {
  const { data } = await axios.get("/data/products_for_all_orders", {
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": initData,
    },
  });
  return data;
};

export const getMovedData = async ({ order }: { order: string }) => {
  const { data } = await axios.get(`/data/moved_products_for_order/${order}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": initData,
    },
    params: {
      order: order,
    },
  });
  return data;
};

export const getPartyData = async ({ party }: { party: string }) => {
  console.log("party", party);
  const { data } = await axios.get<PartyData[]>(`/data/party_data`, {
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

export const getIdRemainsByParty = async ({ party }: { party: string }) => {
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
}: {
  orderId: string;
}) => {
  const { data } = await axios.get<OrdersDetails[]>(
    `/data/details_for_orders/${orderId}`,
    {
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": initData,
      },
      params: {
        orderId: orderId,
      },
    }
  );
  return data;
};
