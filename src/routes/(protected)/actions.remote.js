import * as v from "valibot";
import { query } from "$app/server";
import { setAccessWithRetry } from "$lib/setAccess.js";
import { openDoor } from "$lib/openDoor.js";
import { rebootDoor } from "$lib/rebootDoor.js";

export const remoteSetAccess = query(
    v.string(),
    async () => await setAccessWithRetry()
);

export const remoteOpenDoor = query(
    v.string(),
    async (doorName) => await openDoor(doorName)
);

export const remoteRebootDoor = query(
    v.string(),
    async (doorName) => await rebootDoor(doorName)
);
