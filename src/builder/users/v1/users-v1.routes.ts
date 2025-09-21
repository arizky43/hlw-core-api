import { findOneById } from "@/core/services/find.service";
import Elysia, { t } from "elysia";

const usersV1Routes = new Elysia({ prefix: "/users/v1" })
  .get("/:id", ({ params: { id }}) => {
    return findOneById(id, "SELECT users.id, users.email, roles.access, users.is_active, users.created_at FROM users INNER JOIN roles ON users.role_id = roles.id WHERE users.id = :id AND users.deleted_at IS NULL ORDER BY users.created_at DESC");
  }, {
    params: t.Object({
      id: t.String({
        format: "uuid",
        description: "Id ID",
      })
    }),
    detail: {
      summary: "Find User by ID",
      description: "Retrieve a user by its ID",
      tags: ["Users"],
    }
  });

export default usersV1Routes;
