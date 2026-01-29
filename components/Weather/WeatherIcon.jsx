import React from 'react';
import Image from 'next/image';
import styles from './WeatherWidget.module.css';

const WeatherIcon = ({ code }) => {
    const getIconUrl = (code) => {
        // Using 4x size for better quality
        return `https://openweathermap.org/img/wn/${code}@4x.png`;
    };

    return (
        <Image
            src={getIconUrl(code)}
            alt="Clima actual"
            className={styles.weatherIcon}
            width={64}
            height={64}
            loading="lazy"
        />
    );
};

export default WeatherIcon;