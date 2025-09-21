import { join } from 'path';
import { existsSync } from 'fs';
import { readdir, writeFile, rm } from 'fs/promises';
import { parseIndexFile, parseIndexFileFromContent } from '../core/helpers/api-builder.helper';

export async function preGenerateScript(): Promise<void> {
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
};

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
