import Conf from 'conf';

export interface ConfigSchema {
    registryUrl: string;
    apiKey?: string;
    lastLogin?: string;
}

const config = new Conf<ConfigSchema>({
    projectName: 'yigyaps',
    defaults: {
        registryUrl: 'https://api.yigyaps.com'
    }
});

export const getConfig = () => config.store;
export const setConfig = <K extends keyof ConfigSchema>(key: K, value: ConfigSchema[K]) => {
    config.set(key, value);
};
export const clearConfig = () => config.clear();
export const deleteConfig = <K extends keyof ConfigSchema>(key: K) => {
    config.delete(key);
};
