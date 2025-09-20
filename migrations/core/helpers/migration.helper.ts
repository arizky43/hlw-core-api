import { readdir } from 'node:fs/promises';
import { IFile } from '../interfaces/migration.interface';

export const getFullPath = (path: string): string => {
  return `${__dirname}/${path}`;
}

export const getListFiles = async (path: string): Promise<IFile[]> => {
  const fullPath = getFullPath(path);
  const listFiles = await readdir(fullPath);

  return listFiles.map((fileName) => ({ fileName, fullPath: `${fullPath}/${fileName}` }));
};
