import { auth } from "$lib/helpers/authServer.js";

export const load = async ({ request }) => {
    return await auth.api.listUsers({
        query: {},
        headers: request.headers
    });
};