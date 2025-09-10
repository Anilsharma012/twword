import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const BRAND = "Ashish Properties";

export default function TitleSync() {
  const location = useLocation();
  useEffect(() => {
    const current = (document.title || "").trim();
    const lower = current.toLowerCase();
    if (!current || !lower.includes("ashish")) {
      document.title = BRAND;
    }
  }, [location.pathname]);
  return null;
}
