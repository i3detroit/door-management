import { authClient } from "$lib/helpers/authClient.js";
import { browser } from "$app/environment";

export const load = async () => {
    if (browser) {
        await authClient.signOut();
    }
};