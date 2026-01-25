import axios from 'axios';
import { auth } from './utils/databaseAuth';

const getBaseUrl = () => {
    let url = import.meta.env.API_BASE_URL || 'http://localhost:5000/api';
    if (url.startsWith('https://') && !url.endsWith('/api') && !url.endsWith('/api/')) {
        url = url.endsWith('/') ? `${url}api` : `${url}/api`;
    }
    return url;
};

const api = axios.create({
    baseURL: getBaseUrl(),
});

// Add a request interceptor to include the Firebase token
api.interceptors.request.use(async (config) => {
    const user = auth.currentUser;
    if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;
