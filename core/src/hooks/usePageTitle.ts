import { useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import { APP_NAME } from "@/config";

export const usePageTitle = () => {
  const location = useLocation();
  const params = useParams();

  useEffect(() => {
    let title = APP_NAME;
    const path = location.pathname;

    // Root paths
    if (path === "/servers") {
      title = `${APP_NAME} | Servers`;
    } else if (path === "/login") {
      title = `${APP_NAME} | Login`;
    } else if (path === "/register") {
      title = `${APP_NAME} | Register`;
    } else if (path === "/admin") {
      title = `${APP_NAME} | Admin`;
    } else if (path.startsWith("/admin/")) {
      // Admin subpages
      const section = path.split("/admin/")[1];
      title = `${APP_NAME} | Admin → ${section.charAt(0).toUpperCase() + section.slice(1)}`;
    } else if (path.startsWith("/servers/") && params.id) {
      // Server subpages
      const lastSegment = path.split("/").pop();
      if (lastSegment) {
        title = `${APP_NAME} | Server → ${lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1)}`;
      }
    } else if (path === "/404" || path.includes("*")) {
      title = `${APP_NAME} | Not Found`;
    }

    document.title = title;
  }, [location, params]);
};
