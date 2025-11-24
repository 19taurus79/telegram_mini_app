import axios from "axios";

export default async function fetchGeocode(address) {
  console.log("Fetching geocode for address:", address);
  try {
    const response = await axios.get(`${process.env.NEXT_PUBLIC_URL_API}/data/geocode`, {
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
