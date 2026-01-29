import { useEffect, useState, useCallback } from "react";

export const useFetch = (url, token) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
      // No hacer fetch si la URL es null o undefined
      if (!url) {
        setLoading(false);
        return;
      }

      try {
        const options = {
          credentials: 'include',
          ...(token && { headers: { Authorization: `Bearer ${token}` } })
        };

        const response = await fetch(url, options);

        if (!response.ok) {
          throw new Error("Error en la petición")
        }

        const jsonData = await response.json();

        setData(jsonData)
        setError(null);
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
  }, [url, token])

  useEffect(() => {
    if (url) {
      fetchData()
    } else {
      setLoading(false)
    }
  }, [url, token])

  const refetch = useCallback(async () => {
    // Solo hacer refetch si hay una URL válida
    if (url) {
      fetchData();
    }
  }, [url, fetchData])

  return { data, loading, error, refetch }
}