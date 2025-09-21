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

export async function findOne(payload: Record<string, any>, query: string): Promise<any> {
  try {
    // Validate inputs
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid payload parameter - must be an object');
    }
    
    if (!query || typeof query !== 'string') {
      throw new Error('Invalid query parameter');
    }

    console.log('Original query:', query);
    console.log('Payload parameters:', payload);

    // Additional security validations
    const lowerQuery = query.toLowerCase();
    
    // Ensure it's a SELECT query (read-only)
    if (!lowerQuery.trim().startsWith('select')) {
      throw new Error('Only SELECT queries are allowed');
    }
    
    // Check for dangerous SQL keywords that could indicate injection attempts
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

    // Extract all parameter placeholders from the query
    const parameterMatches = query.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g);
    if (!parameterMatches || parameterMatches.length === 0) {
      throw new Error('Query must contain at least one parameter placeholder (e.g., :paramName)');
    }

    // Get unique parameter names (remove : prefix and duplicates)
    const parameterNames = [...new Set(parameterMatches.map(match => match.substring(1)))];
    
    console.log('Required parameters:', parameterNames);

    // Validate that all required parameters are provided in payload
    const missingParams = parameterNames.filter(param => !(param in payload));
    if (missingParams.length > 0) {
      throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
    }

    // Validate parameter values
    for (const paramName of parameterNames) {
      const value = payload[paramName];
      
      // Check for null/undefined values
      if (value === null || value === undefined) {
        throw new Error(`Parameter '${paramName}' cannot be null or undefined`);
      }
      
      // Validate parameter format for string values
      if (typeof value === 'string') {
        // Allow alphanumeric, spaces, hyphens, underscores, dots, and @ symbols
        if (!/^[a-zA-Z0-9\s\-_.@]+$/.test(value)) {
          throw new Error(`Invalid format for parameter '${paramName}' - only alphanumeric characters, spaces, hyphens, underscores, dots, and @ symbols allowed`);
        }
      }
    }

    // Build the dynamic query by replacing placeholders
    const parameterValues: any[] = [];
    
    // Collect parameter values in the order they appear
    for (const paramName of parameterNames) {
      parameterValues.push(payload[paramName]);
    }

    console.log('Parameter values:', parameterValues);

    // Split the query into parts and rebuild with parameter placeholders
    let queryParts: string[] = [];
    let currentQuery = query;
    
    // Process each parameter in order
    for (let i = 0; i < parameterNames.length; i++) {
      const paramName = parameterNames[i];
      const placeholder = `:${paramName}`;
      
      // Find the first occurrence of this parameter
      const index = currentQuery.indexOf(placeholder);
      if (index !== -1) {
        // Add the part before the parameter
        queryParts.push(currentQuery.substring(0, index));
        
        // Add a placeholder for the parameter value
        queryParts.push(`__PARAM_${i}__`);
        
        // Continue with the rest of the query
        currentQuery = currentQuery.substring(index + placeholder.length);
        
        // Replace any remaining occurrences of the same parameter
        currentQuery = currentQuery.replace(new RegExp(`:${paramName}\\b`, 'g'), `__PARAM_${i}__`);
      }
    }
    
    // Add the remaining part of the query
    queryParts.push(currentQuery);
    
    // Reconstruct the query template
    let queryTemplate = queryParts.join('');
    
    // Replace parameter placeholders with template literal placeholders
    for (let i = 0; i < parameterValues.length; i++) {
      queryTemplate = queryTemplate.replace(new RegExp(`__PARAM_${i}__`, 'g'), `\${parameterValues[${i}]}`);
    }
    
    console.log('Query template:', queryTemplate);
    
    // Escape backticks in the query template
    const escapedQuery = queryTemplate.replace(/`/g, '\\`');
    
    // Create the dynamic function with proper parameter substitution
    const functionBody = `return sql\`${escapedQuery}\`;`;
    
    const executeQuery = new Function('sql', 'parameterValues', functionBody);

    const result = await executeQuery(sql, parameterValues);
    
    // Return the first row or null if no results
    return get(result, '0', null);
  } catch (error) {
    console.error('Error in findOne:', error);
    throw new Error(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
