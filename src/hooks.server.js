import cron from "node-cron";
import { setAccess } from "$lib/setAccess.js";
import {
    logFiles,
    pruneLogByLines,
    pruneLogByDays
} from "$lib/helpers/fileStuff.js";

export const init = async () => {
    console.log('starting up, setting access');
    await setAccess();

    cron.schedule('0 0 * * *', async () => {
        console.log('updating again', new Date());
        await setAccess();

        pruneLogByDays(logFiles.access, 2 * 30);
        pruneLogByLines(logFiles.changes, 150);
    });
};