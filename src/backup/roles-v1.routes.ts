import { findOneById } from "@/core/services/find.service";
import Elysia, { t } from "elysia";

const rolesV1Routes = new Elysia({ prefix: "/roles/v1" })
  .get("/:id", ({ params: { id }}) => {
    return findOneById(id, "SELECT id, name, access, is_active, created_at FROM roles WHERE id = :id AND deleted_at IS NULL ORDER BY created_at DESC");
  }, {
    params: t.Object({
      id: t.String({
        format: "uuid",
        description: "Role ID",
      }),
    }),
    detail: {
      summary: "Find Role by ID",
      description: "Retrieve a role by its ID",
      tags: ["Roles"],
    },
  });

export default rolesV1Routes;
