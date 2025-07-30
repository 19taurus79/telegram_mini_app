export type DeliveryItem = {
  product: string;
  quantity: number;
};

export type DeliveryOrder = {
  order: string;
  items: DeliveryItem[];
};

export type DeliveryPayload = {
  client: string;
  manager: string;
  address: string;
  contact: string;
  phone: string;
  date: string;
  orders: DeliveryOrder[];
};
export type Product = {
  id: string;
  product: string;
  line_of_business: string;
};
export type Remains = {
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
export type Client = {
  client: string;
};
export type TotalOrder = {
  product_id: string;
  total_orders: number;
};
export type Order = {
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
export type ContractDetails = {
  nomenclature: string;
  party_sign: string;
  buying_season: string;
  different: number;
  client: string;
  contract_supplement: string;
  manager: string;
  product: string;
};
export type Contract = {
  contract_supplement: string;
  line_of_business: string;
  document_status: string;
};
export type AvRemains = {
  id: string;
  nomenclature: string;
  party_sign: string;
  buying_season: string;
  division: string;
  line_of_business: string;
  available: number;
  product: string;
};
export type GroupRemains = {
  product_id: string;
  remains: number;
};
export type MergedData = {
  id: string;
  product: string;
  quantity: number;
  manager: string;
  order: string;
  client: string;
  product_id: string;
  total_orders: number;
  remains: number;
  [key: string]: unknown; // Позволяет добавлять любые другие поля
};

export type EnoughtRemains = {
  id: string;
  product: string;
  order_q: number;
  remain_q: number;
  enough: boolean;
};
export type MovedData = {
  id: string;
  product: string;
  contract: string;
  date: string;
  line_of_business: string;
  qt_order: string;
  qt_moved: string;
  party_sign: string;
  period: string;
  order: string;
  product_id: string;
};

export type PartyData = {
  crop_year: string;
  germination: string;
  mtn: string;
  origin_country: string;
  weight: string;
};
