import { findOneById, findOne } from "@/core/services/find.service";
import Elysia, { t } from "elysia";

const findRoleByIdPayloadSchema = t.Object({
  id: t.String({
        format: "uuid",
        description: "Role ID"
      })
});

const findRolePayloadSchema = t.Object({
  id: t.String({
        format: "uuid",
        description: "Role id"
      })
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
    const query = "SELECT id, name, access, is_active, created_at FROM roles WHERE id = :id AND deleted_at IS NULL ORDER BY created_at DESC";
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
