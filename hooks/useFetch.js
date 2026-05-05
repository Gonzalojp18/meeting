import { useEffect, useState, useCallback } from "react";

export const useFetch = (url, token) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
      if (!url) {
        setLoading(false);
        return;
      }

      try {
        const options = {
          credentials: 'include',
          cache: 'no-store',
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
  }, [url, token, fetchData])

  const refetch = useCallback(async () => {
    if (url) {
      await fetchData();
    }
  }, [url, fetchData])

  return { data, loading, error, refetch }
}