import { IIndexFileInfo, IRouteConfig } from "../interfaces/api-builder.interface";
import { readdir, readFile, mkdir, writeFile, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

export async function parseIndexFile(indexPath: string): Promise<IIndexFileInfo> {
  const content = await readFile(indexPath, 'utf-8');
  const lines = content.split('\n');
  
  const imports: Array<{ variableName: string; importPath: string; lineNumber: number }> = [];
  const routeUses: Array<{ variableName: string; lineNumber: number }> = [];
  let lastImportLine = 0;
  let lastRouteUseLine = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Match import statements for route files
    const importMatch = line.match(/^import\s+(\w+)\s+from\s+["'](.+routes)["'];?$/);
    if (importMatch) {
      imports.push({
        variableName: importMatch[1],
        importPath: importMatch[2],
        lineNumber: i + 1
      });
      lastImportLine = Math.max(lastImportLine, i + 1);
    }
    
    // Match .use() calls for routes
    const useMatch = line.match(/\.use\((\w+)\)/);
    if (useMatch) {
      routeUses.push({
        variableName: useMatch[1],
        lineNumber: i + 1
      });
      lastRouteUseLine = Math.max(lastRouteUseLine, i + 1);
    }
  }
  
  return {
    content,
    imports,
    routeUses,
    lastImportLine,
    lastRouteUseLine
  };
}

// Helper function to parse index file from content string
export async function parseIndexFileFromContent(content: string): Promise<IIndexFileInfo> {
  const lines = content.split('\n');
  
  const imports: Array<{ variableName: string; importPath: string; lineNumber: number }> = [];
  const routeUses: Array<{ variableName: string; lineNumber: number }> = [];
  let lastImportLine = 0;
  let lastRouteUseLine = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Match import statements for route files
    const importMatch = line.match(/^import\s+(\w+)\s+from\s+["'](.+routes)["'];?$/);
    if (importMatch) {
      imports.push({
        variableName: importMatch[1],
        importPath: importMatch[2],
        lineNumber: i + 1
      });
      lastImportLine = Math.max(lastImportLine, i + 1);
    }
    
    // Match .use() calls for routes
    const useMatch = line.match(/\.use\((\w+)\)/);
    if (useMatch) {
      routeUses.push({
        variableName: useMatch[1],
        lineNumber: i + 1
      });
      lastRouteUseLine = Math.max(lastRouteUseLine, i + 1);
    }
  }
  
  return {
    content,
    imports,
    routeUses,
    lastImportLine,
    lastRouteUseLine
  };
}

export async function updateIndexFile(config: IRouteConfig): Promise<void> {
  const indexPath = join(process.cwd(), 'src', 'index.ts');
  
  if (!existsSync(indexPath)) {
    console.warn(`Warning: ${indexPath} not found. Skipping index.ts update.`);
    return;
  }
  
  const indexInfo = await parseIndexFile(indexPath);
  const variableName = generateRouteVariableName(config);
  const importStatement = generateImportStatement(config);
  
  // Check if import already exists
  const importExists = indexInfo.imports.some(imp => imp.variableName === variableName);
  const useExists = indexInfo.routeUses.some(use => use.variableName === variableName);
  
  if (importExists && useExists) {
    console.log(`Route ${variableName} already exists in index.ts`);
    return;
  }
  
  let lines = indexInfo.content.split('\n');
  let addedImport = false;
  let addedUse = false;
  
  // Add import statement if it doesn't exist
  if (!importExists) {
    const insertIndex = indexInfo.lastImportLine;
    lines.splice(insertIndex, 0, importStatement);
    addedImport = true;
    console.log(`Added import: ${importStatement}`);
  }
  
  // Add .use() call if it doesn't exist
  if (!useExists) {
    // Find the line with .use() calls and add after the last one
    let useInsertIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('.use(') && lines[i].includes('Routes')) {
        useInsertIndex = i + 1;
      }
    }
    
    if (useInsertIndex > -1) {
      lines.splice(useInsertIndex, 0, `  .use(${variableName})`);
      addedUse = true;
      console.log(`Added route use: .use(${variableName})`);
    }
  }
  
  // Write the updated content back to the file
  if (addedImport || addedUse) {
    const updatedContent = lines.join('\n');
    await writeFile(indexPath, updatedContent, 'utf-8');
    console.log(`Updated ${indexPath}`);
  }
}

export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

function generateImportStatement(config: IRouteConfig): string {
  const { module: moduleName, version } = config;
  const variableName = `${moduleName}${version.charAt(0).toUpperCase() + version.slice(1)}Routes`;
  const importPath = `./builder/${moduleName}/${version}/${moduleName}-${version}.routes`;
  return `import ${variableName} from "${importPath}";`;
}

function generateRouteVariableName(config: IRouteConfig): string {
  const { module: moduleName, version } = config;
  return `${moduleName}${version.charAt(0).toUpperCase() + version.slice(1)}Routes`;
}