export interface DeliveryLike {
  id?: number | string;
  status?: string | null;
  address?: string | null;
  ttn?: string | null;
  target_warehouse?: string | null;
  comment?: string | null;
  [key: string]: unknown;
}

export const isNPDelivery = (d: DeliveryLike | null | undefined): boolean => {
  if (!d) return false;
  const statusLower = (d.status || "").toLowerCase();
  const addressLower = (d.address || "").toLowerCase();
  return (
    statusLower.includes("нова пошт") ||
    statusLower.includes("нп") ||
    statusLower === "потрібні дані нп" ||
    addressLower.includes("нова пошт") ||
    addressLower.includes("відділення") ||
    addressLower.includes("поштомат") ||
    Boolean(d.ttn && String(d.ttn).trim() !== "")
  );
};

export const isCODelivery = (d: DeliveryLike | null | undefined): boolean => {
  if (!d) return false;
  if (d.isCO === true) return true;
  const statusLower = (d.status || "").toLowerCase();
  return statusLower.includes("цо") || statusLower.includes("центральн");
};

export const isWarehouseDelivery = (d: DeliveryLike | null | undefined): boolean => {
  if (!d) return false;
  const statusLower = (d.status || "").toLowerCase();
  const addressLower = (d.address || "").toLowerCase();
  const commentLower = (typeof d.comment === "string" ? d.comment : "").toLowerCase();
  return (
    statusLower.includes("доставка на склад") ||
    statusLower.includes("склад") ||
    Boolean(d.target_warehouse) ||
    addressLower.startsWith("склад:") ||
    addressLower === "на розсуд логіста" ||
    commentLower.startsWith("доставка на склад:")
  );
};

