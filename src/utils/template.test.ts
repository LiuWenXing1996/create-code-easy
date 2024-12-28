import { expect, test, describe } from "vitest";
import {
  modifyProjectFiles,
  resolveTemplates,
  resolveTemplateConfig,
  collectNeedModifyProjectFiles,
  createProjectByTemplate,
  TemplateInputData,
  modifyTemplateFileContent,
} from "./template";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { AbsolutePath } from "./common";
import { TemplateMeta } from "@/meta";

const currentDir = new AbsolutePath(
  path.dirname(fileURLToPath(import.meta.url))
);
const templatesDir = currentDir.resolve("../../templates/");
const dataDir = currentDir.resolve("../../data/");

describe("resolveTemplates", () => {
  test("至少找到一个以一个模板", async () => {
    const templates = await resolveTemplates(templatesDir.content);
    expect(templates.length > 0).toBeTruthy();
  });
});

describe("modifyTemplateFileContent", () => {
  test("修改模板内容", async () => {
    const modifiedContent = await modifyTemplateFileContent({
      content: `
{{CODE_PATH_NAME}}

1234{{CODE_PATH_NAME}}567
      `,
      data: {
        CODE_PATH_NAME: "code-path-name-test",
      },
    });
    const newContent = `
code-path-name-test

1234code-path-name-test567
      `;
    expect(modifiedContent).equal(newContent);
  });
});

describe("resolveTemplateConfig", () => {
  test("解析出正确的 base 模板配置", async () => {
    const baseTemplate = await resolveTemplateConfig({
      templateDir: templatesDir.resolve("./base"),
    });
    const expectBaseTemplate: TemplateMeta = {
      name: "template-base",
      description: "template-base-description",
    };
    expect(JSON.stringify(baseTemplate)).equal(
      JSON.stringify(expectBaseTemplate)
    );
  });
});

describe("createProjectByTemplate", async () => {
  const baseTemplateDir = templatesDir.resolve("./base");
  const targetProjectDir = dataDir.resolve("./createProjectByTemplate");
  const inputData: TemplateInputData = {};
  test("创建项目", async () => {
    await createProjectByTemplate({
      templateDir: baseTemplateDir,
      targetDir: targetProjectDir,
      data: inputData,
    });
    const baseTemplate = await resolveTemplateConfig({
      templateDir: templatesDir.resolve("./base"),
    });
    console.log({ baseTemplate });
    if (!baseTemplate) {
      throw new Error("undefined baseTemplate");
    }
    const files = await collectNeedModifyProjectFiles({
      targetDir: targetProjectDir,
      meta: baseTemplate,
    });

    expect(files.length > 0).toBeTruthy();
  });
});