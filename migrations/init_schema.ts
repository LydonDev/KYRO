/**
 * Migration: consolidated_migration
 * Generated: 2023-11-01T00:00:00.000Z
 *
 * This is a consolidated migration that combines all previous migrations:
 * - init_schema: Initial database schema setup
 * - add_email_field: Ensures all users have an email field and fixes permissions field type
 * - add_email_verification: Adds email verification functionality
 * - add_pending_email_changes: Adds pending email changes functionality
 */

// @ts-ignore
import { Database } from "bun:sqlite";

export function up(db: Database) {
  // ===== INITIAL SCHEMA =====
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      permissions TEXT NOT NULL DEFAULT '["user"]',
      isEmailVerified INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS verification_codes (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      code TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      fqdn TEXT NOT NULL,
      port INTEGER NOT NULL,
      connectionKey TEXT NOT NULL,
      isOnline BOOLEAN NOT NULL DEFAULT FALSE,
      lastChecked TEXT NOT NULL,
      regionId TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY(regionId) REFERENCES regions(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS units (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      shortName TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      dockerImage TEXT NOT NULL,
      defaultStartupCommand TEXT NOT NULL,
      configFiles TEXT NOT NULL DEFAULT '[]',
      environmentVariables TEXT NOT NULL DEFAULT '[]',
      installScript TEXT NOT NULL,
      startup TEXT NOT NULL DEFAULT '{}',
      recommendedRequirements TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS allocations (
      id TEXT PRIMARY KEY,
      nodeId TEXT NOT NULL,
      bindAddress TEXT NOT NULL,
      port INTEGER NOT NULL,
      alias TEXT,
      notes TEXT,
      assigned BOOLEAN NOT NULL DEFAULT FALSE,
      serverId TEXT UNIQUE,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY(nodeId) REFERENCES nodes(id)
    );

    CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      internalId TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      nodeId TEXT NOT NULL,
      unitId TEXT NOT NULL,
      userId TEXT NOT NULL,
      allocationId TEXT NOT NULL,
      memoryMiB INTEGER NOT NULL,
      diskMiB INTEGER NOT NULL,
      cpuPercent INTEGER NOT NULL,
      state TEXT NOT NULL,
      validationToken TEXT,
      projectId TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY(nodeId) REFERENCES nodes(id),
      FOREIGN KEY(unitId) REFERENCES units(id),
      FOREIGN KEY(userId) REFERENCES users(id),
      FOREIGN KEY(allocationId) REFERENCES allocations(id),
      FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE SET NULL
    );

    -- Cargo system tables
    CREATE TABLE IF NOT EXISTS cargo (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      hash TEXT NOT NULL,
      size INTEGER NOT NULL,
      mimeType TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('local', 'remote')),
      remoteUrl TEXT,
      properties TEXT NOT NULL DEFAULT '{}',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cargo_containers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      items TEXT NOT NULL DEFAULT '[]',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS unit_cargo_containers (
      unit_id TEXT NOT NULL,
      container_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (unit_id, container_id),
      FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
      FOREIGN KEY (container_id) REFERENCES cargo_containers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      userId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS regions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      identifier TEXT NOT NULL UNIQUE, -- lowercase one-word identifier
      countryId TEXT, -- optional country code
      fallbackRegionId TEXT, -- optional reference to another region
      serverLimit INTEGER, -- optional server limit for the entire region
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (fallbackRegionId) REFERENCES regions(id) ON DELETE SET NULL
    );

    -- Create pending_email_changes table
    CREATE TABLE IF NOT EXISTS pending_email_changes (
      userId TEXT PRIMARY KEY,
      newEmail TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_nodes_region_id ON nodes(regionId);
    CREATE INDEX IF NOT EXISTS idx_region_identifier ON regions(identifier);
    CREATE INDEX IF NOT EXISTS idx_servers_userid ON servers(userId);
    CREATE INDEX IF NOT EXISTS idx_servers_nodeid ON servers(nodeId);
    CREATE INDEX IF NOT EXISTS idx_allocations_nodeid ON allocations(nodeId);
    CREATE INDEX IF NOT EXISTS idx_allocations_serverid ON allocations(serverId);
    CREATE INDEX IF NOT EXISTS idx_cargo_hash ON cargo(hash);
    CREATE INDEX IF NOT EXISTS idx_unit_cargo_containers_unit_id ON unit_cargo_containers(unit_id);
    CREATE INDEX IF NOT EXISTS idx_unit_cargo_containers_container_id ON unit_cargo_containers(container_id);
    CREATE INDEX IF NOT EXISTS idx_verification_codes_user_id ON verification_codes(userId);
    CREATE INDEX IF NOT EXISTS idx_pending_email_changes_userId ON pending_email_changes(userId);
  `);
}

export function down(db: Database) {
  db.exec(`
    -- Drop all indexes
    DROP INDEX IF EXISTS idx_pending_email_changes_userId;
    DROP INDEX IF EXISTS idx_verification_codes_user_id;
    DROP INDEX IF EXISTS idx_unit_cargo_containers_container_id;
    DROP INDEX IF EXISTS idx_unit_cargo_containers_unit_id;
    DROP INDEX IF EXISTS idx_cargo_hash;
    DROP INDEX IF EXISTS idx_allocations_serverid;
    DROP INDEX IF EXISTS idx_allocations_nodeid;
    DROP INDEX IF EXISTS idx_servers_nodeid;
    DROP INDEX IF EXISTS idx_servers_userid;
    DROP INDEX IF EXISTS idx_region_identifier;
    DROP INDEX IF EXISTS idx_nodes_region_id;
    
    -- Drop all tables (in reverse dependency order)
    DROP TABLE IF EXISTS pending_email_changes;
    DROP TABLE IF EXISTS verification_codes;
    DROP TABLE IF EXISTS unit_cargo_containers;
    DROP TABLE IF EXISTS cargo_containers;
    DROP TABLE IF EXISTS cargo;
    DROP TABLE IF EXISTS servers;
    DROP TABLE IF EXISTS allocations;
    DROP TABLE IF EXISTS units;
    DROP TABLE IF EXISTS nodes;
    DROP TABLE IF EXISTS projects;
    DROP TABLE IF EXISTS regions;
    DROP TABLE IF EXISTS users;
  `);
}
