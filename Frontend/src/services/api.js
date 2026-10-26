import axios from "axios";

// Production me live backend URL
const baseURL = import.meta.env.PROD
  ? "https://ai-expense-tracker-ndhf.onrender.com/api"
  : "http://localhost:5000/api";

const API = axios.create({
  baseURL,
});

// Har request me token automatically attach karo
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;