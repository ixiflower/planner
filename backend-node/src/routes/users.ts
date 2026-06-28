import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";

export const usersRouter = new Hono();

usersRouter.use("*", authMiddleware);

usersRouter.get("/", async (c) => {
  const { db } = await import("../db/index.js");
  const { users } = await import("../db/schema/index.js");
  const allUsers = await db.select({
    id: users.id,
    username: users.username,
    email: users.email,
    name: users.username,
    team_role: users.teamRole,
    developer: users.developer,
    profile_picture: users.profilePicture,
  }).from(users);
  return c.json(allUsers);
});
