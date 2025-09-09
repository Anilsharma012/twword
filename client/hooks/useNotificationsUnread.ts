import { useEffect, useState } from "react";

export const useNotificationsUnread = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    const fetchCount = async () => {
      try {
        const token =
          localStorage.getItem("token") || localStorage.getItem("auth_token");
        if (!token) return;
        const res = await fetch("/api/notifications/unread-count", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (active) setCount(Number(data?.data?.unread || 0));
      } catch (e) {
        // Swallow errors to avoid UI noise
      }
    };

    fetchCount();
    const id = setInterval(fetchCount, 10000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return count;
};
