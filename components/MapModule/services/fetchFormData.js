import { getClients } from "@/lib/api";

export const fetchClientsList = async () => {
    try {
        const data = await getClients(null);
        return data;
    } catch (error) {
        console.error("Error fetching clients list:", error);
        return [];
    }
};
