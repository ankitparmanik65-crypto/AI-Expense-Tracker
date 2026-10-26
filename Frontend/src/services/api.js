import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
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