import { getInitData } from "@/lib/getInitData";
import axios from "axios";
const initData = getInitData();
export const fetchClientsList = async () => {
    try {
        // Placeholder endpoint - USER TO UPDATE
        const response = await axios.get(`${process.env.NEXT_PUBLIC_URL_API}/data/clients`,{
            headers: {
                "Content-Type": "application/json",
                "X-Telegram-Init-Data": initData,
            },
        }   ); 
        return response.data;
    } catch (error) {
        console.error("Error fetching clients list:", error);
        return [];
    }
};

