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

export type OrdersDetails = {
  id: string;
  nomenclature: string;
  party_sign: string;
  buying_season: string;
  different: number;
  client: string;
  contract_supplement: string;
  manager: string;
  product: string;
  orders_q: number;
  buh: number;
  skl: number;
  qok: boolean;
  parties: [
    {
      party: string;
      moved_q: number;
    },
  ];
  // party: string;
  // moved_q: number;
};
export type Task = {
  kind: string;
  id: string;
  etag: string;
  title: string;
  updated: string;
  selfLink: string;
  position: string;
  notes: string;
  status: string;
  due: string;
  links: [];
  webViewLink: string;
};
export type Event = {
  kind: string;
  etag: string;
  id: string;
  status: string;
  htmlLink: string;
  created: string;
  updated: string;
  summary: string;
  description: string;
  location: string;
  colorId: string;
  creator: {
    email: string;
  };
  organizer: {
    email: string;
    displayName: string;
    self: boolean;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  iCalUID: string;
  sequence: number;
  reminders: {
    useDefault: boolean;
  };
  eventType: string;
};

export type TaskStatus = {
  id: string;
  task_id: string;
  task_creator: number | null;
  task_status: number;
  task_who_changed_id: number | null;
  task_who_changed_name: string | null;
};
export type User = {
  telegram_id: number;
  username: string;
  first_name: string;
  last_name: string;
  is_allowed: boolean;
  registration_date: string;
  last_activity_date: string;
  is_admin: boolean;
  full_name_for_orders: string;
};

export type InnerEvent = {
  id: string;
  event_id: string;
  event_creator: number | null;
  event_status: number;
  event_who_changed_id: number | null;
  event_who_changed_name: string | null;
  created_at: string;
  updated_at: string;
  start_event: string;
  event: string;
};
export type DateWithTimeZone = {
  dateTime: string;
  timeZone: string;
};
