import { auth } from "$lib/helpers/authServer.js";
import { config } from '$lib/helpers/fileStuff.js';

export const load = async ({ request }) => {
    const session = await auth.api.getSession({
        headers: request.headers,
    });
    const { name, email } = session.user;

    return { user: { name, email } };
};