import React from 'react';
import WeatherIcon from './WeatherIcon';
import styles from './WeatherWidget.module.css';

const CurrentWeather = ({ data }) => {
    if (!data?.main || !data?.weather || !data?.wind) return null;

    const {
        main: { temp, feels_like, humidity },
        weather: [{ description, icon }],
        wind: { speed }
    } = data;

    return (
        <div className={styles.currentWeatherCard}>
            <div className={styles.weatherHeader}>
                <div className={styles.weatherMainInfo}>
                    <div className={styles.temperature}>
                        {Math.round(temp)}°
                    </div>
                    <p className={styles.description}>{description}</p>
                </div>
                <div className={styles.weatherIconContainer}>
                    <WeatherIcon code={icon} />
                </div>
            </div>

            <div className={styles.weatherDetails}>
                <div className={styles.weatherDetailItem}>
                    <div className={styles.detailLabel}>
                        <svg className={styles.detailIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Sensación
                    </div>
                    <div className={styles.detailValue}>{Math.round(feels_like)}°</div>
                </div>
                <div className={styles.weatherDetailItem}>
                    <div className={styles.detailLabel}>
                        <svg className={styles.detailIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                        </svg>
                        Humedad
                    </div>
                    <div className={styles.detailValue}>{humidity}%</div>
                </div>
                <div className={styles.weatherDetailItem}>
                    <div className={styles.detailLabel}>
                        <svg className={styles.detailIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                        Viento
                    </div>
                    <div className={styles.detailValue}>{Math.round(speed * 3.6)} km/h</div>
                </div>
            </div>
        </div>
    );
};

export default CurrentWeather;