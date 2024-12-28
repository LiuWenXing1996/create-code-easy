import { z } from "zod";

export const TemplateMetaVarSchema = z.union([
  z.object({
    type: z.literal("input"),
    description: z.string().optional(),
    required: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("select"),
    description: z.string().optional(),
    choices: z.array(
      z.object({
        name: z.string(),
        value: z.string(),
        description: z.string().optional(),
      })
    ),
  }),
  z.object({
    type: z.literal("confirm"),
    description: z.string().optional(),
    default: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("number"),
    description: z.string().optional(),
    default: z.number().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.union([z.number(), z.literal("any")]).optional(),
    required: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("checkbox"),
    description: z.string().optional(),
    required: z.boolean().optional(),
    join: z.string().optional(),
    choices: z.array(
      z.object({
        name: z.string(),
        value: z.string(),
        description: z.string().optional(),
      })
    ),
  }),
]);

export type TemplateMetaVar = z.infer<typeof TemplateMetaVarSchema>;

export const TemplateMetaSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  keepMeta: z.boolean().optional(),
  files: z.array(z.string()).optional(),
  vars: z.record(z.string(), TemplateMetaVarSchema).optional(),
});

export type TemplateMeta = z.infer<typeof TemplateMetaSchema>;
