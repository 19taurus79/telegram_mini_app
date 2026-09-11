export interface DeliveryLike {
  id?: number | string;
  status?: string | null;
  address?: string | null;
  ttn?: string | null;
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
