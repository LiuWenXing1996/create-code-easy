import path from "node:path";
import { AbsolutePath, MaybePromise } from "./utils/common";
import { resolveTemplates, TemplateConfig } from "./utils/template";

export interface CreateConfig {
  root?: string;
  templates?: string[];
  resolveTemplates?: (params: {
    absoluteRoot: string;
    templatesDir: string;
  }) => MaybePromise<TemplateConfig[]>;
  onError?: (error: Error) => void;
}

export type CreateConfigFunc = (params: {
  root: string;
}) => MaybePromise<CreateConfig>;

export const defineConfig = (
  config: CreateConfig | CreateConfigFunc
): CreateConfig | CreateConfigFunc => config;

export const resolveRootByConfig = (config: CreateConfig) => {
  const root = config.root;
  const absoluteRoot = path.resolve(root || "");
  return new AbsolutePath(absoluteRoot);
};

export const resolveTemplatesByConfig = async (
  config: CreateConfig
): Promise<TemplateConfig[]> => {
  const configTemplates = config.templates || [];
  const absoluteRoot = resolveRootByConfig(config);
  const finalResolveTemplates = async (templatesDir: string) => {
    if (config.resolveTemplates) {
      return await config.resolveTemplates({
        absoluteRoot: absoluteRoot.content,
        templatesDir,
      });
    } else {
      const templatesAbsoluteDir = absoluteRoot.resolve(templatesDir);
      return await resolveTemplates(templatesAbsoluteDir.content);
    }
  };
  const templateListList = await Promise.all([
    ...configTemplates.map(async (templatesDir) => {
      return await finalResolveTemplates(templatesDir);
    }),
  ]);
  return templateListList.flat();
};
