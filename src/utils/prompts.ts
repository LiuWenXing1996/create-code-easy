import { makeTheme } from "@inquirer/core";
import { input, select, confirm, number, checkbox } from "@inquirer/prompts";

export const usePromptsI18nTheme = () => {
  const defaultTheme = makeTheme({});
  const i18nTheme = makeTheme({
    style: {
      help: () => {
        const newContent = "(使用箭头键选择)";
        return defaultTheme.style.help(newContent);
      },
      error: () => {
        const newContent = "请输入一个值";
        return defaultTheme.style.error(newContent);
      },
    },
  });

  return i18nTheme;
};

export type Prompts = {
  input: typeof input;
  select: typeof select;
  confirm: typeof confirm;
  number: typeof number;
  checkbox: typeof checkbox;
};

export const usePrompts = (): Prompts => {
  const i18nTheme = usePromptsI18nTheme();
  const wrapperWithDefault = <
    T extends (...rest: unknown[]) => Promise<unknown>
  >(
    func: T
  ): T => {
    const newFunc = async (...rest: any[]) => {
      const [config, ...r] = rest;
      const newConfig = {
        theme: i18nTheme,
        ...config,
      };
      const res = await func(newConfig, ...r);
      return res;
    };
    return newFunc as T;
  };
  return {
    input: wrapperWithDefault(input),
    select: wrapperWithDefault(select),
    confirm: wrapperWithDefault(confirm),
    number: wrapperWithDefault(number),
    checkbox: wrapperWithDefault(checkbox),
  };
};
