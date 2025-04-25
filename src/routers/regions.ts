import { Router } from "express";
import { z } from "zod";
import { hasPermission } from "../permissions";
import { authMiddleware, checkPermission } from "../middleware/auth";
import { db } from "../db";
import { Permissions } from "../permissions";

const router = Router();
router.use(authMiddleware);

const createRegionSchema = z.object({
  name: z.string().min(1).max(100),
  identifier: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .min(2)
    .max(20),
  countryId: z.string().max(2).optional(),
  fallbackRegionId: z.string().uuid().optional(),
  serverLimit: z.number().int().min(1).optional(),
});

const updateRegionSchema = createRegionSchema.partial();

function checkAdminPermission(req: any, res: any, next: any) {
  if (!hasPermission(req.user.permissions, Permissions.ADMIN)) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  next();
}

router.get("/", async (req, res) => {
  try {
    const regions = await db.regions.findMany();

    const regionsWithStats = await Promise.all(
      regions.map(async (region) => {
        const nodeIds = region.nodes.map((node) => node.id);

        let serverCount = 0;
        if (nodeIds.length > 0) {
          const nodeIdsString = nodeIds.map((id) => `'${id}'`).join(",");
          const result = db.db
            .prepare(
              `
          SELECT COUNT(*) as count FROM servers 
          WHERE nodeId IN (${nodeIdsString})
        `,
            )
            .get() as { count: number };

          serverCount = result.count;
        }

        return {
          ...region,
          stats: {
            serverCount,
            nodeCount: region.nodes.length,
            onlineNodeCount: region.nodes.filter((node) => node.isOnline)
              .length,
          },
        };
      }),
    );

    res.json(regionsWithStats);
  } catch (error) {
    console.error("Error fetching regions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const region = await db.regions.findUnique({ id: req.params.id });

    if (!region) {
      return res.status(404).json({ error: "Region not found" });
    }

    const nodeIds = region.nodes.map((node) => node.id);

    let serverCount = 0;
    if (nodeIds.length > 0) {
      const nodeIdsString = nodeIds.map((id) => `'${id}'`).join(",");
      const result = db.db
        .prepare(
          `
        SELECT COUNT(*) as count FROM servers 
        WHERE nodeId IN (${nodeIdsString})
      `,
        )
        .get() as { count: number };

      serverCount = result.count;
    }

    res.json({
      ...region,
      stats: {
        serverCount,
        nodeCount: region.nodes.length,
        onlineNodeCount: region.nodes.filter((node) => node.isOnline).length,
        atCapacity: region.serverLimit
          ? serverCount >= region.serverLimit
          : false,
      },
    });
  } catch (error) {
    console.error("Error fetching region:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", checkAdminPermission, async (req, res) => {
  try {
    const validatedData = createRegionSchema.parse(req.body);

    const existingRegion = await db.regions.findByIdentifier({
      identifier: validatedData.identifier,
    });

    if (existingRegion) {
      return res
        .status(400)
        .json({ error: "Region with this identifier already exists" });
    }

    if (validatedData.fallbackRegionId) {
      const fallbackRegion = await db.regions.findUnique({
        id: validatedData.fallbackRegionId,
      });

      if (!fallbackRegion) {
        return res.status(400).json({ error: "Fallback region not found" });
      }
    }

    const region = await db.regions.create(validatedData);

    res.status(201).json(region);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error creating region:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", checkAdminPermission, async (req, res) => {
  try {
    const validatedData = updateRegionSchema.parse(req.body);

    const existingRegion = await db.regions.findUnique({ id: req.params.id });

    if (!existingRegion) {
      return res.status(404).json({ error: "Region not found" });
    }

    if (
      validatedData.identifier &&
      validatedData.identifier !== existingRegion.identifier
    ) {
      const duplicateRegion = await db.regions.findByIdentifier({
        identifier: validatedData.identifier,
      });

      if (duplicateRegion) {
        return res
          .status(400)
          .json({ error: "Region with this identifier already exists" });
      }
    }

    if (validatedData.fallbackRegionId) {
      if (validatedData.fallbackRegionId === req.params.id) {
        return res
          .status(400)
          .json({ error: "Region cannot be its own fallback" });
      }

      const fallbackRegion = await db.regions.findUnique({
        id: validatedData.fallbackRegionId,
      });

      if (!fallbackRegion) {
        return res.status(400).json({ error: "Fallback region not found" });
      }
    }

    const updatedRegion = await db.regions.update(
      { id: req.params.id },
      validatedData,
    );

    res.json(updatedRegion);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error updating region:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", checkAdminPermission, async (req, res) => {
  try {
    const region = await db.regions.findUnique({ id: req.params.id });

    if (!region) {
      return res.status(404).json({ error: "Region not found" });
    }

    await db.regions.delete({ id: req.params.id });

    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting region:", error);

    if (error.message.includes("assigned nodes")) {
      return res.status(400).json({
        error:
          "Cannot delete region with assigned nodes. Reassign all nodes before deleting.",
      });
    }

    if (error.message.includes("used as a fallback")) {
      return res.status(400).json({
        error:
          "Cannot delete region that is used as a fallback by other regions. Update those regions first.",
      });
    }

    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/allocations", async (req, res) => {
  try {
    const region = await db.regions.findUnique({ id: req.params.id });

    if (!region) {
      return res.status(404).json({ error: "Region not found" });
    }

    const nodeIds = region.nodes.map((node) => node.id);

    if (nodeIds.length === 0) {
      return res.json([]);
    }

    const nodeIdsString = nodeIds.map((id) => `'${id}'`).join(",");
    const allocations = db.db
      .prepare(
        `
      SELECT * FROM allocations 
      WHERE nodeId IN (${nodeIdsString}) AND assigned = 0
    `,
      )
      .all() as any[];

    const allocationsWithNodes = await Promise.all(
      allocations.map(async (allocation: any) => {
        const node = await db.nodes.findUnique({ id: allocation.nodeId });
        return {
          ...allocation,
          node: {
            id: node?.id,
            name: node?.name,
            fqdn: node?.fqdn,
          },
          assigned: !!allocation.assigned,
          createdAt: new Date(allocation.createdAt),
          updatedAt: new Date(allocation.updatedAt),
        };
      }),
    );

    res.json(allocationsWithNodes);
  } catch (error) {
    console.error("Error fetching region allocations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
