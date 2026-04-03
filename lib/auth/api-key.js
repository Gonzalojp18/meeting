export function validateApiKey(request) {
    const apiKey = request.headers.get('x-api-key');
    const validKey = process.env.N8N_API_KEY;

    if (!validKey) {
        console.warn('N8N_API_KEY no está configurada en las variables de entorno. Las peticiones de n8n fallarán.');
        return false;
    }

    return apiKey === validKey;
}
