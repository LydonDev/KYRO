import { Router } from "express";
import { z } from "zod";
import { hasPermission } from "../permissions";
import { db } from "../db";
import multer from "multer";
import { authMiddleware } from "../middleware/auth";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const environmentVariableSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  defaultValue: z.string(),
  required: z.boolean().default(false),
  userViewable: z.boolean().default(true),
  userEditable: z.boolean().default(false),
  rules: z.string(),
});

const configFileSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
});

const installScriptSchema = z.object({
  dockerImage: z.string(),
  entrypoint: z.string().default("bash"),
  script: z.string(),
});

const unitSchema = z.object({
  name: z.string().min(1).max(100),
  shortName: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[a-z0-9-]+$/),
  description: z.string(),
  dockerImage: z.string(),
  defaultStartupCommand: z.string(),
  configFiles: z.array(configFileSchema).default([]),
  environmentVariables: z.array(environmentVariableSchema).default([]),
  installScript: installScriptSchema,
  startup: z
    .object({
      userEditable: z.boolean().default(false),
    })
    .default({}),
});

const router = Router();
router.use(authMiddleware);

const checkPermission =
  (permission: string) => (req: any, res: any, next: any) => {
    if (!hasPermission(req.user.permissions, permission)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };

router.get("/", checkPermission("admin"), async (req, res) => {
  try {
    const units = await db.units.findMany({
      orderBy: { name: "asc" },
    });
    res.json(units);
  } catch (error) {
    console.error("Failed to fetch units:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", checkPermission("admin"), async (req, res) => {
  try {
    const unit = await db.units.findUnique({ id: req.params.id });

    if (!unit) {
      return res.status(404).json({ error: "Unit not found" });
    }

    res.json(unit);
  } catch (error) {
    console.error("Failed to fetch unit:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", checkPermission("admin"), async (req, res) => {
  try {
    const data = unitSchema.parse(req.body);

    const existing = await db.units.findFirst({
      where: { shortName: data.shortName },
    });

    if (existing) {
      return res.status(400).json({ error: "Short name must be unique" });
    }

    const unit = await db.units.create({
      ...data,
      configFiles: data.configFiles || [],
      environmentVariables: data.environmentVariables || [],
      startup: data.startup || { userEditable: false },
    });

    res.status(201).json(unit);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Failed to create unit:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", checkPermission("admin"), async (req, res) => {
  try {
    const data = unitSchema.partial().parse(req.body);

    if (data.shortName) {
      const existing = await db.units.findFirst({
        where: { shortName: data.shortName },
      });

      if (existing && existing.id !== req.params.id) {
        return res.status(400).json({ error: "Short name must be unique" });
      }
    }

    const unit = await db.units.update({ id: req.params.id }, data);

    res.json(unit);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Failed to update unit:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", checkPermission("admin"), async (req, res) => {
  try {
    const servers = await db.servers.findMany({
      where: { unitId: req.params.id },
    });

    if (servers.length > 0) {
      return res
        .status(400)
        .json({ error: "Cannot delete unit that is in use by servers" });
    }

    await db.units.delete({ id: req.params.id });
    res.status(204).send();
  } catch (error) {
    console.error("Failed to delete unit:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/export", checkPermission("admin"), async (req, res) => {
  try {
    const unit = await db.units.findUnique({ id: req.params.id });

    if (!unit) {
      return res.status(404).json({ error: "Unit not found" });
    }

    const exportData = {
      name: unit.name,
      shortName: unit.shortName,
      description: unit.description,
      dockerImage: unit.dockerImage,
      defaultStartupCommand: unit.defaultStartupCommand,
      configFiles: unit.configFiles,
      environmentVariables: unit.environmentVariables,
      installScript: unit.installScript,
      startup: unit.startup,
    };

    res.attachment(`unit-${unit.shortName}.json`);
    res.json(exportData);
  } catch (error) {
    console.error("Failed to export unit:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post(
  "/import",
  checkPermission("admin"),
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const fileContent = req.file.buffer.toString("utf-8");
      const data = unitSchema.parse(JSON.parse(fileContent));

      let shortName = data.shortName;
      let counter = 1;

      while (await db.units.findFirst({ where: { shortName } })) {
        shortName = `${data.shortName}-${counter}`;
        counter++;
      }

      const unit = await db.units.create({
        ...data,
        shortName,
        configFiles: data.configFiles || [],
        environmentVariables: data.environmentVariables || [],
        startup: data.startup || { userEditable: false },
      });

      res.status(201).json(unit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid unit configuration" });
      }
      console.error("Failed to import unit:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.get("/:id/containers", checkPermission("admin"), async (req, res) => {
  try {
    const unit = await db.units.findUnique({ id: req.params.id });

    if (!unit) {
      return res.status(404).json({ error: "Unit not found" });
    }

    const containers = await db.units.getUnitCargoContainers(req.params.id);
    res.json(containers);
  } catch (error) {
    console.error("Failed to fetch unit containers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post(
  "/:unitId/containers/:containerId",
  checkPermission("admin"),
  async (req, res) => {
    try {
      const { unitId, containerId } = req.params;

      const unit = await db.units.findUnique({ id: unitId });
      if (!unit) {
        return res.status(404).json({ error: "Unit not found" });
      }

      const container = await db.cargo.findContainer(containerId);
      if (!container) {
        return res.status(404).json({ error: "Container not found" });
      }

      await db.units.assignCargoContainer(unitId, containerId);

      res.status(204).send();
    } catch (error) {
      console.error("Failed to assign container to unit:", error);
      res.status(500).json({ error: "Failed to assign container" });
    }
  },
);

router.delete(
  "/:unitId/containers/:containerId",
  checkPermission("admin"),
  async (req, res) => {
    try {
      const { unitId, containerId } = req.params;

      const unit = await db.units.findUnique({ id: unitId });
      if (!unit) {
        return res.status(404).json({ error: "Unit not found" });
      }

      await db.units.removeCargoContainer(unitId, containerId);

      res.status(204).send();
    } catch (error) {
      console.error("Failed to remove container from unit:", error);
      res.status(500).json({ error: "Failed to remove container" });
    }
  },
);

export default router;
