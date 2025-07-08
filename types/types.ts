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
