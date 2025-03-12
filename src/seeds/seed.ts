import { sql } from "drizzle-orm";
import { db } from "../db";
import { permissions, rolePermissions, roles } from "../db/schema/auth";

(async function seed() {
	try {
		// biome-ignore lint/suspicious/noConsole:
		console.log("Seeding database...");

		// biome-ignore lint/suspicious/noConsole:
		console.log("seeding roles");
		await db.insert(roles).values([
			{
				id: "94f3f25f-9b24-4c09-bea3-3f111e44af53",
				name: "guest",
				updatedAt: sql`NOW()`,
			},
			{
				id: "f7129912-48e8-4f03-8705-07907da83e26",
				name: "admin",
				updatedAt: sql`NOW()`,
			},
			{
				id: "c5729470-51e2-44f3-b891-372ecfdddf3c",
				name: "community",
				updatedAt: sql`NOW()`,
			},
			{
				id: "e2f7809b-928b-4899-aba6-40a7b35f30ca",
				name: "franchise",
				updatedAt: sql`NOW()`,
			},
			{
				id: "64f258de-113f-49b3-a71b-313f599afe8d",
				name: "manager",
				updatedAt: sql`NOW()`,
			},
			{
				id: "38e6e185-3a13-4ffb-807b-92574f648ab9",
				name: "worker",
				updatedAt: sql`NOW()`,
			},
		]);

		// biome-ignore lint/suspicious/noConsole:
		console.log("seeding permission");
		await db.insert(permissions).values([
			{
				id: "ab153b3f-a8c5-45f2-834c-5f664df2e609",
				description: "Can invite users with roles",
				scope: "create:invitation",
				updatedAt: sql`NOW()`,
			},
			{
				id: "12c8c2cb-8ed1-4f6d-8f1a-d47937a15992",
				description: "Can read own profile",
				scope: "read:profile",
				updatedAt: sql`NOW()`,
			},
		]);

		const roleIds = [
			"94f3f25f-9b24-4c09-bea3-3f111e44af53", // guest
			"f7129912-48e8-4f03-8705-07907da83e26", // admin
			"c5729470-51e2-44f3-b891-372ecfdddf3c", // community
			"e2f7809b-928b-4899-aba6-40a7b35f30ca", // franchise
			"64f258de-113f-49b3-a71b-313f599afe8d", // manager
			"38e6e185-3a13-4ffb-807b-92574f648ab9", // worker
		];
		const rolePermissionsForReadProfile = roleIds.map((roleId) => ({
			roleId,
			permissionId: "12c8c2cb-8ed1-4f6d-8f1a-d47937a15992",
		}));

		// biome-ignore lint/suspicious/noConsole:
		console.log("seeding role permission");
		await db.insert(rolePermissions).values([
			{
				roleId: "f7129912-48e8-4f03-8705-07907da83e26",
				permissionId: "ab153b3f-a8c5-45f2-834c-5f664df2e609",
			},
		]);
		await db.insert(rolePermissions).values(rolePermissionsForReadProfile);

		// biome-ignore lint/suspicious/noConsole:
		console.log("Seed data inserted successfully!");
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole:
		console.error(error);
	}
})();
