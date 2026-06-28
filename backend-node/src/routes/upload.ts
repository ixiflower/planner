import "dotenv/config";
import { Hono } from "hono";
import { v2 as cloudinary } from "cloudinary";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema/index.js";
import { authMiddleware } from "../middleware/auth.js";

// Cloudinary auto-configures from CLOUDINARY_URL env var

export const uploadRouter = new Hono();

// All routes require auth
uploadRouter.use("*", authMiddleware);

// ─── Update profile (name, email, bio, avatar) ───
uploadRouter.post("/update-profile", async (c) => {
  const user = c.get("user")!;
  const contentType = c.req.header("content-type") || "";

  try {
    // Handle multipart (file upload)
    if (contentType.includes("multipart/form-data")) {
      const formData = await c.req.parseBody();
      const name = formData.name as string | undefined;
      const email = formData.email as string | undefined;
      const bio = formData.bio as string | undefined;
      const profilePicture = formData.profile_picture as File | undefined;

      const updates: Record<string, any> = {};

      if (name) {
        const [first, ...rest] = name.trim().split(" ");
        updates.firstName = first || "";
        updates.lastName = rest.join(" ") || "";
      }
      if (email) updates.email = email;
      if (bio !== undefined) updates.bio = bio;

      // Upload avatar to Cloudinary
      if (profilePicture) {
        const buffer = Buffer.from(await profilePicture.arrayBuffer());
        const result = await new Promise<any>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "planner/avatars",
              public_id: `user_${user.id}`,
              overwrite: true,
              transformation: [{ width: 300, height: 300, crop: "fill", gravity: "face" }],
            },
            (err, res) => (err ? reject(err) : resolve(res))
          );
          stream.end(buffer);
        });
        updates.profilePicture = result.secure_url;
      }

      if (Object.keys(updates).length === 0) {
        return c.json({ error: "No fields to update" }, 400);
      }

      const [updatedUser] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, user.id))
        .returning();

      return c.json({
        success: true,
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          name: `${updatedUser.firstName || ""} ${updatedUser.lastName || ""}`.trim() || updatedUser.username,
          profile_picture: updatedUser.profilePicture,
          team_role: updatedUser.teamRole,
          developer: updatedUser.developer,
          bio: updatedUser.bio,
          is_admin: updatedUser.isStaff || updatedUser.isSuperuser,
          is_superuser: updatedUser.isSuperuser,
        },
      });
    }

    // Handle JSON (simple updates)
    const { name, email, bio } = await c.req.json();
    const updates: Record<string, any> = {};

    if (name) {
      const [first, ...rest] = name.trim().split(" ");
      updates.firstName = first || "";
      updates.lastName = rest.join(" ") || "";
    }
    if (email) updates.email = email;
    if (bio !== undefined) updates.bio = bio;

    if (Object.keys(updates).length === 0) {
      return c.json({ error: "No fields to update" }, 400);
    }

    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, user.id))
      .returning();

    return c.json({
      success: true,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        name: `${updatedUser.firstName || ""} ${updatedUser.lastName || ""}`.trim() || updatedUser.username,
        profile_picture: updatedUser.profilePicture,
        team_role: updatedUser.teamRole,
        developer: updatedUser.developer,
        bio: updatedUser.bio,
        is_admin: updatedUser.isStaff || updatedUser.isSuperuser,
        is_superuser: updatedUser.isSuperuser,
      },
    });
  } catch (err: any) {
    console.error("Update profile error:", err);
    return c.json({ error: err.message || "Update failed" }, 500);
  }
});

// ─── Upload any file to Cloudinary ───
uploadRouter.post("/upload", async (c) => {
  const user = c.get("user")!;
  try {
    const formData = await c.req.parseBody();
    const file = formData.file as File | undefined;
    const folder = (formData.folder as string) || "planner/uploads";

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: `${user.id}_${Date.now()}`,
          resource_type: "auto",
        },
        (err, res) => (err ? reject(err) : resolve(res))
      );
      stream.end(buffer);
    });

    return c.json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    return c.json({ error: err.message || "Upload failed" }, 500);
  }
});
