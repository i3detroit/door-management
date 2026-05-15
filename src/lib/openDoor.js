import { client } from "$lib/helpers/mqttLogging.js";
import { config } from "$lib/helpers/fileStuff.js";

export const openDoor = async (doorName) => {
    const door = config.doors.find((door) => door.name === doorName);
    await client.publishAsync(`${door.topic}/cmd`, JSON.stringify(
        { cmd: "opendoor", "doorip": door.ip }
    ));
    console.log(`opening ${door.hostname}`);
};