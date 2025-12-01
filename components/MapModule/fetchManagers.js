import axios from "axios";

export const fetchManagers = async () => {
    try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_URL_API}/data/managers`);
        console.log(response.data);
        return response.data;
    } catch (error) {
        console.error("Error fetching managers:", error);
    }
};