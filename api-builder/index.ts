import { readdir, readFile, mkdir, writeFile, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

interface IndexFileInfo {
  content: string;
  imports: Array<{ variableName: string; importPath: string; lineNumber: number }>;
  routeUses: Array<{ variableName: string; lineNumber: number }>;
  lastImportLine: number;
  lastRouteUseLine: number;
}

interface RouteConfig {
  module: string;
  version: string;
  routes: Array<{
    path: string;
    method: string;
    openapi: {
      summary: string;
      description: string;
      tags: string[];
    };
    payload: any;
    handler: {
      isGenerated: boolean;
      requestType: string;
      query: string;
    };
    response: {
      mapping: Record<string, string>;
    };
  }>;
}

function extractPathParams(path: string): string[] {
  const matches = path.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g);
  return matches ? matches.map(match => match.slice(1)) : [];
}

function generateParamsValidation(pathParams: string[]): string {
  if (pathParams.length === 0) return '';
  
  const paramsObject = pathParams.map(param => {
    // Assume UUID format for id parameters, string for others
    if (param === 'id') {
      return `      ${param}: t.String({\n        format: "uuid",\n        description: "${param.charAt(0).toUpperCase() + param.slice(1)} ID",\n      })`;
    }
    return `      ${param}: t.String({\n        description: "${param.charAt(0).toUpperCase() + param.slice(1)}",\n      })`;
  }).join(',\n');

  return `\n    params: t.Object({\n${paramsObject}\n    })`;
}

function generateRouteMethod(route: any, moduleName: string): string {
  const method = route.method.toLowerCase();
  const pathParams = extractPathParams(route.path);
  const paramsValidation = generateParamsValidation(pathParams);
  
  // Generate params destructuring
  const paramsDestructuring = pathParams.length > 0 
    ? `{ params: { ${pathParams.join(', ')} }}` 
    : '{}';
  
  // Generate function parameters for findOneById
  const functionParams = pathParams.length > 0 
    ? `${pathParams.join(', ')}, "${route.handler.query}"` 
    : `"${route.handler.query}"`;

  const detailSection = `,
    detail: {
      summary: "${route.openapi.summary}",
      description: "${route.openapi.description}",
      tags: ["${route.openapi.tags.join('", "')}"],
    }`;
  
  return `  .${method}("${route.path}", (${paramsDestructuring}) => {
    return findOneById(${functionParams});
  }${paramsValidation ? `, {${paramsValidation}${detailSection}
  }` : ''})`;
}

function generateRouteFile(config: RouteConfig): string {
  const { module: moduleName, version } = config;
  const className = `${moduleName}${version.charAt(0).toUpperCase() + version.slice(1)}Routes`;
  const prefix = `/${moduleName}/${version}`;
  
  const imports = `import { findOneById } from "@/core/services/find.service";
import Elysia, { t } from "elysia";`;
  
  const routeDefinitions = config.routes.map(route => 
    generateRouteMethod(route, moduleName)
  ).join('\n');
  
  return `${imports}

const ${className} = new Elysia({ prefix: "${prefix}" })
${routeDefinitions};

export default ${className};
`;
}

async function parseIndexFile(indexPath: string): Promise<IndexFileInfo> {
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

function generateImportStatement(config: RouteConfig): string {
  const { module: moduleName, version } = config;
  const variableName = `${moduleName}${version.charAt(0).toUpperCase() + version.slice(1)}Routes`;
  const importPath = `./builder/${moduleName}/${version}/${moduleName}-${version}.routes`;
  return `import ${variableName} from "${importPath}";`;
}

function generateRouteVariableName(config: RouteConfig): string {
  const { module: moduleName, version } = config;
  return `${moduleName}${version.charAt(0).toUpperCase() + version.slice(1)}Routes`;
}

async function updateIndexFile(config: RouteConfig): Promise<void> {
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

async function ensureDirectoryExists(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

async function processJsonFile(jsonFilePath: string): Promise<void> {
  try {
    console.log(`Processing: ${jsonFilePath}`);
    
    const jsonContent = await readFile(jsonFilePath, 'utf-8');
    const config: RouteConfig = JSON.parse(jsonContent);
    
    // Generate output path: src/builder/{module}/{version}/{module}-{version}.routes.ts
    const outputDir = join(process.cwd(), 'src', 'builder', config.module, config.version);
    const outputFileName = `${config.module}-${config.version}.routes.ts`;
    const outputPath = join(outputDir, outputFileName);
    
    // Ensure output directory exists
    await ensureDirectoryExists(outputDir);
    
    // Generate TypeScript content
    const tsContent = generateRouteFile(config);
    
    // Write the file
    await writeFile(outputPath, tsContent, 'utf-8');
    console.log(`Generated: ${outputPath}`);
    
    // Update src/index.ts with new route import and usage
    await updateIndexFile(config);
    
  } catch (error) {
    console.error(`Error processing ${jsonFilePath}:`, error);
    throw error;
  }
}

async function main(): Promise<void> {
  try {
    const jsonDir = join(process.cwd(), 'api-builder', 'json');
    console.log(`Reading JSON files from: ${jsonDir}`);
    
    // Read all files in the json directory
    const files = await readdir(jsonDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    if (jsonFiles.length === 0) {
      console.log('No JSON files found in api-builder/json directory');
      return;
    }
    
    console.log(`Found ${jsonFiles.length} JSON file(s): ${jsonFiles.join(', ')}`);
    
    // Process each JSON file
    for (const jsonFile of jsonFiles) {
      const jsonFilePath = join(jsonDir, jsonFile);
      await processJsonFile(jsonFilePath);
    }
    
    console.log('\n✅ All files generated successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Parse command line arguments
function parseArgs(): { clean: boolean } {
  const args = process.argv.slice(2);
  return {
    clean: args.includes('--clean') || args.includes('--reset')
  };
}

// Cleanup function to remove all builder files and imports
async function cleanupBuilder(): Promise<void> {
  console.log('🧹 Starting cleanup process...');
  
  try {
    // 1. Remove all contents of src/builder directory
    await cleanupBuilderDirectory();
    
    // 2. Remove builder-related imports and routes from src/index.ts
    await cleanupIndexFile();
    
    console.log('✅ Cleanup completed successfully!');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

// Remove all contents of src/builder directory
async function cleanupBuilderDirectory(): Promise<void> {
  const builderDir = join(process.cwd(), 'src', 'builder');
  
  if (!existsSync(builderDir)) {
    console.log('📁 Builder directory does not exist, skipping directory cleanup');
    return;
  }
  
  try {
    // Read all items in builder directory
    const items = await readdir(builderDir);
    
    if (items.length === 0) {
      console.log('📁 Builder directory is already empty');
      return;
    }
    
    // Remove each item (files and subdirectories)
    for (const item of items) {
      const itemPath = join(builderDir, item);
      await rm(itemPath, { recursive: true, force: true });
      console.log(`🗑️  Removed: ${itemPath}`);
    }
    
    console.log(`📁 Cleaned builder directory: ${builderDir}`);
  } catch (error) {
    console.error(`❌ Error cleaning builder directory: ${error}`);
    throw error;
  }
}

// Remove builder-related imports and routes from src/index.ts
async function cleanupIndexFile(): Promise<void> {
  const indexPath = join(process.cwd(), 'src', 'index.ts');
  
  if (!existsSync(indexPath)) {
    console.log('📄 index.ts not found, skipping index cleanup');
    return;
  }
  
  try {
    const indexInfo = await parseIndexFile(indexPath);
    
    // Filter out builder-related imports and routes
    const builderImports = indexInfo.imports.filter(imp => 
      imp.importPath.includes('./builder/') || imp.importPath.includes('/builder/')
    );
    
    const builderRoutes = indexInfo.routeUses.filter(use => 
      builderImports.some(imp => imp.variableName === use.variableName)
    );
    
    if (builderImports.length === 0 && builderRoutes.length === 0) {
      console.log('📄 No builder imports or routes found in index.ts');
      return;
    }
    
    // Remove builder imports and routes
    let lines = indexInfo.content.split('\n');
    
    // Remove imports (in reverse order to maintain line numbers)
    const importLinesToRemove = builderImports.map(imp => imp.lineNumber - 1).sort((a, b) => b - a);
    for (const lineIndex of importLinesToRemove) {
      console.log(`🗑️  Removing import: ${lines[lineIndex].trim()}`);
      lines.splice(lineIndex, 1);
    }
    
    // Re-parse to get updated line numbers for route uses
    const updatedContent = lines.join('\n');
    const updatedIndexInfo = await parseIndexFileFromContent(updatedContent);
    
    // Remove route uses
    lines = updatedContent.split('\n');
    const routeLinesToRemove = updatedIndexInfo.routeUses
      .filter(use => builderRoutes.some(br => br.variableName === use.variableName))
      .map(use => use.lineNumber - 1)
      .sort((a, b) => b - a);
    
    for (const lineIndex of routeLinesToRemove) {
      console.log(`🗑️  Removing route use: ${lines[lineIndex].trim()}`);
      lines.splice(lineIndex, 1);
    }
    
    // Write the cleaned content back
    const cleanedContent = lines.join('\n');
    await writeFile(indexPath, cleanedContent, 'utf-8');
    
    console.log(`📄 Cleaned ${builderImports.length} imports and ${builderRoutes.length} route uses from index.ts`);
  } catch (error) {
    console.error(`❌ Error cleaning index.ts: ${error}`);
    throw error;
  }
}

// Helper function to parse index file from content string
async function parseIndexFileFromContent(content: string): Promise<IndexFileInfo> {
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

// Run the script
if (import.meta.main) {
  const args = parseArgs();
  
  if (args.clean) {
    cleanupBuilder().then(() => {
      console.log('\n🎯 Cleanup completed. Ready for fresh generation!');
    }).catch((error) => {
      console.error('❌ Cleanup failed:', error);
      process.exit(1);
    });
  } else {
    main();
  }
}