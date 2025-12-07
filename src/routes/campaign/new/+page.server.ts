import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ cookies }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		throw redirect(302, '/login');
	}

	const [user] = await db
		.select({
			id: users.id,
			username: users.username,
			displayName: users.displayName
		})
		.from(users)
		.where(eq(users.id, parseInt(userId)))
		.limit(1);

	if (!user) {
		cookies.delete('userId', { path: '/' });
		throw redirect(302, '/login');
	}

	return { user };
};
