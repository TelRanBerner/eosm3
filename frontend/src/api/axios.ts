import axios from 'axios';

const api = axios.create({
    baseURL: 'https://eosm3-production.up.railway.app/api',
    withCredentials: true,
});

export default api;