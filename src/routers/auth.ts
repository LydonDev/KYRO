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

      // Create a verification code
      try {
        const verificationCode = await db.users.createVerificationCode(user.id);

        // Send welcome email
        await sendWelcomeEmail(email, username);

        // Send verification code email
        await sendVerificationCodeEmail(email, username, verificationCode);

        console.log("Welcome and verification emails sent to:", email);
      } catch (emailErr) {
        console.error("Failed to send emails:", emailErr);
        // Continue with registration even if emails fail
      }

      // Create a temporary token that expires in 1 hour for verification
      const token = jwt.sign(
        {
          username,
          userId: user.id,
          requiresVerification: true,
        },
        JWT_SECRET,
        { expiresIn: "1h" },
      );

      // Include the requiresVerification flag in the response
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

    // Validate code format
    if (!/^\d{6}$/.test(code)) {
      return res
        .status(400)
        .json({ error: "Invalid verification code format" });
    }

    // Verify the code
    const isValid = await db.users.verifyCode(userId, code);

    if (!isValid) {
      return res
        .status(400)
        .json({ error: "Invalid or expired verification code" });
    }

    // Get the user to create a proper token
    const user = await db.users.findUnique({ id: userId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Create a proper token now that the email is verified
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
    // Check if the user is already verified
    if (req.user!.isEmailVerified) {
      return res.status(400).json({ error: "Email already verified" });
    }

    // Generate a new verification code
    const verificationCode = await db.users.createVerificationCode(
      req.user!.id,
    );

    // Resend the verification email
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
    // Try to find user by username first, then by email if not found
    let user = await db.users.getUserByUsername(username);

    if (!user) {
      // Try to find by email
      user = await db.users.getUserByEmail(username);
    }

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const validPassword = await compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if email is verified
    const requiresVerification = !user.isEmailVerified;

    // If verification is required, send a limited token
    const tokenPayload = requiresVerification
      ? { username: user.username, userId: user.id, requiresVerification: true }
      : { username: user.username };

    const tokenExpiry = requiresVerification ? "1h" : "24h";

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: tokenExpiry,
    });

    // If verification is required, generate a new code and send email
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
        // Continue with login even if email fails
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

    // Find user by email
    const user = await db.users.getUserByEmail(email);

    if (!user) {
      // For security reasons, always return success even if email doesn't exist
      return res.json({
        success: true,
        message:
          "If your email exists in our system, you will receive a password reset code",
      });
    }

    // Generate a verification code
    const verificationCode = await db.users.createVerificationCode(user.id);

    // Send verification code email
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

    // Validate code format
    if (!/^\d{6}$/.test(code)) {
      return res
        .status(400)
        .json({ error: "Invalid verification code format" });
    }

    // Verify the code
    const isValid = await db.users.verifyCode(userId, code, false); // Don't mark email as verified

    if (!isValid) {
      return res
        .status(400)
        .json({ error: "Invalid or expired verification code" });
    }

    // Create a temporary token for password reset
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

    // Find the user
    const user = await db.users.findUnique({ id: userId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Hash the new password
    const hashedPassword = await hash(password, 10);

    // Update the user's password
    await db.users.updateUser({ id: userId }, { password: hashedPassword });

    // Send password changed notification
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
