import { findOneById, findOne } from "@/core/services/find.service";
import Elysia, { t } from "elysia";

const findRoleByIdPayloadSchema = t.Object({
  id: t.String({
        format: "uuid",
        description: "Role ID"
      })
});

const findRolePayloadSchema = t.Object({
  name: t.Optional(t.String({
        description: "Role name"
      })),
  access: t.Optional(t.String({
        description: "Role access level"
      })),
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
    const conditions: string[] = [];
    
    if (body.name !== undefined) {
      conditions.push("name = :name");
    }
    if (body.access !== undefined) {
      conditions.push("access = :access");
    }
    if (body.is_active !== undefined) {
      conditions.push("is_active = :is_active");
    }
    
    const dynamicConditions = conditions.length > 0 ? conditions.join(' AND ') : '1=1';
    const query = "SELECT id, name, access, is_active, created_at FROM roles WHERE {dynamic_conditions} AND deleted_at IS NULL ORDER BY created_at DESC".replace('{dynamic_conditions}', dynamicConditions);
    return findOne(payload, query);
  }, {
    body: findRolePayloadSchema,
    detail: {
      summary: "Find Role by Dynamic Parameters",
      description: "Retrieve a role using dynamic query parameters (name, access, is_active)",
      tags: ["Roles"],
    }
  });

export default rolesV1Routes;
