import cron from "node-cron";
import { setAccess } from "./src/setAccess.js";
import {
    logFiles,
    pruneLogByLines,
    pruneLogByDays
} from "./lib/fileStuff.js";

console.log('starting up, setting access');
await setAccess();

cron.schedule('0 0 * * *', async () => {
    console.log('updating again', new Date());
    await setAccess();

    pruneLogByDays(logFiles.access, 2 * 30);
    pruneLogByLines(logFiles.changes, 150);
});