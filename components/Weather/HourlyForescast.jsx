import React from 'react';
import Image from 'next/image';
import WeatherIcon from './WeatherIcon';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import styles from './WeatherWidget.module.css';

const HourlyForecast = ({ forecast }) => {
    if (!forecast?.list) return null;

    const next24Hours = forecast.list.slice(0, 12);

    return (
        <div className={styles.forecastContainer}>
            <div className={styles.forecastGrid}>
                {next24Hours.map((hour) => (
                    <div
                        key={hour.dt}
                        className={styles.forecastItem}
                    >
                        <span className={styles.forecastTime}>
                            {format(new Date(hour.dt * 1000), 'HH:mm', { locale: es })}
                        </span>
                        <Image
                            src={`https://openweathermap.org/img/wn/${hour.weather[0].icon}@2x.png`}
                            alt={hour.weather[0].description}
                            className={styles.forecastIcon}
                            width={32}
                            height={32}
                        />
                        <span className={styles.forecastTemp}>
                            {Math.round(hour.main.temp)}°
                        </span>
                        <span className={styles.forecastDesc}>
                            {hour.weather[0].description}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HourlyForecast;