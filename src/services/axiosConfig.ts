import axios from 'axios';

const instance = axios.create({
    baseURL: 'http://localhost:8099',
    withCredentials: true
});

export default instance;