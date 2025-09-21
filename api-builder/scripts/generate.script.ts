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
  
  const imports = `import { findOneById, findOne } from "@/core/services/find.service";
import Elysia, { t } from "elysia";`;
  
  // Generate schema constants for each route
  const schemaConstants = config.routes.map(route => 
    generateSchemaConstant(route)
  ).join('\n\n');
  
  const routeDefinitions = config.routes.map(route => 
    generateRouteMethod(route, moduleName)
  ).join('\n');
  
  return `${imports}

${schemaConstants}

const ${className} = new Elysia({ prefix: "${prefix}" })
${routeDefinitions};

export default ${className};
`;
}

function generateRouteMethod(route: any, moduleName: string): string {
  const schemaName = `${route.name}PayloadSchema`;
  
  const detailSection = `,
    detail: {
      summary: "${route.openapi.summary}",
      description: "${route.openapi.description}",
      tags: ["${route.openapi.tags.join('", "')}"],
    }`;
  
  // Generate body destructuring for payload properties
  const bodyParams = route.payload ? Object.keys(route.payload) : [];
  const bodyDestructuring = bodyParams.length > 0 ? `{ body }` : '{}';
  
  // Handle different request types
  if (route.handler.requestType === 'findOne') {
    // Generate dynamic query building for findOne
    const dynamicQueryLogic = generateDynamicQueryLogic(route, bodyParams);
    
    return `  .post("${route.path}", (${bodyDestructuring}) => {
${dynamicQueryLogic}
    return findOne(payload, query);
  }, {
    body: ${schemaName}${detailSection}
  })`;
  } else {
    // Default to findOneById
    const functionParams = bodyParams.length > 0 
      ? `body.${bodyParams[0]}, "${route.handler.query}"` 
      : `"${route.handler.query}"`;
    
    return `  .post("${route.path}", (${bodyDestructuring}) => {
    return findOneById(${functionParams});
  }, {
    body: ${schemaName}${detailSection}
  })`;  
  }
}

function generateSchemaConstant(route: any): string {
  const schemaName = `${route.name}PayloadSchema`;
  
  if (!route.payload || Object.keys(route.payload).length === 0) {
    return `const ${schemaName} = t.Object({});`;
  }
  
  const payloadObject = Object.entries(route.payload).map(([key, config]: [string, any]) => {
    const typeMethod = getElysiaTypeMethod(config.type);
    const options = generateTypeOptions(config);
    const optionalWrapper = config.optional ? `t.Optional(${typeMethod}(${options}))` : `${typeMethod}(${options})`;
    return `  ${key}: ${optionalWrapper}`;
  }).join(',\n');
  
  return `const ${schemaName} = t.Object({\n${payloadObject}\n});`;
}

function getElysiaTypeMethod(type: string): string {
  switch (type) {
    case 'String': return 't.String';
    case 'Number': return 't.Number';
    case 'Boolean': return 't.Boolean';
    case 'Array': return 't.Array';
    case 'Object': return 't.Object';
    default: return 't.String';
  }
}

function generateTypeOptions(config: any): string {
  const options: string[] = [];
  
  if (config.format) {
    options.push(`format: "${config.format}"`);
  }
  
  if (config.description) {
    options.push(`description: "${config.description}"`);
  }
  
  if (config.minimum !== undefined) {
    options.push(`minimum: ${config.minimum}`);
  }
  
  if (config.maximum !== undefined) {
    options.push(`maximum: ${config.maximum}`);
  }
  
  if (config.minLength !== undefined) {
    options.push(`minLength: ${config.minLength}`);
  }
  
  if (config.maxLength !== undefined) {
    options.push(`maxLength: ${config.maxLength}`);
  }
  
  if (options.length === 0) {
    return '{}';
  }
  
  return `{\n        ${options.join(',\n        ')}\n      }`;
}

function generateDynamicQueryLogic(route: any, bodyParams: string[]): string {
  const query = route.handler.query;
  
  return `    const payload = body;
    const query = "${query}";`;
}
