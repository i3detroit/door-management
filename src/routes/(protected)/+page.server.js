import { auth } from "$lib/helpers/authServer.js";
import { config } from '$lib/helpers/fileStuff.js';

export const load = async ({ request }) => {
    const doorNames = config.doors.map(door => door.name);

    const session = await auth.api.getSession({
        headers: request.headers,
    });
    const admin = session.user.role === 'admin';

    return { doors: doorNames, admin };
};