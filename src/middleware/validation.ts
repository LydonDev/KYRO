import { Request, Response, NextFunction } from "express";
import { z } from "zod";

export function validateRequest(schema: z.ZodType<any, any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          issues: error.errors,
        });
      }
      return res.status(400).json({ error: "Invalid request data" });
    }
  };
}
