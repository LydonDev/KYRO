export type Permission = (typeof Permissions)[keyof typeof Permissions];

export const Permissions = {
  ADMIN: "admin",
  USER: "user",
} as const;

export const PermissionSets = {
  DEFAULT: [Permissions.USER],

  USER: [Permissions.USER],

  ADMIN: [Permissions.ADMIN],
};

export function hasPermission(
  userPermissions: string[] | undefined | null,
  requiredPermission: string,
): boolean {
  if (!userPermissions?.length) {
    return false;
  }

  const lowerCasePermissions = userPermissions.map((p) => p.toLowerCase());
  const lowerCaseRequired = requiredPermission.toLowerCase();

  if (lowerCasePermissions.includes(Permissions.ADMIN.toLowerCase())) {
    return true;
  }

  return lowerCasePermissions.some((permission) => {
    if (permission === lowerCaseRequired) {
      return true;
    }

    if (permission.endsWith(".*")) {
      const prefix = permission.slice(0, -2);
      return lowerCaseRequired.startsWith(prefix);
    }

    return false;
  });
}

export const checkPermission =
  (permission: string) => (req: any, res: any, next: any) => {
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

export const requirePermission = checkPermission;
