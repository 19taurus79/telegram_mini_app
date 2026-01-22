import api from "@/lib/api";

export async function fetchAllDeliveries() {
  try {
    const response = await api.get("/delivery/get_data_for_delivery");
    console.log('Deliveries received:', response.data.length, 'items');
    return response.data;
  } catch (error) {
    console.error("Ошибка при получении данных доставок:", error);
    return [];
  }
}
