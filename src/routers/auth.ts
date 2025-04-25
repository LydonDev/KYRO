import { Router } from "express";
import { compare, hash } from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { JWT_SECRET } from "../config";
import { authMiddleware, requirePermission } from "../middleware/auth";
import { Permissions } from "../permissions";
import {
  sendWelcomeEmail,
  sendVerificationCodeEmail,
  sendNotificationEmail,
} from "../services/email";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    console.log(`Registration payload received:`, {
      username,
      email,
      passwordLength: password ? password.length : 0,
    });

    if (!username || !password || !email) {
      return res
        .status(400)
        .json({ error: "Username, email, and password required" });
    }

    console.log(
      `Registration attempt with username: ${username}, email: ${email}`,
    );

    try {
      const existingUser = await db.users.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const existingEmail = await db.users.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }

      console.log("Hashing password...");
      const hashedPassword = await hash(password, 10);
      console.log("Password hashed successfully");

      console.log("Creating user...");
      const user = await db.users.createUser(username, email, hashedPassword);
      console.log("User created successfully:", user.id);

      try {
        const verificationCode = await db.users.createVerificationCode(user.id);

        await sendWelcomeEmail(email, username);

        await sendVerificationCodeEmail(email, username, verificationCode);

        console.log("Welcome and verification emails sent to:", email);
      } catch (emailErr) {
        console.error("Failed to send emails:", emailErr);
      }

      const token = jwt.sign(
        {
          username,
          userId: user.id,
          requiresVerification: true,
        },
        JWT_SECRET,
        { expiresIn: "1h" },
      );

      res.json({
        token,
        permissions: user.permissions,
        requiresVerification: true,
        userId: user.id,
      });
    } catch (err) {
      console.error("Error registering user:", err);
      console.error("Error details:", JSON.stringify(err, null, 2));
      res.status(500).json({ error: "Server error" });
    }
  } catch (outerErr) {
    console.error("Outer exception in register route:", outerErr);
    res.status(500).json({ error: "Server error - request processing failed" });
  }
});

router.post("/verify-email", async (req, res) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res
        .status(400)
        .json({ error: "User ID and verification code are required" });
    }

    if (!/^\d{6}$/.test(code)) {
      return res
        .status(400)
        .json({ error: "Invalid verification code format" });
    }

    const isValid = await db.users.verifyCode(userId, code);

    if (!isValid) {
      return res
        .status(400)
        .json({ error: "Invalid or expired verification code" });
    }

    const user = await db.users.findUnique({ id: userId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const token = jwt.sign({ username: user.username }, JWT_SECRET, {
      expiresIn: "24h",
    });

    res.json({
      token,
      permissions: user.permissions,
      verified: true,
    });
  } catch (error) {
    console.error("Error verifying email:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/resend-verification", authMiddleware, async (req, res) => {
  try {
    if (req.user!.isEmailVerified) {
      return res.status(400).json({ error: "Email already verified" });
    }

    const verificationCode = await db.users.createVerificationCode(
      req.user!.id,
    );

    await sendVerificationCodeEmail(
      req.user!.email,
      req.user!.username,
      verificationCode,
    );

    res.json({ success: true, message: "Verification code sent" });
  } catch (error) {
    console.error("Error resending verification code:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username/email and password required" });
  }

  try {
    let user = await db.users.getUserByUsername(username);

    if (!user) {
      user = await db.users.getUserByEmail(username);
    }

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const validPassword = await compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const requiresVerification = !user.isEmailVerified;

    const tokenPayload = requiresVerification
      ? { username: user.username, userId: user.id, requiresVerification: true }
      : { username: user.username };

    const tokenExpiry = requiresVerification ? "1h" : "24h";

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: tokenExpiry,
    });

    if (requiresVerification) {
      try {
        const verificationCode = await db.users.createVerificationCode(user.id);
        await sendVerificationCodeEmail(
          user.email,
          user.username,
          verificationCode,
        );
      } catch (emailErr) {
        console.error("Failed to send verification email:", emailErr);
      }
    }

    res.json({
      token,
      permissions: user.permissions,
      requiresVerification,
      userId: user.id,
    });
  } catch (err) {
    console.error("Error logging in:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/state", authMiddleware, (req, res) => {
  const requiresVerification = !req.user!.isEmailVerified;

  res.json({
    authenticated: true,
    username: req.user!.username,
    permissions: req.user!.permissions,
    requiresVerification,
    userId: req.user!.id,
  });
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await db.users.getUserByEmail(email);

    if (!user) {
      return res.json({
        success: true,
        message:
          "If your email exists in our system, you will receive a password reset code",
      });
    }

    const verificationCode = await db.users.createVerificationCode(user.id);

    await sendNotificationEmail(
      email,
      user.username,
      "Password Reset Request",
      `You have requested to reset your password. Use the following verification code to continue the password reset process:\n\n${verificationCode}\n\nIf you did not request a password reset, please ignore this email or contact support.`,
    );

    res.json({
      success: true,
      userId: user.id,
      message: "Password reset code sent to your email",
    });
  } catch (error) {
    console.error("Error processing forgot password request:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/verify-reset-code", async (req, res) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res
        .status(400)
        .json({ error: "User ID and verification code are required" });
    }

    if (!/^\d{6}$/.test(code)) {
      return res
        .status(400)
        .json({ error: "Invalid verification code format" });
    }

    const isValid = await db.users.verifyCode(userId, code, false);

    if (!isValid) {
      return res
        .status(400)
        .json({ error: "Invalid or expired verification code" });
    }

    const resetToken = jwt.sign(
      { userId, purpose: "password-reset" },
      JWT_SECRET,
      { expiresIn: "15m" },
    );

    res.json({
      success: true,
      resetToken,
      message: "Code verified successfully",
    });
  } catch (error) {
    console.error("Error verifying reset code:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { userId, password, code } = req.body;

    if (!userId || !password) {
      return res
        .status(400)
        .json({ error: "User ID and new password are required" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters long" });
    }

    const user = await db.users.findUnique({ id: userId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const hashedPassword = await hash(password, 10);

    await db.users.updateUser({ id: userId }, { password: hashedPassword });

    await sendNotificationEmail(
      user.email,
      user.username,
      "Password Changed Successfully",
      "Your password has been changed successfully. If you didn't make this change, please contact support immediately.",
    );

    res.json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
