import { hideBin } from "yargs/helpers";
import { CreateConfig, CreateConfigFunc } from "@/config";
import { bundleRequire } from "bundle-require";
import { AbsolutePath } from "./utils/common";
import path from "node:path";
import fsExtra from "fs-extra/esm";
import yargs from "yargs";
import { assign, isFunction, template } from "radash";
import { create } from "./create";

export class Program {
  constructor(params: {
    processArgs: string[];
    disableAutoHideBin?: boolean;
    version: string;
    name: string;
  }) {
    this.disableAutoHideBin = params.disableAutoHideBin;
    this.processArgs = params.processArgs;
    this.version = params.version;
    this.name = params.name;
  }

  name: string;

  disableAutoHideBin?: boolean;

  processArgs: string[];

  version: string;

  get args(): string[] {
    let args: string[] = [];
    if (this.disableAutoHideBin) {
      args = this.processArgs;
    } else {
      args = hideBin(this.processArgs);
    }
    return [...args];
  }

  async loadCreateConfigFromFile(params: {
    filePath: AbsolutePath;
  }): Promise<CreateConfig | CreateConfigFunc | undefined> {
    const { filePath } = params;
    const { mod } = await bundleRequire({
      filepath: filePath.content,
      format: "esm",
    });

    let result = mod.default || mod;
    return result;
  }
  async lookupCreateConfigFilePath(params: {
    root: AbsolutePath;
    configFilePath?: string;
  }): Promise<AbsolutePath | undefined> {
    const { root, configFilePath } = params;
    if (configFilePath) {
      const absoluteFilePath = new AbsolutePath(
        path.resolve(root.content, configFilePath)
      );
      const isExit = await fsExtra.pathExists(absoluteFilePath.content);
      if (!isExit) {
        throw new Error("config file not found");
      }
      return absoluteFilePath;
    } else {
      const configFileDefaultList = [
        "create.config.ts",
        "create.config.js",
        "create.config.cjs",
        "create.config.mjs",
      ];
      for (const filePath of configFileDefaultList) {
        const absoluteFilePath = new AbsolutePath(
          path.resolve(root.content, filePath)
        );
        const isExit = await fsExtra.pathExists(absoluteFilePath.content);
        if (!isExit) {
          break;
        }
        return absoluteFilePath;
      }
    }
  }

  async parse() {
    const yargsInstance = yargs()
      .scriptName(this.name)
      .command(
        "*",
        "根据模板创建代码",
        {
          root: {
            description: "根路径",
            alias: "r",
            type: "string",
          },
          templates: {
            description: "模板文件路径，支持数组",
            alias: "t",
            type: "array",
          },
          config: {
            description: "配置文件路径",
            alias: "c",
            type: "string",
          },
        },
        async (args) => {
          const argTemplates = args.templates?.map((e) => e.toString());
          const rootFormCli = (args.root as string) || undefined;
          const root = rootFormCli || process.cwd();
          const configFilePathFromCli = (args.config as string) || undefined;
          const absoluteRoot = new AbsolutePath(path.resolve(root));
          const createConfigFileAbsolutePath =
            await this.lookupCreateConfigFilePath({
              root: absoluteRoot,
              configFilePath: configFilePathFromCli,
            });
          const createConfigMaybeFuncFromCli = createConfigFileAbsolutePath
            ? await this.loadCreateConfigFromFile({
                filePath: createConfigFileAbsolutePath,
              })
            : undefined;
          const createConfigFromCli = isFunction(createConfigMaybeFuncFromCli)
            ? await createConfigMaybeFuncFromCli({ root })
            : createConfigMaybeFuncFromCli;
          const createConfig = assign<CreateConfig>(
            {
              templates: [],
            },
            createConfigFromCli || {
              templates: argTemplates || [],
            }
          );
          // console.log({ createConfig });
          createConfig.root = args.root ? root : createConfig.root;
          await create(createConfig);
        }
      );

    yargsInstance.help(true).alias("help", "h");
    yargsInstance.version(this.version).alias("version", "v");

    await yargsInstance.parse(this.args);
  }
}
