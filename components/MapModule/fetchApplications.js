import axios from "axios";

export default async function fetchApplications() {
  try {
    const response = await axios.get(`${process.env.NEXT_PUBLIC_URL_API}/api/applications`);
    return response.data;
  } catch (error) {
    console.error("Ошибка при получении заявок:", error);
    return [];
  }
}
