import { Resend } from "resend";
import { EMAIL_CONFIG } from "../config";

const appName = import.meta.env.VITE_APP_NAME ?? "Kyro";

const resend = EMAIL_CONFIG.RESEND_API_KEY
  ? new Resend(EMAIL_CONFIG.RESEND_API_KEY)
  : ({
      emails: {
        send: async () => ({
          id: "mock-email-id",
          from: "",
          to: "",
          created_at: new Date().toISOString(),
        }),
      },
    } as unknown as Resend);

const styles = {
  paragraph:
    "margin-top: 0; margin-bottom: 16px; color: #d4d4d4; font-size: 16px;",
  lastParagraph:
    "margin-top: 0; margin-bottom: 0; color: #d4d4d4; font-size: 16px;",
  highlight:
    "margin-top: 0; margin-bottom: 16px; color: #ffffff; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px;",
};

const createEmailTemplate = (
  heading: string,
  content: string,
  buttonText?: string,
  buttonLink?: string,
  logoUrl?: string,
) => {
  const buttonSection =
    buttonText && buttonLink
      ? `<div style="text-align: center;">
        <a href="${buttonLink}" style="display: inline-block; background-color: #ffffff; color: #000000; padding: 10px 20px; border-radius: 4px; text-decoration: none; font-weight: 500; font-size: 14px; transition: all 0.15s;">${buttonText}</a>
      </div>`
      : "";

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="dark">
        <meta name="supported-color-schemes" content="dark">
        <title>${heading}</title>
        <style>
          @media only screen and (max-width: 600px) {
            .email-container {
              width: 100% !important;
            }
            .content {
              padding: 20px 15px !important;
            }
          }
        </style>
      </head>
      <body style="background-color: #000000; margin: 0; padding: 0; font-family: 'Coinbase Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #000000;">
          <tr>
            <td align="center" style="padding: 20px 0;">
              <table class="email-container" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; margin: 0 auto; color: #ffffff; background-color: #000000; border-radius: 8px; overflow: hidden; border: 1px solid #333333;">
                <tr>
                  <td class="content" style="padding: 30px 25px;">
                    <div style="margin-bottom: 25px;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 500;">${heading}</h1>
                    </div>
                    <div style="background-color: #111111; border-radius: 6px; padding: 20px; margin-bottom: ${buttonText ? "25px" : "0"}; border: 1px solid #222222;">
                      ${content}
                    </div>
                    ${buttonSection}
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #333333; text-align: center;">
                      <p style="font-size: 14px; color: #888888; margin: 0;">The ${appName} Team</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

interface EmailResult {
  success: boolean;
  data?: any;
  error?: any;
}

export const sendWelcomeEmail = async (
  email: string,
  username: string,
): Promise<EmailResult> => {
  try {
    const content = `
      <p style="${styles.paragraph}">Hi ${username},</p>
      <p style="${styles.paragraph}">Thank you for signing up! We're excited to have you as part of our hosting community.</p>
      <p style="${styles.lastParagraph}">Please verify your email address to complete your registration. You'll receive a verification code in a separate email.</p>
    `;

    const result = await resend.emails.send({
      from: EMAIL_CONFIG.DEFAULT_FROM,
      to: email,
      subject: `Welcome to ${appName}!`,
      html: createEmailTemplate(
        `Welcome to ${appName}!`,
        content,
        "Access Dashboard",
        EMAIL_CONFIG.APP_URL,
      ),
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return { success: false, error };
  }
};

export const sendVerificationCodeEmail = async (
  email: string,
  username: string,
  code: string,
): Promise<EmailResult> => {
  try {
    const content = `
      <p style="${styles.paragraph}">Hi ${username},</p>
      <p style="${styles.paragraph}">Please verify your email address by entering the following code:</p>
      <p style="${styles.highlight}">${code}</p>
      <p style="${styles.lastParagraph}">This code will expire in 24 hours. If you didn't request this verification, you can safely ignore this email.</p>
    `;

    const result = await resend.emails.send({
      from: EMAIL_CONFIG.DEFAULT_FROM,
      to: email,
      subject: "Your Verification Code",
      html: createEmailTemplate("Verify Your Email", content),
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to send verification code email:", error);
    return { success: false, error };
  }
};

export const sendNotificationEmail = async (
  email: string,
  username: string,
  title: string,
  message: string,
  actionText: string = "View Details",
  actionLink: string = EMAIL_CONFIG.APP_URL,
): Promise<EmailResult> => {
  try {
    const content = `
      <p style="${styles.paragraph}">Hi ${username},</p>
      <p style="${styles.lastParagraph}">${message}</p>
    `;

    const result = await resend.emails.send({
      from: EMAIL_CONFIG.DEFAULT_FROM,
      to: email,
      subject: title,
      html: createEmailTemplate(title, content, actionText, actionLink),
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to send notification email:", error);
    return { success: false, error };
  }
};
