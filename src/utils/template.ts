import fs from "fs-extra";
import path from "node:path";
import { template } from "radash";
import { AbsolutePath, listChildDir, listFiles } from "./common";
import micromatch from "micromatch";
import { TemplateMeta } from "@/meta";

export interface TemplateConfig {
  path: AbsolutePath;
  meta: TemplateMeta;
}

export type TemplateInputData = Record<
  string,
  string | number | undefined | null | boolean
>;

export const TemplateMetaFileName = "_template_meta_.json";

export const resolveTemplates = async (
  templatesAbsoluteDir: string
): Promise<TemplateConfig[]> => {
  const templatesDir = new AbsolutePath(templatesAbsoluteDir);
  const templateDirList = await listChildDir(templatesDir.content);
  const templates: TemplateConfig[] = [];

  for (const templateDir of templateDirList) {
    const templateAbsoluteDir = new AbsolutePath(templateDir);
    const templateConfig = await resolveTemplateConfig({
      templateDir: templateAbsoluteDir,
    });
    if (templateConfig) {
      templates.push({
        meta: templateConfig,
        path: templateAbsoluteDir,
      });
    }
  }

  return templates;
};

export const resolveTemplateConfig = async (params: {
  templateDir: AbsolutePath;
}): Promise<TemplateMeta | undefined> => {
  try {
    const { templateDir } = params;
    const tplConfigJsonPath = path.resolve(
      templateDir.content,
      TemplateMetaFileName
    );
    const templateConfig = (await fs.readJson(tplConfigJsonPath)) as
      | Partial<TemplateMeta>
      | undefined;

    if (!templateConfig) {
      return;
    }

    if (!templateConfig.name) {
      return;
    }
    return {
      name: templateConfig.name,
      description: templateConfig.description,
      files: templateConfig.files,
      keepMeta: templateConfig.keepMeta,
      vars: templateConfig.vars,
    };
  } catch (error) {}
};

export const collectNeedModifyProjectFiles = async (params: {
  targetDir: AbsolutePath;
  meta: TemplateMeta;
}): Promise<AbsolutePath[]> => {
  const files: AbsolutePath[] = [];
  const { meta, targetDir } = params;
  const projectFiles = await listFiles(targetDir.content);
  const projectRelativeFiles = projectFiles.map((e) => {
    return path.relative(targetDir.content, e);
  });
  const matchedFiles = micromatch(projectRelativeFiles, meta.files || ["**"]);
  for (const matchedFile of matchedFiles) {
    files.push(targetDir.resolve(matchedFile));
  }
  return files;
};

export const modifyTemplateFileContent = async (params: {
  content: string;
  data: TemplateInputData;
}) => {
  const { content, data } = params;
  let newFileContent = content || "";
  for (const varKey of Object.keys(data)) {
    newFileContent = template(newFileContent, {
      [varKey]: data[varKey],
    });
  }
  return newFileContent;
};

export const modifyProjectFiles = async (params: {
  targetDir: AbsolutePath;
  meta: TemplateMeta;
  data: TemplateInputData;
}) => {
  const { meta, targetDir, data } = params;
  const { keepMeta } = meta;
  const needModifyProjectFiles = await collectNeedModifyProjectFiles({
    targetDir,
    meta,
  });
  for (const needModifyProjectFile of needModifyProjectFiles) {
    if (needModifyProjectFile.content.indexOf(targetDir.content) !== 0) {
      throw new Error(
        `${needModifyProjectFile.content} 必须包含在 ${targetDir.content} 内`
      );
    }
    const fileContent = await fs.readFile(
      needModifyProjectFile.content,
      "utf-8"
    );
    let newFileContent = await modifyTemplateFileContent({
      content: fileContent,
      data,
    });
    await fs.outputFile(needModifyProjectFile.content, newFileContent);
  }
  if (!keepMeta) {
    const metaFilePath = targetDir.resolve(TemplateMetaFileName);
    fs.rm(metaFilePath.content, { force: true });
  }
};

export const createProjectByTemplate = async (params: {
  templateDir: AbsolutePath;
  targetDir: AbsolutePath;
  data: TemplateInputData;
}) => {
  const { templateDir, targetDir, data } = params;
  const templateMeta = await resolveTemplateConfig({ templateDir });
  if (!templateMeta) {
    throw new Error(`${templateDir.content} undefined templateMeta`);
  }
  await fs.copy(templateDir.content, targetDir.content);
  await modifyProjectFiles({ targetDir, meta: templateMeta, data });
};
