import mqtt from "mqtt";
import { config, logSwipe } from "./fileStuff.js";

export let client;

export const logMQTT = async () => {
    console.log('trying to connect to mqtt broker...');

    const mqttServer = `mqtt://${config.mqtt.server}:${config.mqtt.port}`;
    client = await mqtt.connectAsync(mqttServer, {
        username: config.mqtt.username,
        password: config.mqtt.password
    });

    console.log(`connected to mqtt broker at ${config.mqtt.server}`);
    await client.subscribeAsync("i3/doors/#");

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
            console.error(error);
        }
    });
};
