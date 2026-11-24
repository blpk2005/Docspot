import axios from "axios";

export const BASE_URL =
    process.env.REACT_APP_API_URL ||
    (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
        ? window.location.origin
        : "http://localhost:5001");

export const API_URL = `${BASE_URL}/api`;

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = token;
    return config;
});

export default api;
