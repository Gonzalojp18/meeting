const http = require('http');

function test(path) {
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: path,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
        console.log(`PATH: ${path} - STATUS: ${res.statusCode}`);
    });

    req.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
    });

    req.write(JSON.stringify({}));
    req.end();
}

test('/api/orders/dummy-id/cancel');
test('/api/orders/dummy-id/customer-pickup');
