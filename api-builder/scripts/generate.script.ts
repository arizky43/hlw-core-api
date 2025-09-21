import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { IRouteConfig } from '../core/interfaces/api-builder.interface';
import { ensureDirectoryExists, updateIndexFile } from 'api-builder/core/helpers/api-builder.helper';

export async function generateScript(): Promise<void> {
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

async function processJsonFile(jsonFilePath: string): Promise<void> {
  try {
    console.log(`Processing: ${jsonFilePath}`);
    
    const jsonContent = await readFile(jsonFilePath, 'utf-8');
    const config: IRouteConfig = JSON.parse(jsonContent);
    
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

function generateRouteFile(config: IRouteConfig): string {
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
