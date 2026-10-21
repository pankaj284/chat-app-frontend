import axios from 'axios';
import { API_URL } from './config';

export const api = axios.create({
    baseURL: API_URL,
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (userInfo?.token) {
        config.headers.Authorization = `Bearer ${userInfo.token}`;
    }
    return config;
});

export default api;

//1. create the axios function
//2. add baseURL to it
//3. create api.interceptors.request.use((config)=>{...})
//4. get the userInfo from the localStorage using getItem()
//5. check if userInfo.token present then addd to heder
//  config.headers.Authorization = `Bearer ${userInfo.token}`
//6 return the config
//7 export the api 