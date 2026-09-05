import axios from "axios";

// Local dev: relative "/api" goes through Vite's proxy to the backend on the same
// origin. Production (Render): frontend and backend are separate domains, so this
// needs the backend's full origin — set via VITE_API_URL at build time (same env
// var product image URLs use, kept as a plain origin with no "/api" suffix there).
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api",
  withCredentials: true,
});

axiosClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const message = error.response?.data?.message || error.message || "Something went wrong";
    return Promise.reject(Object.assign(error, { message }));
  }
);

export default axiosClient;
