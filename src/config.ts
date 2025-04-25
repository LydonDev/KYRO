export const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-here";
export const PORT = process.env.VITE_API_PORT || 3000;
export const FIRST_USER_HAS_ADMIN = process.env.FIRST_USER_HAS_ADMIN === "false";
export const NODE_ENV = process.env.NODE_ENV || "development";
export const APP_DOMAIN = process.env.VITE_APP_DOMAIN || "kyro.lol";
export const APP_NAME = process.env.VITE_APP_NAME || "Kyro";
export const KYRO_VERSION = process.env.VITE_APP_VERSION || "0.0.0";
export const LOGS_DIR = process.env.VITE_LOGS_DIR || "./logs";
export const API_URL = process.env.VITE_API_URL || "http://localhost";
export const APP_PORT = process.env.VITE_APP_PORT || 5173;

export const EMAIL_CONFIG = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  DEFAULT_FROM: `Notifications <notifications@${APP_DOMAIN}>`,
  APP_URL: process.env.VITE_APP_URL || "http://localhost:5173",
};
