import axios from 'axios';
import { config } from "../lib/fileStuff.js";

export const rebootDoor = async (doorName) => {
    const door = config.doors.find((door) => door.name === doorName);
    await axios.post(
        `${config.homeAssistant.hostname}/api/services/script/turn_on`,
        { entity_id: `script.${door.script}` },
        { headers: {
            "Authorization": `Bearer ${config.homeAssistant.apiKey}`
        } }
    );
    console.log(`rebooting ${door.hostname}`);
};