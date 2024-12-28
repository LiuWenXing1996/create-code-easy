import { usePrompts } from "./utils/prompts";
import {
  AbsolutePath,
  listChildDir,
  unSafeObjectDeepWrapper,
  unSafeObjectWrapper,
} from "@/utils/common";
import fsExtra from "fs-extra/esm";
import path from "node:path";
import {
  createProjectByTemplate,
  resolveTemplateConfig,
  TemplateConfig,
  TemplateInputData,
} from "./utils/template";
import { CreateConfig, resolveTemplatesByConfig } from "./config";
import { ExitPromptError } from "@inquirer/core";

export const create = async (config: CreateConfig) => {
  try {
    const { input, select, confirm, number, checkbox } = usePrompts();

    const templates: TemplateConfig[] = await resolveTemplatesByConfig(config);
    if (templates.length <= 0) {
      console.log("没有找到模板, 请检查配置属性: templates");
      process.exit(0);
    }
    console.log(`找到 ${templates.length} 个模板`);
    const templateDirStr = await select({
      message: "请选择模板",
      choices: [
        ...templates.map((template) => {
          return {
            name: `${template.meta.name}(${template.path.content})`,
            value: template.path.content,
            description: template.meta.description,
          };
        }),
      ],
    });
    const templateDir = new AbsolutePath(templateDirStr);
    const templateMeta = await resolveTemplateConfig({
      templateDir: templateDir,
    });
    if (!templateMeta) {
      throw new Error(`${templateDir.content} undefined templateMeta`);
    }
    const vars = templateMeta.vars || {};
    const varKeys = Object.keys(vars);
    const varsData: TemplateInputData = {};
    const genDefaultVarDescription = (varKey: string) => {
      return `变量: ${varKey}`;
    };
    for (const varKey of varKeys) {
      const varConfig = unSafeObjectDeepWrapper(vars[varKey]);
      if (varConfig) {
        if (varConfig.type === "input") {
          const res = await input({
            message: varConfig.description || genDefaultVarDescription(varKey),
            required: varConfig.required,
          });
          varsData[varKey] = res;
        }
        if (varConfig.type === "select") {
          const res = await select({
            message: varConfig.description || genDefaultVarDescription(varKey),
            choices: [
              ...(varConfig.choices || []).map((choice) => {
                return {
                  name: choice?.name || "",
                  value: choice?.value || "",
                  description: choice?.description || "",
                };
              }),
            ],
          });
          varsData[varKey] = res;
        }
        if (varConfig.type === "confirm") {
          const res = await confirm({
            message: varConfig.description || genDefaultVarDescription(varKey),
            default: varConfig.default,
          });
          varsData[varKey] = res;
        }
        if (varConfig.type === "number") {
          const res = await number({
            message: varConfig.description || genDefaultVarDescription(varKey),
            default: varConfig.default,
            min: varConfig.min,
            max: varConfig.max,
            step: varConfig.step,
            required: varConfig.required,
          });
          varsData[varKey] = res;
        }
        if (varConfig.type === "checkbox") {
          const resList = await checkbox({
            message: varConfig.description || genDefaultVarDescription(varKey),
            choices: [
              ...(varConfig.choices || []).map((choice) => {
                return {
                  name: choice?.name || "",
                  value: choice?.value || "",
                  description: choice?.description || "",
                };
              }),
            ],
            required: varConfig.required,
          });
          const res = resList.join(varConfig.join || ",");
          varsData[varKey] = res;
        }
      }
    }

    const defaultProjectParentDir = process.cwd();
    let currentProjectParentDir = defaultProjectParentDir;
    let projectParentDirSelectFinish = false;
    do {
      enum SelectValueEnum {
        UseCurrentDir,
        FindParentDir,
        FindChildDir,
      }
      const currentDir = currentProjectParentDir;
      const parentDir = path.dirname(currentProjectParentDir);
      const childDirList = await listChildDir(currentDir);
      const selectedValue = await select({
        message: "请选择代码生成路径",
        choices: [
          {
            name: `使用此路径 ${currentDir}`,
            value: SelectValueEnum.UseCurrentDir,
          },
          {
            name: "访问上层路径",
            value: SelectValueEnum.FindParentDir,
          },
          {
            name: "访问子路径",
            value: SelectValueEnum.FindChildDir,
            disabled: !(childDirList.length > 0),
          },
        ],
      });
      if (selectedValue === SelectValueEnum.UseCurrentDir) {
        currentProjectParentDir = currentDir;
        projectParentDirSelectFinish = true;
      } else if (selectedValue === SelectValueEnum.FindParentDir) {
        currentProjectParentDir = parentDir;
        projectParentDirSelectFinish = false;
      } else if (selectedValue === SelectValueEnum.FindChildDir) {
        const childDirSelectedValue = await select({
          message: "请选择一个子路径",
          choices: childDirList.map((e) => {
            return {
              name: e,
              value: e,
            };
          }),
        });
        currentProjectParentDir = childDirSelectedValue;
        projectParentDirSelectFinish = false;
      }
    } while (!projectParentDirSelectFinish);

    const codePathName = await input({
      message: "请输入代码文件夹名称",
      required: true,
    });

    const codeDir = codePathName.trim();
    const targetDir = path.resolve(currentProjectParentDir, codeDir);
    const isExist = await fsExtra.pathExists(targetDir);
    let forceOverwrite = false;
    if (isExist) {
      forceOverwrite = await confirm({
        message: `${codeDir} 文件夹已存在,是否强制覆盖`,
        default: false,
      });
      if (!forceOverwrite) {
        console.log("创建流程已退出");
        process.exit(0);
      }
      fsExtra.emptyDir(targetDir);
    }

    await createProjectByTemplate({
      templateDir: templateDir,
      targetDir: new AbsolutePath(targetDir),
      data: {
        ...varsData,
        CODE_PATH_NAME: codePathName,
      },
    });
    console.log(`创建成功: ${targetDir} `);
  } catch (error) {
    if (!(error instanceof ExitPromptError)) {
      console.log(error);
    }
    config.onError?.(error);
  }
};
