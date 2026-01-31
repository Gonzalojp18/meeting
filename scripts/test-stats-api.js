const fetch = require('node-fetch');

async function testStatsAPI() {
    const baseUrl = 'http://localhost:3000'; // Assuming local dev server
    const startDate = '2026-01-01';
    const endDate = '2026-01-31';

    console.log(`Testing Stats API for range: ${startDate} to ${endDate}...`);

    try {
        const response = await fetch(`${baseUrl}/api/admin/reports/stats?startDate=${startDate}&endDate=${endDate}`);
        const data = await response.json();

        if (response.ok) {
            console.log('Success!');
            console.log('Summary:', data.summary);
            console.log('Top Dishes Count:', data.topDishes.length);
            console.log('Delivery Stats Count:', data.deliveryStats.length);
        } else {
            console.log('Error:', data.error);
        }
    } catch (error) {
        console.error('Failed to connect to API:', error.message);
    }
}

// testStatsAPI(); // Comentado porque no puedo asegurar que el servidor esté corriendo
console.log('Test script ready. Requires server running at localhost:3000');
