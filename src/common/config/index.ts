import { get } from 'lodash';

export const getConfig = (key: string): string => {
  return get(process.env, key, ''); 
};
