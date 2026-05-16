import { start } from "./index.js";
import { auth } from "$lib/helpers/authServer.js";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { redirect } from "@sveltejs/kit";
import { building } from "$app/environment";

export const init = start;

export const handle = async ({ event, resolve }) => {
	if (event.route.id?.includes("(protected)")) {
		const session = await auth.api.getSession({
			headers: event.request.headers,
		});

		if (session) {
			event.locals.session = session?.session;
			event.locals.user = session?.user;

			return svelteKitHandler({ event, resolve, auth, building });
		} else {
			redirect(307, "/login");
		}
	} else {
		return svelteKitHandler({ event, resolve, auth, building });
	}
};