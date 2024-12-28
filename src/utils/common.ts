import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import { resolveTemplates, TemplateConfig } from "./template";
import { DeepPartial } from "ts-essentials";

export const listChildDir = async (dir?: string) => {
  const dirs: string[] = [];
  if (!dir) {
    return [];
  }
  const fileList = (await fs.readdir(dir)) as string[];
  for (const file of fileList) {
    const name = path.join(dir, file);
    if ((await fs.stat(name)).isDirectory()) {
      dirs.push(name);
    }
  }
  return dirs;
};

export const listFiles = async (dir?: string) => {
  const files: string[] = [];
  if (!dir) {
    return [];
  }
  const getFiles = async (currentDir: string) => {
    const fileList = (await fs.readdir(currentDir)) as string[];
    for (const file of fileList) {
      const name = path.resolve(currentDir, file);
      if ((await fs.stat(name)).isDirectory()) {
        await getFiles(name);
      } else {
        files.push(name);
      }
    }
  };
  await getFiles(dir);
  return files;
};

export const readJson = async <T>(path: string): Promise<T> => {
  let jsonObj: T | undefined = undefined;
  const content = (await fs.readFile(path, "utf-8")) as string;
  jsonObj = JSON.parse(content || "") as T;
  return jsonObj;
};

export interface PkgJson {
  name?: string;
  description?: string;
  keywords?: string[];
}

// export const resolveTemplates = async (params: {
//   templatesDir: AbsolutePath;
// }): Promise<CreateTemplateConfig[]> => {
//   const { templatesDir } = params;
//   const templateDirList = await listChildDir(templatesDir.content);

//   const templates: CreateTemplateConfig[] = await Promise.all([
//     ...templateDirList.map(async (templateDir) => {
//       const pkgJsonPath = path.resolve(templateDir, "package.json");
//       const pkgJson = await readJson<PkgJson>(pkgJsonPath);
//       if (!pkgJson.name) {
//         throw new Error(`${pkgJsonPath} undefined name`);
//       }
//       return {
//         name: pkgJson.name,
//         path: new AbsolutePath(templateDir),
//         description: pkgJson.description,
//         keywords: pkgJson.keywords,
//       };
//     }),
//   ]);

//   return templates;
// };

export class RelativePath {
  #content: string;
  constructor(content: string) {
    if (path.isAbsolute(content)) {
      throw new Error("RelativePath content is absolute path");
    }
    this.#content = content;
  }
  get content() {
    return this.#content;
  }
  toAbsolutePath(rel: AbsolutePath) {
    const absolutePath = path.resolve(rel.content, this.content);
    return new AbsolutePath(absolutePath);
  }
}
export class AbsolutePath {
  #content: string;
  constructor(content: string) {
    if (!path.isAbsolute(content)) {
      throw new Error("AbsolutePath content must is absolute path");
    }
    this.#content = content;
  }
  get content() {
    return this.#content;
  }
  toRelativePath(rel: AbsolutePath) {
    const content = path.relative(rel.content, this.content);
    return new RelativePath(content);
  }
  resolve(next: string) {
    const content = path.resolve(this.content, next);
    return new AbsolutePath(content);
  }
}

export type MaybePromise<T> = T | Promise<T>;
export const unSafeObjectDeepWrapper = <T extends object>(
  obj: T
): DeepPartial<T> | undefined => {
  return obj as DeepPartial<T> | undefined;
};

export const unSafeObjectWrapper = <T extends object>(
  obj: T
): Partial<T> | undefined => {
  return obj as Partial<T> | undefined;
};
