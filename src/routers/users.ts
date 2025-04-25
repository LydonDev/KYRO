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
      const { password, ...sanitizedUser } = user;
      res.json(sanitizedUser);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  },
);

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

      try {
        await sendWelcomeEmail(email, username);
        console.log("Welcome email sent to:", email);
      } catch (emailErr) {
        console.error("Failed to send welcome email:", emailErr);
      }

      const { password: _, ...sanitizedUser } = user;
      res.status(201).json(sanitizedUser);
    } catch (err) {
      res.status(500).json({ error: "Failed to create user" });
    }
  },
);

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
      const { password: _, ...sanitizedUser } = user;
      res.json(sanitizedUser);
    } catch (err) {
      res.status(500).json({ error: "Failed to update user" });
    }
  },
);

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

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await db.users.findUnique({ id: req.user!.id });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { password, ...sanitizedUser } = user;
    res.json(sanitizedUser);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

router.post("/update-username", authMiddleware, async (req, res) => {
  const { username } = req.body;
  const userId = req.user!.id;

  if (!username || !username.trim()) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    const existingUser = await db.users.getUserByUsername(username);
    if (existingUser && existingUser.id !== userId) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const user = await db.users.updateUser({ id: userId }, { username });

    const { password: _, ...sanitizedUser } = user;
    res.json(sanitizedUser);
  } catch (err) {
    res.status(500).json({ error: "Failed to update username" });
  }
});

router.post("/change-password", authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user!.id;

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: "Current password and new password are required" });
  }

  try {
    const user = await db.users.findUnique({ id: userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const validPassword = await compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const hashedPassword = await hash(newPassword, 10);
    await db.users.updateUser({ id: userId }, { password: hashedPassword });

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

export default router;
