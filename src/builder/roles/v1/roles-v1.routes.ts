import { findOneById, findOne } from "@/core/services/find.service";
import Elysia, { t } from "elysia";

const findRoleByIdPayloadSchema = t.Object({
  id: t.String({
        format: "uuid",
        description: "Role ID"
      })
});

const findRolePayloadSchema = t.Object({
  id: t.Optional(t.String({
        format: "uuid",
        description: "Role id"
      })),
  name: t.Optional(t.String({
        description: "Role name"
      })),
  access: t.Optional(t.Array(t.String())),
  is_active: t.Optional(t.Boolean({
        description: "Role active status"
      }))
});

const rolesV1Routes = new Elysia({ prefix: "/roles/v1" })
  .post("/", ({ body }) => {
    return findOneById(body.id, "SELECT id, name, access, is_active, created_at FROM roles WHERE id = :id AND deleted_at IS NULL ORDER BY created_at DESC");
  }, {
    body: findRoleByIdPayloadSchema,
    detail: {
      summary: "Find Role by ID",
      description: "Retrieve a role by its ID",
      tags: ["Roles"],
    }
  })
  .post("/find", ({ body }) => {
    const payload = body;
    const whereConditions: string[] = [];
    const queryParams: Record<string, any> = {};

    // Build dynamic WHERE conditions based on payload and conditions config
    if (payload.id !== undefined && payload.id !== null) {
      whereConditions.push(`id = :id`);
    }
    if (payload.name !== undefined && payload.name !== null) {
      whereConditions.push(`name = :name`);
    }
    if (payload.access !== undefined && Array.isArray(payload.access) && payload.access.length > 0) {
      const placeholders = payload.access.map((_: any, index: number) => `:access_${index}`).join(', ');
      whereConditions.push(`access IN (${placeholders})`);
      payload.access.forEach((value: any, index: number) => {
        queryParams[`access_${index}`] = value;
      });
      delete payload.access; // Remove array from payload to avoid conflicts
    }
    if (payload.is_active !== undefined && payload.is_active !== null) {
      whereConditions.push(`is_active = :is_active`);
    }

    // Combine conditions with AND
    const dynamicWhere = whereConditions.length > 0 ? whereConditions.join(' AND ') : '1=1';
    const query = `SELECT id, name, access, is_active, created_at FROM roles WHERE ${dynamicWhere} AND deleted_at IS NULL ORDER BY created_at DESC`;
    
    // Merge payload with query params for parameter binding
    Object.assign(payload, queryParams);
    return findOne(payload, query);
  }, {
    body: findRolePayloadSchema,
    detail: {
      summary: "Find Role with Dynamic Conditions",
      description: "Retrieve a role using dynamic query conditions",
      tags: ["Roles"],
    }
  });

export default rolesV1Routes;
