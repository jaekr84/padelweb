import { createClerkClient } from '@clerk/backend';
import dotenv from 'dotenv';

dotenv.config();

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

async function run() {
    const email = 'dkdunko@gmail.com';
    const password = process.env.ADM_PASSWORD || 'acap2026';

    console.log(`Checking superadmin status for: ${email}...`);

    try {
        // 1. Search for user
        const users = await clerk.users.getUserList({ emailAddress: [email] });
        let user = users.data[0];

        if (!user) {
            console.log('User not found. Creating in Clerk...');
            user = await clerk.users.createUser({
                emailAddress: [email],
                password: password,
                publicMetadata: { role: 'superadmin' }
            });
            console.log('User created successfully.');
        } else {
            console.log('User already exists. Updating metadata and password...');
            await clerk.users.updateUser(user.id, {
                password: password,
                publicMetadata: { role: 'superadmin' }
            });
            console.log('User role and password updated.');
        }

        console.log('All set up! This user is now a SUPERADMIN.');

    } catch (error) {
        console.error('Error during superadmin setup:', error);
    }
}

run();
