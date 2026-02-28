import Conf from "conf";

export interface ConfigSchema {
  registryUrl: string;
  apiKey?: string;
  lastLogin?: string;
  firstRun?: boolean;
}

const config = new Conf<ConfigSchema>({
  projectName: "yigyaps",
  defaults: {
    registryUrl: "https://api.yigyaps.com",
    firstRun: true,
  },
});

export const getConfig = () => config.store;
export const setConfig = <K extends keyof ConfigSchema>(
  key: K,
  value: ConfigSchema[K],
) => {
  config.set(key, value);
};
export const updateConfig = (patch: Partial<ConfigSchema>) => {
  for (const [key, value] of Object.entries(patch)) {
    config.set(key as keyof ConfigSchema, value as ConfigSchema[keyof ConfigSchema]);
  }
};
export const clearConfig = () => config.clear();
export const deleteConfig = <K extends keyof ConfigSchema>(key: K) => {
  config.delete(key);
};
