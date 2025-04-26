import { Router } from "express";
import { z } from "zod";
import { hasPermission } from "../permissions";
import { randomUUID, createHash } from "crypto";
import axios from "axios";
import { db } from "../db";
import { Permissions } from "../permissions";
import { authMiddleware, checkPermission } from "../middleware/auth";

const router = Router();

interface CargoFile {
  id: string;
  url: string;
  targetPath: string;
  properties: {
    hidden?: boolean;
    readonly?: boolean;
    noDelete?: boolean;
    customProperties?: Record<string, any>;
  };
}

interface DaemonServerConfig {
  dockerImage: string;
  variables: Array<{
    name: string;
    description?: string;
    defaultValue: string;
    rules: string;
  }>;
  startupCommand: string;
  configFiles: Array<{
    path: string;
    content: string;
  }>;
  install: {
    dockerImage: string;
    entrypoint: string;
    script: string;
  };
  cargo?: CargoFile[];
}

const createServerSchema = z.object({
  name: z.string().min(1).max(100),
  nodeId: z.string().uuid(),
  allocationId: z.string().uuid(),
  memoryMiB: z.number().int().min(128),
  diskMiB: z.number().int().min(1024),
  cpuPercent: z.number().min(1).max(100),
  unitId: z.string().uuid(),
  userId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
});

const updateServerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  memoryMiB: z.number().int().min(128).optional(),
  diskMiB: z.number().int().min(1024).optional(),
  cpuPercent: z.number().min(1).max(100).optional(),
  unitId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
});

async function makeDaemonRequest(
  method: "get" | "post" | "delete" | "patch",
  node:
    | { fqdn: string; port: number; connectionKey: string }
    | null
    | undefined,
  path: string,
  data?: any,
) {
  if (!node?.fqdn) {
    throw new Error("Node information not available");
  }

  try {
    const url = `http://${node.fqdn}:${node.port}${path}`;
    const response = await axios({
      method,
      url,
      data,
      headers: {
        "X-API-Key": node.connectionKey,
      },
      timeout: 10000,
    });
    return response.data;
  } catch (error: any) {
    console.error(`Daemon request failed: ${error.message}`);
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw new Error("Failed to communicate with daemon");
  }
}

async function checkServerAccess(req: any, serverId: string) {
  const server = await db.servers.findUnique({
    where: { id: serverId },
    include: { node: true, allocation: true, unit: true },
  });

  console.log(server);

  if (!server) {
    throw new Error("Server not found");
  }

  if (!server.node) {
    throw new Error("Server node not found");
  }

  const isAdmin = hasPermission(req.user.permissions, Permissions.ADMIN);
  if (!isAdmin && server.userId !== req.user.id) {
    throw new Error("Access denied");
  }

  try {
    const status = await makeDaemonRequest(
      "get",
      server.node,
      `/api/v1/servers/${server.internalId}`,
    );
    await updateServerState(server.id, status.state);
    return {
      ...server,
      status,
      node: server.node,
      allocation: server.allocation,
      unit: server.unit,
    };
  } catch (error) {
    console.error("Failed to get server status:", error);
    return {
      ...server,
      status: { state: "unknown" },
      node: server.node,
      allocation: server.allocation,
      unit: server.unit,
    };
  }
}

async function updateServerState(serverId: string, state: string) {
  await db.servers.update({ id: serverId }, { state });
}

async function generateCargoUrls(server: any, unit: any): Promise<CargoFile[]> {
  if (!unit.cargoContainers?.length) {
    return [];
  }

  const cargoFiles: CargoFile[] = [];

  for (const container of unit.cargoContainers) {
    const containerData = await db.cargo.findContainer(container.id);
    if (!containerData) continue;

    for (const item of containerData.items) {
      const cargo = await db.cargo.findCargo(item.cargoId);
      if (!cargo) continue;

      if (cargo.type === "local") {
        const expiresAt = Math.floor(Date.now() / 1000) + 900;
        const signature = createHash("sha256")
          .update(
            `${cargo.id}:${server.id}:${expiresAt}:${process.env.APP_KEY}`,
          )
          .digest("hex");

        const url = `/api/cargo/${cargo.id}/download?serverId=${server.id}&expires=${expiresAt}&signature=${signature}`;

        cargoFiles.push({
          id: cargo.id,
          url: `${process.env.APP_URL}${url}`,
          targetPath: item.targetPath,
          properties: cargo.properties,
        });
      } else if (cargo.type === "remote") {
        cargoFiles.push({
          id: cargo.id,
          url: cargo.remoteUrl!,
          targetPath: item.targetPath,
          properties: cargo.properties,
        });
      }
    }
  }

  return cargoFiles;
}

router.get("/:serverId/cargo-files", async (req, res) => {
  try {
    const { serverId } = req.params;
    const { token } = req.query;
    if (token) {
      const server = await db.servers.findUnique({
        where: { id: serverId },
      });

      if (!server) {
        return res.status(404).json({ error: "Server not found" });
      }

      if (server.validationToken !== token) {
        return res.status(403).json({ error: "Invalid token" });
      }
    } else {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const server = await db.servers.findUnique({ where: { id: serverId } });
      if (!server) {
        return res.status(404).json({ error: "Server not found" });
      }

      const isAdmin = hasPermission(req.user.permissions, "admin.servers.view");
      const isOwner = server.userId === req.user.id;

      if (!isAdmin && !isOwner) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
    }

    const server = await db.servers.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    const unitContainers = await db.units.getUnitCargoContainers(server.unitId);

    const cargoFiles: CargoFile[] = [];

    for (const container of unitContainers) {
      if (container.items && Array.isArray(container.items)) {
        for (const item of container.items) {
          const cargo = await db.cargo.findCargo(item.cargoId);

          if (cargo) {
            cargoFiles.push({
              id: cargo.id,
              url: `${req.protocol}://${req.headers.host}/api/cargo/${cargo.id}/download`,
              targetPath: item.targetPath,
              properties: cargo.properties || {
                hidden: false,
                readonly: false,
                noDelete: false,
              },
            });
          }
        }
      }
    }

    res.json({ cargoFiles });
  } catch (error) {
    console.error("Failed to get cargo files:", error);
    res.status(500).json({ error: "Failed to get cargo files" });
  }
});

router.post("/:serverId/cargo/ship", authMiddleware, async (req, res) => {
  try {
    const { serverId } = req.params;

    const server = await db.servers.findUnique({
      where: { id: serverId },
      include: { node: true, unit: true },
    });

    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    if (!hasPermission(req.user?.permissions, "admin")) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    if (!server.node) {
      return res.status(400).json({ error: "Server has no node assigned" });
    }

    if (!server.unit) {
      return res.status(400).json({ error: "Server has no unit assigned" });
    }

    const unitContainers = await db.cargo.getUnitContainers(server.unitId);
    const cargoFiles: CargoFile[] = [];

    for (const container of unitContainers) {
      if (container.items) {
        for (const item of container.items) {
          const cargo = await db.cargo.findCargo(item.cargoId);

          if (cargo) {
            cargoFiles.push({
              id: cargo.id,
              url: `${req.protocol}://${req.headers.host}/api/cargo/${cargo.id}/download`,
              targetPath: item.targetPath,
              properties: cargo.properties,
            });
          }
        }
      }
    }

    const daemonUrl = `http://${server.node.address}:${server.node.daemonPort}/api/servers/${serverId}/cargo/ship`;

    try {
      const axios = require("axios");
      await axios.post(
        daemonUrl,
        { cargo: cargoFiles },
        {
          headers: {
            Authorization: `Bearer ${server.node.daemonKey}`,
          },
        },
      );

      res.json({ message: "Cargo shipped successfully" });
    } catch (daemonError) {
      console.error(
        "Daemon error:",
        daemonError.response?.data || daemonError.message,
      );
      res.status(500).json({
        error: "Failed to ship cargo to daemon",
        message: daemonError.response?.data?.error || daemonError.message,
      });
    }
  } catch (error) {
    console.error("Failed to ship cargo:", error);
    res.status(500).json({ error: "Failed to ship cargo" });
  }
});

router.get("/:internalId/config", async (req, res) => {
  try {
    const server = await db.servers.findFirst({
      where: { internalId: req.params.internalId },
      include: { unit: true },
    });

    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    const config: DaemonServerConfig = {
      dockerImage: server.unit!.dockerImage,
      variables: server.unit!.environmentVariables.map((v) => ({
        name: v.name,
        description: v.description,
        defaultValue: v.defaultValue,
        rules: v.rules,
      })),
      startupCommand: server.unit!.defaultStartupCommand,
      configFiles: server.unit!.configFiles,
      install: {
        dockerImage: server.unit!.installScript.dockerImage,
        entrypoint: server.unit!.installScript.entrypoint || "bash",
        script:
          server.unit!.installScript.script ||
          "# No installation script provided",
      },
    };

    res.json(config);
  } catch (error) {
    console.error("Failed to fetch server config:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:internalId/config", async (req, res) => {
  try {
    const server = await db.servers.findFirst({
      where: { internalId: req.params.internalId },
      include: { unit: true },
    });

    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    const cargoFiles = await generateCargoUrls(server, server.unit);

    const config: DaemonServerConfig = {
      dockerImage: server.unit!.dockerImage,
      variables: server.unit!.environmentVariables.map((v) => ({
        name: v.name,
        description: v.description,
        defaultValue: v.defaultValue,
        rules: v.rules,
      })),
      startupCommand: server.unit!.defaultStartupCommand,
      configFiles: server.unit!.configFiles,
      install: {
        dockerImage: server.unit!.installScript.dockerImage,
        entrypoint: server.unit!.installScript.entrypoint || "bash",
        script:
          server.unit!.installScript.script ||
          "# No installation script provided",
      },
      cargo: cargoFiles,
    };

    res.json(config);
  } catch (error) {
    console.error("Failed to fetch server config:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:internalId/validate/:token", async (req, res) => {
  try {
    const { internalId } = req.params;
    const validationToken = req.params.token;

    console.log("Validation request received:", {
      internalId,
      validationToken,
    });

    const server = await db.servers.findFirst({
      where: { internalId: internalId },
      include: { node: true },
    });

    console.log("Server found:", server);

    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    if (server.validationToken !== validationToken) {
      console.log("Token mismatch:", {
        expected: server.validationToken,
        received: validationToken,
      });
      return res.status(403).json({ error: "Invalid validation token" });
    }

    res.json({
      validated: true,
      server: {
        id: server.id,
        name: server.name,
        internalId: server.internalId,
        node: {
          id: server.node.id,
          name: server.node.name,
          fqdn: server.node.fqdn,
          port: server.node.port,
        },
      },
    });
  } catch (error) {
    console.error("Server validation failed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.use(authMiddleware);

router.post("/", checkPermission(Permissions.ADMIN), async (req: any, res) => {
  try {
    const createServerSchema = z
      .object({
        name: z.string().min(1).max(100),
        nodeId: z.string().uuid().optional(),
        regionId: z.string().uuid().optional(),
        allocationId: z.string().uuid().optional(),
        memoryMiB: z.number().int().min(128),
        diskMiB: z.number().int().min(1024),
        cpuPercent: z.number().min(1).max(100),
        unitId: z.string().uuid(),
        userId: z.string().uuid(),
        projectId: z.string().uuid().optional(),
      })
      .refine((data) => data.nodeId || data.regionId, {
        message: "Either nodeId or regionId must be provided",
      });

    const data = createServerSchema.parse(req.body);
    const serverId = randomUUID();
    const validationToken = randomUUID();

    let nodeId = data.nodeId;
    let allocationId = data.allocationId;

    if (data.regionId) {
      const region = await db.regions.findUnique({ id: data.regionId });
      if (!region) {
        return res.status(404).json({ error: "Region not found" });
      }

      const isAtCapacity = await db.regions.isRegionAtCapacity(data.regionId);
      if (isAtCapacity) {
        return res
          .status(400)
          .json({ error: "Region has reached its server limit" });
      }

      nodeId = await db.regions.findBestNodeInRegion(data.regionId);

      if (!nodeId) {
        return res.status(400).json({
          error: "No available nodes found in region or its fallback",
        });
      }

      if (!allocationId) {
        const allocation = await db.allocations.findFirst({
          where: { nodeId, assigned: false },
        });

        if (!allocation) {
          return res
            .status(400)
            .json({ error: "No available allocations found on selected node" });
        }

        allocationId = allocation.id;
      }
    } else {
      if (!nodeId) {
        return res
          .status(400)
          .json({ error: "NodeId is required when regionId is not provided" });
      }

      if (!allocationId) {
        const allocation = await db.allocations.findFirst({
          where: { nodeId, assigned: false },
        });

        if (!allocation) {
          return res
            .status(400)
            .json({ error: "No available allocations found on selected node" });
        }

        allocationId = allocation.id;
      }
    }

    const node = await db.nodes.findUnique({ id: nodeId });
    if (!node) {
      return res.status(404).json({ error: "Node not found" });
    }
    if (!node.isOnline) {
      return res.status(400).json({ error: "Node is offline" });
    }

    const allocation = await db.allocations.findUnique({ id: allocationId });
    if (!allocation) {
      return res.status(404).json({ error: "Allocation not found" });
    }
    if (allocation.assigned) {
      return res.status(400).json({ error: "Allocation is already in use" });
    }
    if (allocation.nodeId !== nodeId) {
      return res
        .status(400)
        .json({ error: "Allocation does not belong to selected node" });
    }

    const unit = await db.units.findUnique({ id: data.unitId });
    if (!unit) {
      return res.status(404).json({ error: "Unit not found" });
    }

    await db.allocations.update({ id: allocation.id }, { assigned: true });

    const server = await db.servers.create({
      ...data,
      nodeId,
      allocationId,
      id: serverId,
      internalId: serverId,
      validationToken,
      state: "creating",
    });

    try {
      const daemonResponse = await makeDaemonRequest(
        "post",
        node,
        "/api/v1/servers",
        {
          serverId,
          validationToken,
          name: data.name,
          memoryLimit: data.memoryMiB * 1024 * 1024,
          cpuLimit: Math.floor((data.cpuPercent * 1024) / 100),
          allocation: {
            bindAddress: allocation.bindAddress,
            port: allocation.port,
          },
        },
      );

      if (daemonResponse.validationToken !== validationToken) {
        throw new Error("Daemon validation failed");
      }

      await updateServerState(server.id, "installing");

      res.status(201).json(server);
    } catch (error) {
      await db.allocations.update({ id: allocation.id }, { assigned: false });
      await db.servers.delete({ id: server.id });
      throw error;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Failed to create server:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch(
  "/:id",
  checkPermission(Permissions.ADMIN),
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateData = updateServerSchema.parse(req.body);

      const server = await db.servers.findUnique({
        where: { id },
        include: {
          node: true,
          allocation: true,
          unit: true,
        },
      });

      if (!server) {
        return res.status(404).json({ error: "Server not found" });
      }

      if (!server.node) {
        return res.status(400).json({ error: "Server has no node assigned" });
      }

      let unitChanged = false;
      let unitData = server.unit;

      if (updateData.unitId && updateData.unitId !== server.unitId) {
        unitChanged = true;
        unitData = await db.units.findUnique({ id: updateData.unitId });

        if (!unitData) {
          return res.status(404).json({ error: "Unit not found" });
        }
      }

      await updateServerState(server.id, "updating");

      const daemonUpdateData = {
        serverId: server.internalId,
        name: updateData.name || server.name,
        memoryLimit: (updateData.memoryMiB || server.memoryMiB) * 1024 * 1024,
        cpuLimit: Math.floor(
          ((updateData.cpuPercent || server.cpuPercent) * 1024) / 100,
        ),
        allocation: {
          bindAddress: server.allocation!.bindAddress,
          port: server.allocation!.port,
        },
        unitChanged: unitChanged,
        dockerImage: unitData!.dockerImage,
      };

      await makeDaemonRequest(
        "patch",
        server.node,
        `/api/v1/servers/${server.internalId}`,
        daemonUpdateData,
      );

      const updatedServer = await db.servers.update(
        { id: server.id },
        {
          ...updateData,
          state: "running",
        },
      );

      res.json(updatedServer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Failed to update server:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.post(
  "/:id/cargo/ship",
  checkPermission(Permissions.USER),
  async (req: any, res) => {
    try {
      const server = await checkServerAccess(req, req.params.id);

      const cargoFiles = await generateCargoUrls(server, server.unit);

      await makeDaemonRequest(
        "post",
        server.node!,
        `/api/v1/servers/${server.internalId}/cargo/ship`,
        { cargo: cargoFiles },
      );

      res.status(204).send();
    } catch (error: any) {
      if (error.message === "Server not found") {
        return res.status(404).json({ error: "Server not found" });
      }
      if (error.message === "Access denied") {
        return res.status(403).json({ error: "Access denied" });
      }
      console.error("Failed to ship cargo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.delete(
  "/:id",
  checkPermission(Permissions.USER),
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const server = await checkServerAccess(req, id);

      try {
        await makeDaemonRequest(
          "delete",
          server.node!,
          `/api/v1/servers/${server.internalId}`,
        );
        if (server.allocation) {
          await db.allocations.update({
            where: { id: server.allocation.id },
            data: { assigned: false },
          });
        }

        await db.servers.delete({
          where: { id: server.id },
        });
      } catch (error) {
        console.error("Failed to delete server on daemon:", error);
      }

      res.status(204).send();
    } catch (error: any) {
      if (error.message === "Server not found") {
        return res.status(404).json({ error: "Server not found" });
      }
      if (error.message === "Access denied") {
        return res.status(403).json({ error: "Access denied" });
      }
      console.error("Failed to delete server:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.get("/", checkPermission(Permissions.USER), async (req: any, res) => {
  try {
    const isAdmin = hasPermission(req.user.permissions, Permissions.ADMIN);
    const where = isAdmin ? undefined : { userId: req.user.id };

    const servers = await db.servers.findMany({
      where,
      include: {
        unit: true,
        node: true,
        user: true,
        allocation: true,
      },
    });

    const serversWithStatus = await Promise.all(
      servers.map(async (server) => {
        try {
          const status = await makeDaemonRequest(
            "get",
            server.node!,
            `/api/v1/servers/${server.internalId}`,
          );
          await updateServerState(server.id, status.state);
          return {
            ...server,
            status,
            node: {
              ...server.node,
              connectionKey: undefined,
            },
          };
        } catch (error) {
          return {
            ...server,
            status: { state: "unknown" },
            node: {
              ...server.node,
              connectionKey: undefined,
            },
          };
        }
      }),
    );

    res.json(serversWithStatus);
  } catch (error) {
    console.error("Failed to fetch servers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", checkPermission(Permissions.USER), async (req: any, res) => {
  try {
    const server = await checkServerAccess(req, req.params.id);
    res.json({
      ...server,
      node: {
        ...server.node,
        connectionKey: undefined,
      },
    });
  } catch (error: any) {
    if (error.message === "Server not found") {
      return res.status(404).json({ error: "Server not found" });
    }
    if (error.message === "Access denied") {
      return res.status(403).json({ error: "Access denied" });
    }
    console.error("Failed to fetch server:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post(
  "/:id/power/:action",
  checkPermission(Permissions.USER),
  async (req: any, res) => {
    try {
      const { action } = req.params;

      if (!["start", "stop", "restart"].includes(action)) {
        return res.status(400).json({ error: "Invalid power action" });
      }

      const server = await checkServerAccess(req, req.params.id);

      const pendingState =
        action === "start"
          ? "starting"
          : action === "stop"
            ? "stopping"
            : "restarting";
      await updateServerState(server.id, pendingState);

      await makeDaemonRequest(
        "post",
        server.node!,
        `/api/v1/servers/${server.internalId}/power/${action}`,
      );

      try {
        const status = await makeDaemonRequest(
          "get",
          server.node!,
          `/api/v1/servers/${server.internalId}`,
        );
        await updateServerState(server.id, status.state);
      } catch (error) {
        console.error("Failed to get updated server state:", error);
      }

      res.status(204).send();
    } catch (error: any) {
      if (error.message === "Server not found") {
        return res.status(404).json({ error: "Server not found" });
      }
      if (error.message === "Access denied") {
        return res.status(403).json({ error: "Access denied" });
      }
      console.error("Failed to execute power action:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.post(
  "/:id/reinstall",
  checkPermission(Permissions.USER),
  async (req: any, res) => {
    try {
      const server = await checkServerAccess(req, req.params.id);

      await updateServerState(server.id, "reinstalling");

      await makeDaemonRequest(
        "post",
        server.node!,
        `/api/v1/servers/${server.internalId}/reinstall`,
      );

      res.status(204).send();
    } catch (error: any) {
      if (error.message === "Server not found") {
        return res.status(404).json({ error: "Server not found" });
      }
      if (error.message === "Server not found") {
        return res.status(404).json({ error: "Server not found" });
      }
      if (error.message === "Access denied") {
        return res.status(403).json({ error: "Access denied" });
      }
      console.error("Failed to reinstall server:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.patch(
  "/:id",
  checkPermission(Permissions.USER),
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;

      if (
        !name ||
        typeof name !== "string" ||
        name.length < 1 ||
        name.length > 100
      ) {
        return res.status(400).json({ error: "Invalid server name" });
      }

      const server = await checkServerAccess(req, id);

      await db.servers.update({
        where: { id },
        data: { name },
      });

      res.json({ message: "Server name updated successfully" });
    } catch (error: any) {
      if (error.message === "Server not found") {
        return res.status(404).json({ error: "Server not found" });
      }
      if (error.message === "Access denied") {
        return res.status(403).json({ error: "Access denied" });
      }
      console.error("Failed to update server name:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
