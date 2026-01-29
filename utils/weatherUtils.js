export const getWeatherBackground = (iconCode) => {
    // First digit represents weather condition, second digit represents day/night
    const condition = iconCode.slice(0, -1);
    const isDay = iconCode.endsWith('d');

    const backgrounds = {
        // Clear sky
        '01': isDay ? 'bg-gradient-to-br from-blue-400 to-blue-600' : 'bg-gradient-to-br from-blue-900 to-indigo-900',
        // Few clouds
        '02': isDay ? 'bg-gradient-to-br from-blue-300 to-blue-500' : 'bg-gradient-to-br from-blue-800 to-indigo-800',
        // Scattered clouds
        '03': 'bg-gradient-to-br from-blue-400 to-gray-500',
        // Broken clouds
        '04': 'bg-gradient-to-br from-gray-400 to-gray-600',
        // Shower rain
        '09': 'bg-gradient-to-br from-blue-600 to-blue-800',
        // Rain
        '10': isDay ? 'bg-gradient-to-br from-blue-500 to-blue-700' : 'bg-gradient-to-br from-blue-800 to-blue-900',
        // Thunderstorm
        '11': 'bg-gradient-to-br from-gray-700 to-gray-900',
        // Snow
        '13': 'bg-gradient-to-br from-blue-100 to-blue-300',
        // Mist
        '50': 'bg-gradient-to-br from-gray-300 to-gray-500'
    };

    return backgrounds[condition] || backgrounds['01'];
};