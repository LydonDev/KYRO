import { randomUUID } from "crypto";
import { DatabaseContext, User, QueryOptions } from "./types";
import { buildWhereClause, buildOrderByClause, parseDate } from "./utils";
import { FIRST_USER_HAS_ADMIN } from "../config";
import { Permissions } from "../permissions";

const parseUserRow = (row: any): User => ({
  ...row,
  permissions: JSON.parse(row.permissions),
  createdAt: parseDate(row.createdAt),
  updatedAt: parseDate(row.updatedAt),
  isEmailVerified: row.isEmailVerified === 1, 
});

export function createUsersRepository({ db }: DatabaseContext) {
  return {
    findMany: async (options?: QueryOptions<User>): Promise<User[]> => {
      const { clause: whereClause, params: whereParams } = buildWhereClause(
        "users",
        options?.where,
      );
      const orderByClause = buildOrderByClause("users", options?.orderBy);

      const query = `
        SELECT * FROM users
        ${whereClause}
        ${orderByClause}
      `;

      const rows = db.prepare(query).all(...whereParams) as any[];
      return rows.map(parseUserRow);
    },

    findUnique: async (where: { id: string }): Promise<User | null> => {
      const row = db
        .prepare("SELECT * FROM users WHERE id = ?")
        .get(where.id) as any;
      return row ? parseUserRow(row) : null;
    },

    getUserByUsername: async (username: string): Promise<User | null> => {
      const row = db
        .prepare("SELECT * FROM users WHERE username = ?")
        .get(username) as any;

      if (!row) return null;

      return parseUserRow(row);
    },

    getUserByEmail: async (email: string): Promise<User | null> => {
      const row = db
        .prepare("SELECT * FROM users WHERE email = ?")
        .get(email) as any;

      if (!row) return null;

      return parseUserRow(row);
    },

    createUser: async (
      username: string,
      email: string,
      hashedPassword: string,
      permissions?: string[],
    ): Promise<User> => {
      console.log("Starting createUser transaction...");
      db.prepare("BEGIN TRANSACTION").run();

      try {
        console.log("Checking user count...");
        const userCount = db
          .prepare("SELECT COUNT(*) as count FROM users")
          .get() as { count: number };
        const isFirstUser = userCount.count === 0;
        console.log(
          `User count: ${userCount.count}, isFirstUser: ${isFirstUser}`,
        );

        const userPermissions =
          permissions ||
          (isFirstUser && FIRST_USER_HAS_ADMIN
            ? [Permissions.ADMIN]
            : [Permissions.USER]);

        console.log("Creating user object with permissions:", userPermissions);
        const user: User = {
          id: randomUUID(),
          username,
          email,
          password: hashedPassword,
          permissions: userPermissions,
          isEmailVerified: false, 
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        console.log("Inserting user into database...");

        const permissionsJson = JSON.stringify(user.permissions);

        db.prepare(
          `
          INSERT INTO users (
            id, username, email, password, permissions, isEmailVerified, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        ).run(
          user.id,
          user.username,
          user.email,
          user.password,
          permissionsJson,
          user.isEmailVerified ? 1 : 0,
          user.createdAt.toISOString(),
          user.updatedAt.toISOString(),
        );
        console.log("User inserted successfully");

        console.log("Creating default project for user...");
        const defaultProject = {
          id: randomUUID(),
          name: "Default",
          description: "Default project",
          userId: user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        db.prepare(
          `
          INSERT INTO projects (
            id, name, description, userId, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?)
        `,
        ).run(
          defaultProject.id,
          defaultProject.name,
          defaultProject.description,
          defaultProject.userId,
          defaultProject.createdAt.toISOString(),
          defaultProject.updatedAt.toISOString(),
        );
        console.log("Default project created successfully");

        console.log("Committing transaction...");
        db.prepare("COMMIT").run();
        console.log("Transaction committed");

        return user;
      } catch (error) {
        console.error("Error in createUser, rolling back transaction:", error);
        db.prepare("ROLLBACK").run();
        console.log("Transaction rolled back");
        throw error;
      }
    },

    updateUser: async (
      where: { id: string },
      data: Partial<User>,
    ): Promise<User> => {
      const current = db
        .prepare("SELECT * FROM users WHERE id = ?")
        .get(where.id) as any;
      if (!current) throw new Error("User not found");

      const parsedUser = parseUserRow(current);

      const updated = {
        ...parsedUser,
        ...data,
        updatedAt: new Date(),
      };

      db.prepare(
        `
        UPDATE users
        SET username = ?, email = ?, password = ?, permissions = ?, isEmailVerified = ?, updatedAt = ?
        WHERE id = ?
      `,
      ).run(
        updated.username,
        updated.email,
        updated.password,
        JSON.stringify(updated.permissions),
        updated.isEmailVerified ? 1 : 0,
        updated.updatedAt.toISOString(),
        where.id,
      );

      return updated;
    },

    verifyUserEmail: async (userId: string): Promise<boolean> => {
      try {
        const result = db
          .prepare(
            "UPDATE users SET isEmailVerified = 1, updatedAt = ? WHERE id = ?",
          )
          .run(new Date().toISOString(), userId);
        return result.changes > 0;
      } catch (err) {
        console.error("Error verifying user email:", err);
        return false;
      }
    },

    createVerificationCode: async (userId: string): Promise<string> => {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); 

      try {
        db.prepare("DELETE FROM verification_codes WHERE userId = ?").run(
          userId,
        );

        db.prepare(
          `
          INSERT INTO verification_codes (
            id, userId, code, expiresAt, createdAt
          ) VALUES (?, ?, ?, ?, ?)
        `,
        ).run(
          randomUUID(),
          userId,
          code,
          expiresAt.toISOString(),
          new Date().toISOString(),
        );

        return code;
      } catch (error) {
        console.error("Error creating verification code:", error);
        throw error;
      }
    },

    verifyCode: async (
      userId: string,
      code: string,
      markEmailAsVerified: boolean = true,
    ): Promise<boolean> => {
      try {
        const verificationCode = db
          .prepare(
            "SELECT * FROM verification_codes WHERE userId = ? AND code = ? AND expiresAt > ?",
          )
          .get(userId, code, new Date().toISOString()) as any;

        if (!verificationCode) {
          return false;
        }

        db.prepare("DELETE FROM verification_codes WHERE id = ?").run(
          verificationCode.id,
        );

        if (markEmailAsVerified) {
          db.prepare(
            "UPDATE users SET isEmailVerified = 1, updatedAt = ? WHERE id = ?",
          ).run(new Date().toISOString(), userId);
        }

        return true;
      } catch (error) {
        console.error("Error verifying code:", error);
        return false;
      }
    },

    updateUserPermissions: async (
      userId: string,
      permissions: string[],
    ): Promise<boolean> => {
      try {
        const result = db
          .prepare(
            "UPDATE users SET permissions = ?, updatedAt = ? WHERE id = ?",
          )
          .run(JSON.stringify(permissions), new Date().toISOString(), userId);
        return result.changes > 0;
      } catch (err) {
        return false;
      }
    },

    delete: async (where: { id: string }): Promise<void> => {
      const result = db.prepare("DELETE FROM users WHERE id = ?").run(where.id);
      if (result.changes === 0) {
        throw new Error("User not found");
      }
    },
  };
}
