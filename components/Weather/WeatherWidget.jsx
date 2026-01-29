import React, { useEffect, useState } from 'react';
import { weatherApi } from '../../lib/weatherApi';
import CurrentWeather from './CurrentWeather';
import HourlyForecast from './HourlyForescast';
import styles from './WeatherWidget.module.css';

const WeatherWidget = () => {
    const [current, setCurrent] = useState(null);
    const [forecast, setForecast] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchWeather = async () => {
            try {
                setLoading(true);
                const [currentData, forecastData] = await Promise.all([
                    weatherApi.getCurrentWeather(),
                    weatherApi.getForecast()
                ]);
                setCurrent(currentData);
                setForecast(forecastData);
            } catch (err) {
                setError('Error al cargar el clima');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchWeather();
        // Update weather every 30 minutes
        const interval = setInterval(fetchWeather, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingSkeleton}></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.errorContainer}>
                {error}
            </div>
        );
    }

    return (
        <section className={styles.weatherContainer}>
            <h2 className={styles.sectionTitle}>Clima actual y pronóstico</h2>
            <div className={styles.contentWrapper}>
                <CurrentWeather data={current} />
                <HourlyForecast forecast={forecast} />
            </div>
        </section>
    );
};

export default WeatherWidget;