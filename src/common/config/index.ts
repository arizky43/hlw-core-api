import { get } from 'lodash';

export const getConfig = (key: string, defaultValue: string = ''): string => {
  return get(process.env, key, defaultValue); 
};

export const getConfigNumber = (key: string, defaultValue: number = 0): number => {
  return Number(getConfig(key, defaultValue.toString()));
};
