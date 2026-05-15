import { command } from "$app/server";
import { setAccess } from "$lib/setAccess";

export const remoteSetAccess = command(async () => await setAccess());