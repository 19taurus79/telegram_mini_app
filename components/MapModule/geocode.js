import api from "@/lib/api";

export default async function fetchGeocode(address) {
  console.log("Fetching geocode for address:", address);
  try {
    const response = await api.get("/data/geocode", {
      params: { address },
    });
    const data = response.data;

    console.log(data);
    return data;
  } catch (error) {
    console.error("Ошибка при получении геокода:", error);
    return {};
  }
}
