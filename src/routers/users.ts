// src/routers/users.ts
import { Router } from "express";
import { hash, compare } from "bcrypt";
import { db } from "../db";
import { authMiddleware, requirePermission } from "../middleware/auth";
import { Permissions } from "../permissions";
import {
  sendWelcomeEmail,
  sendVerificationCodeEmail,
  sendNotificationEmail,
} from "../services/email";

const router = Router();

// Get all users (admin only)
router.get(
  "/",
  authMiddleware,
  requirePermission(Permissions.ADMIN),
  async (req, res) => {
    try {
      const users = await db.users.findMany();
      // Remove sensitive data
      const sanitizedUsers = users.map(({ password, ...user }) => user);
      res.json(sanitizedUsers);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  },
);

// Get single user (admin only)
router.get(
  "/:id",
  authMiddleware,
  requirePermission(Permissions.ADMIN),
  async (req, res) => {
    try {
      const user = await db.users.findUnique({ id: req.params.id });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      // Remove sensitive data
      const { password, ...sanitizedUser } = user;
      res.json(sanitizedUser);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  },
);

// Create user (admin only)
router.post(
  "/",
  authMiddleware,
  requirePermission(Permissions.ADMIN),
  async (req, res) => {
    const { username, email, password, permissions } = req.body;

    if (!username || !password || !email) {
      return res
        .status(400)
        .json({ error: "Username, email, and password required" });
    }

    try {
      const existingUser = await db.users.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const existingEmail = await db.users.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }

      const hashedPassword = await hash(password, 10);
      const user = await db.users.createUser(
        username,
        email,
        hashedPassword,
        permissions,
      );

      // Send welcome email
      try {
        await sendWelcomeEmail(email, username);
        console.log("Welcome email sent to:", email);
      } catch (emailErr) {
        console.error("Failed to send welcome email:", emailErr);
        // Continue with user creation even if email fails
      }

      // Remove sensitive data
      const { password: _, ...sanitizedUser } = user;
      res.status(201).json(sanitizedUser);
    } catch (err) {
      res.status(500).json({ error: "Failed to create user" });
    }
  },
);

// Update user (admin only)
router.patch(
  "/:id",
  authMiddleware,
  requirePermission(Permissions.ADMIN),
  async (req, res) => {
    const { username, password, permissions } = req.body;
    const updates: any = {};

    if (username) updates.username = username;
    if (permissions) updates.permissions = permissions;
    if (password) {
      updates.password = await hash(password, 10);
    }

    try {
      const user = await db.users.updateUser({ id: req.params.id }, updates);
      // Remove sensitive data
      const { password: _, ...sanitizedUser } = user;
      res.json(sanitizedUser);
    } catch (err) {
      res.status(500).json({ error: "Failed to update user" });
    }
  },
);

// Delete user (admin only)
router.delete(
  "/:id",
  authMiddleware,
  requirePermission(Permissions.ADMIN),
  async (req, res) => {
    try {
      await db.users.delete({ id: req.params.id });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  },
);

// Profile routes for authenticated users

// Get current user profile
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await db.users.findUnique({ id: req.user!.id });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Remove sensitive data
    const { password, ...sanitizedUser } = user;
    res.json(sanitizedUser);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Update username
router.post("/update-username", authMiddleware, async (req, res) => {
  const { username } = req.body;
  const userId = req.user!.id;

  if (!username || !username.trim()) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    // Check if username is already taken by another user
    const existingUser = await db.users.getUserByUsername(username);
    if (existingUser && existingUser.id !== userId) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const user = await db.users.updateUser({ id: userId }, { username });

    // Remove sensitive data
    const { password: _, ...sanitizedUser } = user;
    res.json(sanitizedUser);
  } catch (err) {
    res.status(500).json({ error: "Failed to update username" });
  }
});

// Change password
router.post("/change-password", authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user!.id;

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: "Current password and new password are required" });
  }

  try {
    // Get current user with password
    const user = await db.users.findUnique({ id: userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password
    const validPassword = await compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Hash new password and update
    const hashedPassword = await hash(newPassword, 10);
    await db.users.updateUser({ id: userId }, { password: hashedPassword });

    // Send a notification about the password change
    try {
      await sendNotificationEmail(
        user.email,
        user.username,
        "Password Changed",
        "Your password has been successfully changed. If you did not make this change, please contact support immediately.",
      );
    } catch (emailErr) {
      console.error("Failed to send password change notification:", emailErr);
    }

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("Error changing password:", err);
    res.status(500).json({ error: "Failed to update password" });
  }
});

// Request email change
router.post("/request-email-change", authMiddleware, async (req, res) => {
  const { newEmail } = req.body;
  const userId = req.user!.id;

  if (!newEmail || !newEmail.trim()) {
    return res.status(400).json({ error: "New email is required" });
  }

  try {
    // Check if email is already taken by another user
    const existingEmail = await db.users.getUserByEmail(newEmail);
    if (existingEmail) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Get current user
    const user = await db.users.findUnique({ id: userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Store the pending email change in temp storage
    const verificationCode = await db.users.createVerificationCode(userId);

    // Store the new email in a pending_email_changes table
    await db.db
      .prepare(
        `
      INSERT OR REPLACE INTO pending_email_changes (
        userId, newEmail, createdAt
      ) VALUES (?, ?, ?)
    `,
      )
      .run(userId, newEmail, new Date().toISOString());

    // Send verification code to the new email
    await sendVerificationCodeEmail(newEmail, user.username, verificationCode);

    res.json({ success: true, message: "Verification code sent to new email" });
  } catch (err) {
    console.error("Error requesting email change:", err);
    res.status(500).json({ error: "Failed to process email change request" });
  }
});

// Verify email change
router.post("/verify-email-change", authMiddleware, async (req, res) => {
  const { code } = req.body;
  const userId = req.user!.id;

  if (!code) {
    return res.status(400).json({ error: "Verification code is required" });
  }

  try {
    // Verify the code
    const isValid = await db.users.verifyCode(userId, code, false);

    if (!isValid) {
      return res
        .status(400)
        .json({ error: "Invalid or expired verification code" });
    }

    // Get the pending email change
    const pendingChange = db.db
      .prepare("SELECT newEmail FROM pending_email_changes WHERE userId = ?")
      .get(userId) as { newEmail: string } | undefined;

    if (!pendingChange) {
      return res.status(400).json({ error: "No pending email change found" });
    }

    // Get current user
    const user = await db.users.findUnique({ id: userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const oldEmail = user.email;
    const newEmail = pendingChange.newEmail;

    // Update the user's email
    await db.users.updateUser(
      { id: userId },
      {
        email: newEmail,
        isEmailVerified: true, // Mark as verified since we verified the new email
      },
    );

    // Remove the pending change
    db.db
      .prepare("DELETE FROM pending_email_changes WHERE userId = ?")
      .run(userId);

    // Send notification to old email
    try {
      await sendNotificationEmail(
        oldEmail,
        user.username,
        "Email Address Changed",
        `Your email address has been changed from ${oldEmail} to ${newEmail}. If you did not make this change, please contact support immediately.`,
      );
    } catch (emailErr) {
      console.error(
        "Failed to send email change notification to old email:",
        emailErr,
      );
    }

    // Send confirmation to new email
    try {
      await sendNotificationEmail(
        newEmail,
        user.username,
        "Email Address Confirmed",
        "Your new email address has been confirmed and is now associated with your account.",
      );
    } catch (emailErr) {
      console.error(
        "Failed to send email change confirmation to new email:",
        emailErr,
      );
    }

    res.json({ success: true, message: "Email changed successfully" });
  } catch (err) {
    console.error("Error verifying email change:", err);
    res.status(500).json({ error: "Failed to verify email change" });
  }
});

export default router;
