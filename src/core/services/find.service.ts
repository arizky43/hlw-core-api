import { sql } from "bun";
import { get } from "lodash";

export async function findOneById(id: string, query: string): Promise<any> {
  try {
    // Validate inputs
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid ID parameter');
    }
    
    if (!query || typeof query !== 'string') {
      throw new Error('Invalid query parameter');
    }

    console.log('Original query:', query);
    console.log('ID parameter:', id);

    // Validate that the query contains the :id placeholder
    if (!query.includes(':id')) {
      throw new Error('Query must contain :id placeholder');
    }

    // Additional security validations
    const lowerQuery = query.toLowerCase();
    
    // Ensure it's a SELECT query (read-only)
    if (!lowerQuery.trim().startsWith('select')) {
      throw new Error('Only SELECT queries are allowed');
    }
    
    // Check for dangerous SQL keywords that could indicate injection attempts
    // Use word boundaries to avoid false positives with column names like 'deleted_at'
    const dangerousPatterns = [
      /\bdrop\s+/i,
      /\bdelete\s+from\b/i,
      /\bupdate\s+/i,
      /\binsert\s+into\b/i,
      /\balter\s+/i,
      /\bcreate\s+/i,
      /\btruncate\s+/i,
      /--/,
      /;\s*\w/  // semicolon followed by another statement
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        throw new Error(`Potentially dangerous SQL pattern detected: ${pattern.source}`);
      }
    }

    // Validate ID format (assuming it should be numeric or UUID-like)
    if (!/^[a-zA-Z0-9-_]+$/.test(id)) {
      throw new Error('Invalid ID format - only alphanumeric characters, hyphens, and underscores allowed');
    }

    // Split the query at the :id placeholder
    const parts = query.split(':id');
    if (parts.length !== 2) {
      throw new Error('Query must contain exactly one :id placeholder');
    }

    // For Bun SQL, we need to use a different approach since template literals
    // don't work with completely dynamic queries. We'll use Function constructor
    // to create a dynamic template literal function safely.
    const [beforeId, afterId] = parts;
    
    // Create a safe function that constructs the SQL query
    // This approach allows us to use Bun's SQL template literal with dynamic parts
    const executeQuery = new Function('sql', 'id', `
      return sql\`${beforeId.replace(/`/g, '\\`')}\${id}${afterId.replace(/`/g, '\\`')}\`;
    `);

    const result = await executeQuery(sql, id);
    
    // Return the first row or null if no results
    return get(result, '0', null);
  } catch (error) {
    console.error('Error in findOneById:', error);
    throw new Error(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
