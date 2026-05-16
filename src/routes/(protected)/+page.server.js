import { config } from '$lib/helpers/fileStuff.js';

export const load = () => {
    const doorNames = config.doors.map(door => door.name);
    return { doors: doorNames };
};