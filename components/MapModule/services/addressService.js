// 1. Імпортуємо налаштований екземпляр axios з центрального файлу api.ts
import axios from "@/lib/api";

/**
 * Fetches the list of regions.
 * Expected response: [{ level_1_id: "...", name: "..." }, ...]
 */
export async function getRegions() {
  try {
    // 2. Використовуємо відносний шлях, оскільки baseURL вже налаштовано
    const response = await axios.get("/regions");
    return response.data;
  } catch (error) {
    console.error("Error fetching regions:", error);
    return [];
  }
}

/**
 * Searches for addresses within a specific region.
 * @param {string} query - The search text (min 3 chars).
 * @param {string} regionId - The ID of the region (level_1_id).
 */
export async function searchAddresses(query, regionId) {
  if (!query || query.length < 3 || !regionId) return [];
  
  try {
    // 2. Використовуємо відносний шлях
    const response = await axios.get("/addresses/search", {
      params: { q: query, region_id: regionId }
    });
    return response.data;
  } catch (error) {
    console.error("Error searching addresses:", error);
    return [];
  }
}
