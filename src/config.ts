export const JWT_SECRET = "your-secret-key-here";
export const PORT = 3000;
export const FIRST_USER_HAS_ADMIN = true;
export const NODE_ENV = process.env.NODE_ENV || "development";

export const EMAIL_CONFIG = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  DEFAULT_FROM: "Notifications <notifications@kyro.lol>",
  APP_URL: process.env.APP_URL || "http://localhost:5173",
};
