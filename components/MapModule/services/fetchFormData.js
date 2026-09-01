import { getInitData } from "@/lib/getInitData";
import axios from "axios";

export const fetchClientsList = async () => {
    const initData = getInitData();
    try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_URL_API}/get_all_addresses`, {
            headers: {
                "Content-Type": "application/json",
                ...(initData ? { "X-Telegram-Init-Data": initData } : {}),
            },
        }); 
        if (Array.isArray(response.data) && response.data.length > 0) {
            return response.data;
        }
    } catch (error) {
        console.warn("Could not fetch from /get_all_addresses, trying fallback:", error);
    }

    // Fallback: fetch from /get_all_orders_and_address
    try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_URL_API}/get_all_orders_and_address`);
        if (Array.isArray(response.data) && response.data.length >= 2) {
            const [, addresses] = response.data;
            if (Array.isArray(addresses)) {
                return addresses;
            }
        }
    } catch (err) {
        console.error("Error fetching clients list in fallback:", err);
    }

    return [];
};

