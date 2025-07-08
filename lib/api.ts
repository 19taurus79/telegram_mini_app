import { DeliveryPayload } from "@/types/types";
import axios from "axios";

type Product = {
  id: string;
  product: string;
  line_of_business: string;
};
type Remains = {
  id: string;
  line_of_business: string;
  warehouse: string;
  parent_element: string;
  nomenclature: string;
  party_sign: string;
  buying_season: string;
  nomenclature_series: string;
  mtn: string;
  origin_country: string;
  germination: string;
  crop_year: string;
  quantity_per_pallet: string;
  active_substance: string;
  certificate: string;
  certificate_start_date: string;
  certificate_end_date: string;
  buh: number;
  skl: number;
  weight: string;
  product: string;
};
type Client = {
  client: string;
};
type Order = {
  id: string;
  division: string;
  manager: string;
  company_group: string;
  client: string;
  contract_supplement: string;
  parent_element: string;
  manufacturer: string;
  active_ingredient: string;
  nomenclature: string;
  party_sign: string;
  buying_season: string;
  line_of_business: string;
  period: string;
  shipping_warehouse: string;
  document_status: string;
  delivery_status: string;
  shipping_address: string;
  transport: string;
  plan: number;
  fact: number;
  different: number;
  product: string;
};
type ContractDetails = {
  nomenclature: string;
  party_sign: string;
  buying_season: string;
  different: number;
  client: string;
  contract_supplement: string;
  manager: string;
};
type Contract = {
  contract_supplement: string;
};
const url = process.env.NEXT_PUBLIC_URL_API;
axios.defaults.baseURL = url;
const initData =
  "user=%7B%22id%22%3A548019148%2C%22first_name%22%3A%22%D0%A1%D0%B5%D1%80%D0%B3%D0%B5%D0%B9%22%2C%22last_name%22%3A%22%D0%9E%D0%BD%D0%B8%D1%89%D0%B5%D0%BD%D0%BA%D0%BE%22%2C%22username%22%3A%22OnyshchenkoSergey%22%2C%22language_code%22%3A%22uk%22%2C%22allows_write_to_pm%22%3Atrue%2C%22photo_url%22%3A%22https%3A%5C%2F%5C%2Ft.me%5C%2Fi%5C%2Fuserpic%5C%2F320%5C%2Fqf0qiya3lYZumE5ExiC55ONcmy-5vzP6pZzzBMV92vw.svg%22%7D&chat_instance=9026974921436034496&chat_type=sender&auth_date=1751632088&signature=TyIb2GetcJjiM0q6J_j7A96jE-eSUYg1lXdrRHdzWMbWbejXnfSI-QydPFnc0zefj5YJ5Mmu0bDqAw0MX92rAQ&hash=19ba35d7ff043b4defed0ebff44b420034c2231b4dc764789252a22c3c2b8bb6";
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
// type Product = {
//   product: string;
//   quantity: number;
// };

// type Order = {
//   order: string;
//   products: Product[];
// };
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
