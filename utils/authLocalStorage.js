export const setToken = (data) => {
  if (typeof window !== 'undefined') {
    const setToken = localStorage.setItem('auth', JSON.stringify(data));
    return setToken;
  }
};

export const getToken = () => {
  if (typeof window !== 'undefined') {
    const userToken = JSON.parse(localStorage.getItem('auth'));
    const conf = {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    };
    return conf;
  }
  return null;
};

export const getValue = () => {
  if (typeof window !== 'undefined') {
    const getAuth = localStorage.getItem('auth');
    return getAuth;
  }
  return null;
};

export const deleteLocalStorage = () => {
  if (typeof window !== 'undefined') {
    const removeToken = localStorage.removeItem('auth');
    return removeToken;
  }
};