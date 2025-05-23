// @ts-ignore
import { Database } from "bun:sqlite";

export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  permissions: string[];
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VerificationCode {
  id: string;
  userId: string;
  code: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface Node {
  id: string;
  name: string;
  fqdn: string;
  port: number;
  connectionKey: string;
  isOnline: boolean;
  lastChecked: Date;
  regionId?: string | null;
  region?: Region | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Allocation {
  id: string;
  nodeId: string;
  bindAddress: string;
  port: number;
  alias?: string;
  notes?: string;
  assigned: boolean;
  serverId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Unit {
  id: string;
  name: string;
  shortName: string;
  description: string;
  dockerImage: string;
  defaultStartupCommand: string;
  configFiles: Array<{ path: string; content: string }>;
  environmentVariables: Array<{
    name: string;
    description?: string;
    defaultValue: string;
    required: boolean;
    userViewable: boolean;
    userEditable: boolean;
    rules: string;
  }>;
  installScript: {
    dockerImage: string;
    entrypoint: string;
    script: string;
  };
  startup: {
    done?: string;
    userEditable: boolean;
  };
  recommendedRequirements?: {
    memoryMiB?: number;
    diskMiB?: number;
    cpuPercent?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Server {
  id: string;
  internalId: string;
  name: string;
  nodeId: string;
  unitId: string;
  userId: string;
  allocationId: string;
  memoryMiB: number;
  diskMiB: number;
  cpuPercent: number;
  state: string;
  createdAt: Date;
  updatedAt: Date;
  node?: Node;
  unit?: Unit;
  user?: {
    id: string;
    username: string;
  };
  allocation?: Allocation;
  validationToken?: string;
  projectId?: string | null;
  project?: Project;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Region {
  id: string;
  name: string;
  identifier: string;
  countryId?: string | null;
  fallbackRegionId?: string | null;
  fallbackRegion?: Region | null;
  serverLimit?: number | null;
  nodes: Node[];
  createdAt: Date;
  updatedAt: Date;
}

export type WhereInput<T> = Partial<{ [K in keyof T]: T[K] }>;
export type OrderByInput<T> = Partial<{ [K in keyof T]: "asc" | "desc" }>;

export interface QueryOptions<T> {
  where?: WhereInput<T>;
  orderBy?: OrderByInput<T>;
  include?: Record<string, boolean | Record<string, boolean>>;
}

export interface DatabaseContext {
  db: Database;
}
