import { useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";

const appName = import.meta.env.VITE_APP_NAME ?? "Kyro";

export const usePageTitle = () => {
  const location = useLocation();
  const params = useParams();

  useEffect(() => {
    let title = appName;
    const path = location.pathname;

    // Root paths
    if (path === "/servers") {
      title = `${appName} | Servers`;
    } else if (path === "/login") {
      title = `${appName} | Login`;
    } else if (path === "/register") {
      title = `${appName} | Register`;
    } else if (path === "/admin") {
      title = `${appName} | Admin`;
    } else if (path.startsWith("/admin/")) {
      // Admin subpages
      const section = path.split("/admin/")[1];
      title = `${appName} | Admin → ${section.charAt(0).toUpperCase() + section.slice(1)}`;
    } else if (path.startsWith("/servers/") && params.id) {
      // Server subpages
      const lastSegment = path.split("/").pop();
      if (lastSegment) {
        title = `${appName} | Server → ${lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1)}`;
      }
    } else if (path === "/404" || path.includes("*")) {
      title = `${appName} | Not Found`;
    }

    document.title = title;
  }, [location, params]);
};
