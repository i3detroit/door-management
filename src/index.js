import cron from "node-cron";
import { setAccess } from "$lib/setAccess.js";
import {
    logFiles,
    pruneLogByLines,
    pruneLogByDays
} from "$lib/helpers/fileStuff.js";
import { logMQTT } from "$lib/helpers/mqttLogging.js";
import { env } from "$env/dynamic/private";

export const start = async () => {
    if (env.NODE_ENV == 'production') {
        console.log('starting up, setting access');
        await setAccess();
    } else {
        console.log('skipping initial set access, dev mode detected');
    }

    await logMQTT();

    cron.schedule('0 0 * * *', async () => {
        console.log('updating again', new Date());
        await setAccess();

        pruneLogByDays(logFiles.access, 2 * 30);
        pruneLogByLines(logFiles.changes, 150);
    });
};