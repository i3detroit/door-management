import * as v from "valibot";
import { command } from "$app/server";
import { setAccess } from "$lib/setAccess.js";
import { openDoor } from "$lib/openDoor.js";
import { rebootDoor } from "$lib/rebootDoor.js";

export const remoteSetAccess = command(
    v.string(),
    async () => await setAccess()
);

export const remoteOpenDoor = command(
    v.string(),
    async (doorName) => await openDoor(doorName)
);

export const remoteRebootDoor = command(
    v.string(),
    async (doorName) => await rebootDoor(doorName)
);