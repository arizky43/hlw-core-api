export interface IIndexFileInfo {
  content: string;
  imports: Array<{ variableName: string; importPath: string; lineNumber: number }>;
  routeUses: Array<{ variableName: string; lineNumber: number }>;
  lastImportLine: number;
  lastRouteUseLine: number;
}

export interface IRouteConfig {
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