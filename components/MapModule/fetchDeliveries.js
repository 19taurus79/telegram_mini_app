import axios from "axios";

export async function fetchAllDeliveries() {
  try {
    const response = await axios.get(`${process.env.NEXT_PUBLIC_URL_API}/delivery/get_data_for_delivery`);
    console.log('Deliveries received:', response.data.length, 'items');
    return response.data;
  } catch (error) {
    console.error("Ошибка при получении данных доставок:", error);
    return [];
  }
}
