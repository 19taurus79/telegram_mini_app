import api from "@/lib/api";

export const fetchManagers = async () => {
    try {
        const response = await api.get("/data/managers");
        console.log(response.data);
        return response.data;
    } catch (error) {
        console.error("Error fetching managers:", error);
    }
};