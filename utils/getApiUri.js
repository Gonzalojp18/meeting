// En el navegador, usar URLs relativas para evitar problemas de CORS
// En el servidor, usar la URL completa
const isBrowser = typeof window !== 'undefined';

const getFullUrl = () => {
  if (process.env.NEXT_PUBLIC_API_NODE_ENV === 'development') {
    return process.env.NEXT_PUBLIC_API_URI_DEVELOPMENT || 'http://localhost:3000';
  }
  return process.env.NEXT_PUBLIC_API_URI_PRODUCTION || 'https://www.meetingrestobar.com';
};

// En el navegador, usar string vacío para URLs relativas (mismo origen)
// En el servidor, usar la URL completa
const baseApiUrl = isBrowser ? '' : getFullUrl();

export default baseApiUrl;

// Exportar también la URL completa para casos especiales (webhooks, etc.)
export const fullApiUrl = getFullUrl();

