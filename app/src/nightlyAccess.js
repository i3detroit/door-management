import * as fs from "fs";
import * as path from "path";
import mqtt from "mqtt";
import cron from "node-cron";
import { setAccess } from "./setAccess.js";
import {
    logSwipe,
    logFiles,
    pruneLogByLines,
    pruneLogByDays
} from "../lib/fileStuff.js";

// setAccess also automatically runs once on import
cron.schedule('0 0 * * *', async () => {
    console.log('updating again', new Date());
    await setAccess();

    pruneLogByDays(logFiles.access, 2 * 30);
    pruneLogByLines(logFiles.changes, 150);
});

const config = JSON.parse(fs.readFileSync(path.resolve(process.env.DATA_DIR, 'config.json')));

console.log('trying to connect to mqtt broker...');
const client = mqtt.connect(`mqtt://${config.mqtt.server}:${config.mqtt.port}`, {
    username: config.mqtt.username,
    password: config.mqtt.password
});

client.on("connect", () => {
    console.log(`connected to mqtt broker at ${config.mqtt.server}`);
    client.subscribe("i3/doors/#", (error) => {
        if (error) { console.error(error); }
    });
});

client.on("message", (topic, buffer) => {
    const message = buffer.toString();
    try {
        const json = JSON.parse(message);
        if (!json.access) { return; }

        delete json.cmd;
        delete json.time;
        json.date = new Date().toISOString();
        logSwipe(JSON.stringify(json));
    } catch (error) {
    }
});

client.on("error", (error) => console.error(error));