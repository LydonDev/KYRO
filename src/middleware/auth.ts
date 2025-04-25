import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config";
import { db } from "../db";
import { Permission, hasPermission } from "../permissions";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string;
        permissions: Permission[];
        isEmailVerified: boolean;
      };
    }
  }
}

interface JWTPayload {
  username: string;
  userId?: string;
  requiresVerification?: boolean;
  exp?: number;
  iat?: number;
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: "Authorization header missing or invalid format" });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

      if (decoded.exp && decoded.exp < Date.now() / 1000) {
        return res.status(401).json({ error: "Token has expired" });
      }

      const user = await db.users.getUserByUsername(decoded.username);

      if (!user) {
        return res.status(401).json({ error: "User no longer exists" });
      }

      req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        permissions: user.permissions as Permission[],
        isEmailVerified: user.isEmailVerified,
      };

      next();
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ error: "Token has expired" });
      } else if (err instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ error: "Invalid token format" });
      }
      throw err;
    }
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const checkPermission =
  (permission: string) => (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.permissions) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!hasPermission(req.user.permissions, permission)) {
      return res.status(403).json({
        error: "Insufficient permissions",
        required: permission,
      });
    }

    next();
  };

export const requirePermission =
  (permission: string) => (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.permissions) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!hasPermission(req.user.permissions, permission)) {
      return res.status(403).json({
        error: "Insufficient permissions",
        required: permission,
      });
    }

    next();
  };
