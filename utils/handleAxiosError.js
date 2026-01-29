export function handleAxiosError(error) {
  if (error.response) {
    console.error('Error Response:', error.response.data);
    console.error('Status Code:', error.response.status);
    console.error('Headers:', error.response.headers);
  } else if (error.request) {
    console.error('Error Request:', error.request);
  } else {
    console.error('Error Message:', error.message);
  }
  console.error('Config:', error.config);
}