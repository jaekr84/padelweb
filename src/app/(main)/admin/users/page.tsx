import { db } from "@/db";
import { users, categoriesTable } from "@/db/schema";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import UserManagementClient from "@/app/(main)/admin/users/UserManagementClient";
import { desc, asc, eq } from "drizzle-orm";


export default async function UserManagementPage() {
    const session = await getSession() as { userId: string, role: string } | null;
    
    if (!session || session.role !== "superadmin") {
        redirect("/home");
    }

    const allUsers = await db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
        bannedUntil: users.bannedUntil,
        points: users.points,
        category: users.category,
        createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

    const allCategories = await db
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.isActive, true))
        .orderBy(asc(categoriesTable.categoryOrder));

    return (
        <UserManagementClient 
            initialUsers={allUsers as any} 
            categories={allCategories as any} 
        />
    );
}

