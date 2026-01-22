import api from "@/lib/api";

export default async function fetchApplications() {
  try {
    const response = await api.get("/api/applications");
    return response.data;
  } catch (error) {
    console.error("Ошибка при получении заявок:", error);
    return [];
  }
}
