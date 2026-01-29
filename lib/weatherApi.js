import axios from 'axios';

const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

const DEFAULT_LAT = -34.6037;
const DEFAULT_LON = -58.3816;

export const weatherApi = {
    getCurrentWeather: async (lat = DEFAULT_LAT, lon = DEFAULT_LON) => {
        const response = await axios.get(`${BASE_URL}/weather`, {
            params: {
                lat,
                lon,
                appid: API_KEY,
                units: 'metric',
                lang: 'es'
            }
        });
        return response.data;
    },

    getForecast: async (lat = DEFAULT_LAT, lon = DEFAULT_LON) => {
        const response = await axios.get(`${BASE_URL}/forecast`, {
            params: {
                lat,
                lon,
                appid: API_KEY,
                units: 'metric',
                lang: 'es'
            }
        });
        return response.data;
    }
};