import { db } from "../db";
import { roles, permissions, rolePermissions } from "../db/schema";

(async function seed() {
    try {
        console.log("Seeding database...");

        console.log("seeding roles")
        await db.insert(roles).values([
            { id: "10000000-0000-0000-0000-000000000001", name: "super_admin", updatedAt: new Date() },
            { id: "10000000-0000-0000-0000-000000000002", name: "admin", updatedAt: new Date() },
            { id: "10000000-0000-0000-0000-000000000003", name: "guest", updatedAt: new Date() }
        ]);

        console.log("seeding permission")
        await db.insert(permissions).values([
            { id: "20000000-0000-0000-0000-000000000001", description: "Can create and modify users", scope: "write:users", updatedAt: new Date() },
            { id: "20000000-0000-0000-0000-000000000002", description: "Can read user details", scope: "read:users", updatedAt: new Date() },
            { id: "20000000-0000-0000-0000-000000000003", description: "Can delete users", scope: "delete:users", updatedAt: new Date() },
            { id: "20000000-0000-0000-0000-000000000004", description: "Can update user details", scope: "update:users", updatedAt: new Date() }
        ]);

        console.log("seeding role permission")
        await db.insert(rolePermissions).values([
            { roleId: "10000000-0000-0000-0000-000000000001", permissionId: "20000000-0000-0000-0000-000000000001" }, 
            { roleId: "10000000-0000-0000-0000-000000000001", permissionId: "20000000-0000-0000-0000-000000000002" }, 
            { roleId: "10000000-0000-0000-0000-000000000001", permissionId: "20000000-0000-0000-0000-000000000003" },
            { roleId: "10000000-0000-0000-0000-000000000001", permissionId: "20000000-0000-0000-0000-000000000004" },
            { roleId: "10000000-0000-0000-0000-000000000002", permissionId: "20000000-0000-0000-0000-000000000002" }, 
            { roleId: "10000000-0000-0000-0000-000000000003", permissionId: "20000000-0000-0000-0000-000000000002" }
        ]);

        console.log("Seed data inserted successfully!");
    } catch (error) {
        console.error(error);
    } 
})();
