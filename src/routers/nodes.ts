import { Router } from "express";
import { z } from "zod";
import { hasPermission } from "../permissions";
import { authMiddleware } from "../middleware/auth";
import { db } from "../db";
import net from "net";

const router = Router();
router.use(authMiddleware);

const createNodeSchema = z.object({
  name: z.string().min(1).max(100),
  fqdn: z
    .string()
    .regex(/^(localhost|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|(\d{1,3}\.){3}\d{1,3})$/),
  port: z.number().int().min(1).max(65535),
});

const createAllocationSchema = z.object({
  bindAddress: z.string(),
  port: z.number().int().min(1).max(65535),
  alias: z.string().optional(),
  notes: z.string().optional(),
});

const createAllocationRangeSchema = z.object({
  bindAddress: z.string(),
  portRange: z.object({
    start: z.number().int().min(1).max(65535),
    end: z.number().int().min(1).max(65535),
  }),
  alias: z.string().optional(),
  notes: z.string().optional(),
});

const updateNodeSchema = createNodeSchema.partial();

async function checkNodeStatus(fqdn: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 5000; 

    socket.setTimeout(timeout);

    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });

    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, fqdn);
  });
}

function checkPermission(permission: string) {
  return (req: any, res: any, next: any) => {
    if (!hasPermission(req.user.permissions, permission)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

router.patch("/:id/region", checkPermission("admin"), async (req, res) => {
  try {
    const schema = z.object({
      regionId: z.string().uuid().nullable(),
    });

    const { regionId } = schema.parse(req.body);

    const node = await db.nodes.findUnique({ id: req.params.id });

    if (!node) {
      return res.status(404).json({ error: "Node not found" });
    }

    if (regionId) {
      const region = await db.regions.findUnique({ id: regionId });
      if (!region) {
        return res.status(404).json({ error: "Region not found" });
      }
    }

    const updatedNode = await db.nodes.update(
      { id: req.params.id },
      { regionId },
    );

    res.json(updatedNode);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error updating node region:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/region/:regionId", checkPermission("admin"), async (req, res) => {
  try {
    const { regionId } = req.params;

    const region = await db.regions.findUnique({ id: regionId });
    if (!region) {
      return res.status(404).json({ error: "Region not found" });
    }

    const nodes = await db.nodes.findMany({
      where: { regionId },
    });

    res.json(nodes);
  } catch (error) {
    console.error("Error fetching nodes in region:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", checkPermission("admin"), async (req, res) => {
  try {
    const nodes = await db.nodes.findMany();

    const nodesWithStatus = await Promise.all(
      nodes.map(async (node) => {
        const isOnline = await checkNodeStatus(node.fqdn, node.port);
        const lastChecked = new Date();

        if (isOnline !== node.isOnline) {
          await db.nodes.update({ id: node.id }, { isOnline, lastChecked });
        }

        const allocations = await db.allocations.findMany({
          where: { nodeId: node.id },
        });

        return {
          ...node,
          isOnline,
          lastChecked,
          allocations,
        };
      }),
    );

    res.json(nodesWithStatus);
  } catch (error) {
    console.error("Error fetching nodes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", checkPermission("admin"), async (req, res) => {
  try {
    const node = await db.nodes.findUnique({ id: req.params.id });

    if (!node) {
      return res.status(404).json({ error: "Node not found" });
    }

    const isOnline = await checkNodeStatus(node.fqdn, node.port);
    const lastChecked = new Date();

    if (isOnline !== node.isOnline) {
      await db.nodes.update({ id: node.id }, { isOnline, lastChecked });
    }

    const allocations = await db.allocations.findMany({
      where: { nodeId: node.id },
    });

    const responseNode = {
      ...node,
      isOnline,
      lastChecked,
      allocations,
    };

    res.json(responseNode);
  } catch (error) {
    console.error("Error fetching node:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", checkPermission("admin"), async (req, res) => {
  try {
    const validatedData = createNodeSchema.parse(req.body);

    const existingNode = await db.nodes.findFirst({
      where: { name: validatedData.name },
    });

    if (existingNode) {
      return res
        .status(400)
        .json({ error: "Node with this name already exists" });
    }

    const isOnline = await checkNodeStatus(
      validatedData.fqdn,
      validatedData.port,
    );

    const node = await db.nodes.create({
      ...validatedData,
      isOnline,
      lastChecked: new Date(),
    });

    res.status(201).json(node);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error creating node:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", checkPermission("admin"), async (req, res) => {
  try {
    const validatedData = updateNodeSchema.parse(req.body);

    const existingNode = await db.nodes.findUnique({ id: req.params.id });

    if (!existingNode) {
      return res.status(404).json({ error: "Node not found" });
    }

    let isOnline = existingNode.isOnline;
    if (validatedData.fqdn || validatedData.port) {
      isOnline = await checkNodeStatus(
        validatedData.fqdn || existingNode.fqdn,
        validatedData.port || existingNode.port,
      );
    }

    const updatedNode = await db.nodes.update(
      { id: req.params.id },
      {
        ...validatedData,
        isOnline,
        lastChecked: new Date(),
      },
    );

    res.json(updatedNode);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error updating node:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", checkPermission("admin"), async (req, res) => {
  try {
    const node = await db.nodes.findUnique({ id: req.params.id });

    if (!node) {
      return res.status(404).json({ error: "Node not found" });
    }

    // Check for existing servers
    const servers = await db.servers.findMany({
      where: { nodeId: req.params.id },
    });

    if (servers.length > 0) {
      return res.status(400).json({
        error: "Cannot delete node with active servers",
        count: servers.length,
      });
    }

    const allocations = await db.allocations.findMany({
      where: { nodeId: node.id },
    });

    for (const allocation of allocations) {
      await db.allocations.delete({ id: allocation.id });
    }

    await db.nodes.delete({ id: req.params.id });
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting node:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/allocations", checkPermission("admin"), async (req, res) => {
  try {
    const node = await db.nodes.findUnique({ id: req.params.id });
    if (!node) {
      return res.status(404).json({ error: "Node not found" });
    }

    if ("port" in req.body) {
      const validatedData = createAllocationSchema.parse(req.body);

      const existingAllocation = await db.allocations.findFirst({
        where: {
          nodeId: node.id,
          port: validatedData.port,
          bindAddress: validatedData.bindAddress,
        },
      });

      if (existingAllocation) {
        return res.status(400).json({
          error: "Port already allocated on this node and bind address",
        });
      }

      const allocation = await db.allocations.create({
        ...validatedData,
        nodeId: node.id,
      });

      res.status(201).json(allocation);
    }
    else if ("portRange" in req.body) {
      const validatedData = createAllocationRangeSchema.parse(req.body);
      const { portRange, ...rest } = validatedData;

      if (portRange.start > portRange.end) {
        return res.status(400).json({ error: "Invalid port range" });
      }

      const allocations: any[] = [];
      for (let port = portRange.start; port <= portRange.end; port++) {
        const existingAllocation = await db.allocations.findFirst({
          where: {
            nodeId: node.id,
            port,
            bindAddress: rest.bindAddress,
          },
        });

        if (!existingAllocation) {
          const allocation = await db.allocations.create({
            ...rest,
            port,
            nodeId: node.id,
          });
          allocations.push(allocation);
        }
      }

      res.status(201).json(allocations);
    } else {
      res.status(400).json({ error: "Invalid allocation request" });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error creating allocation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete(
  "/:nodeId/allocations/:allocationId",
  checkPermission("admin"),
  async (req, res) => {
    try {
      const allocation = await db.allocations.findUnique({
        id: req.params.allocationId,
      });

      if (!allocation) {
        return res.status(404).json({ error: "Allocation not found" });
      }

      if (allocation.nodeId !== req.params.nodeId) {
        return res
          .status(400)
          .json({ error: "Allocation does not belong to this node" });
      }

      if (allocation.assigned) {
        return res.status(400).json({
          error: "Cannot delete allocation that is in use by a server",
        });
      }

      await db.allocations.delete({ id: allocation.id });
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting allocation:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
