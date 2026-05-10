import WebSocket from "ws";
import * as fs from "fs";
import * as path from "path";
import { isSameUser, writeUserCSVFile, readUserCSVFile, logUser } from "../lib/fileStuff.js";
import { fetchAndProcessHelloClub } from "../lib/helloClub.js";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { AxiosDigestAuth } from '@lukesthl/ts-axios-digest-auth';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFile);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const csvHeaders = ["CID", "name", "key (DEC)", "PIN"];
const userTypes = {
    Always: 1,
    Admin: 99,
    Disabled: 0,
};
const doorUser2user = (u) => {
    if(!u.hasOwnProperty("username") || !u.hasOwnProperty("uid") || !u.hasOwnProperty("pincode")) {
        console.log("door user missing fields:");
        console.log(u);
        // door gives us bad data sometimes, so just basicaly mark the user bad if we have the uid
        if(!u.hasOwnProperty("uid")) {
            throw new Error("Door user missing fields");
        }
        u.username = "?";
        u.pincode = "";
    }
    //const match = u.username.match(/([0-9a-f]+) (.*)/);
    //const cid = match ? match[1] : "?";
    //const name = match ? match[2] : "?";
    const name = u.username;
    return {
        uid: u.uid,
        pincode: u.pincode,
        name: name,
        // cid: cid,
    };
};
const user2doorUser = (user) => {
    if(!user.hasOwnProperty("uid") || /*!user.hasOwnProperty("cid") ||*/ !user.hasOwnProperty("pincode") || !user.hasOwnProperty("name")) {
        console.log("user missing fields:");
        console.log(user);
        throw new Error("user missing fields");
    }
    if(isNaN(user.uid) || isNaN(user.pincode)) {
        console.log("user has NaN fob data:");
        console.log(user);
        throw new Error("user bad fields");
    }
    return {
        "uid": user.uid,
        "pincode": user.pincode,
        //"user": `${user.cid} ${user.name}`,
        "user": `${user.name.substring(0, 10)}`, // yaaaaaay memory bugs in esp-rfid
    };
};

const hasSubArray = (master, sub) => {
    return sub.every(el => master.includes(el));
}


// return a promise to a working authorization header
const login = (host, username, password) => {
    const digestAuthClient = new AxiosDigestAuth({
        username: username,
        password: password,
    });

    return digestAuthClient.get(`http://${host}/login`)
    .then((response) => {
        if (response.status != 200) {
            console.log("unknown login issue, non 200 success response");
            console.log(response);
            throw new Error("unknown login issue");
        }
        return response.config.headers.authorization;
    }).catch((badResponse) => {
        if (badResponse.status == 401) {
            throw new Error("bad password");
        } else {
            console.log("unknown login issue, bad response");
            console.log(badResponse);
            throw new Error("unknown login issue");
        }
    });
}


const getActualUsers = (ws, hostname) => {
    let page = 1;
    let haspages = 2;
    return new Promise((resolve, reject) => {
        let users = [];
        ws.on('message', async (message) => {
            let data;
            try {
                data = JSON.parse(message);
            } catch (e) {
                ws.send(`{"command":"userlist", "page":${page}}`);
                return;
            }
            //console.log(data);
            if (data.command == 'userlist') {
                // sometimes it doesn't return haspages and this makes us sad
                if (data.haspages) {
                    haspages = data.haspages;
                }
                page++;
                //console.log(data.list.map(u => doorUser2user(u)));
                users = users.concat(data.list);
                if (!data.haspages) {
                    console.warn("got truncated page from door, no haspages");
                    console.log(data);
                }
                console.log(`${hostname} - parsed userlist page ${data.page} of ${data.haspages}`);
                if (data.page < haspages) {
                    await delay(500);
                    ws.send(`{"command":"userlist", "page":${page}}`);
                } else {
                    resolve(users.map(u => doorUser2user(u)));
                }
            }
        });

        ws.send(`{"command":"userlist", "page":${page}}`);
    });
};

const connect = (auth, ip) => {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(`ws://${ip}/ws`,
            {
                headers: {
                    authorization: auth
                }
            }
        );

        ws.on('error', (error) => {
            console.log("ws connect error");
            console.log(error);
            reject(error);
        });

        ws.on('open', function open() {
            resolve(ws);
        });
    });
};

const delUser = (ws, user) => {
    process.stdout.write(".");
    ws.send(JSON.stringify( {
        "command": "remove",
        "uid": user.uid
    }));
};

const deleteUsers = (door, badUsers) => {
    if (badUsers.length == 0) {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        let badUser = badUsers.pop();

        door.ws.on('message', async (message) => {
            let data = JSON.parse(message)
            //console.log(data);
            if (data.command == 'result' && data.resultof == 'remove') {
                if (data.result != true) {
                    logUser(logFile, false, 'del', door, badUser);
                    console.error("failed to remove user, dying");
                    process.exit(5);
                }
                logUser(logFile, true, 'del', door, badUser);
                if (badUsers.length > 0) {
                    badUser = badUsers.pop();
                    await delay(500);
                    delUser(door.ws, badUser);
                } else {
                    console.log("done removing users");
                    resolve();
                }
            }
        });
        delUser(door.ws, badUser);
    });
};

const sendUser = (ws, user) => {
    process.stdout.write(".");
    let command = {
        "command": "userfile",
        "acctype": userTypes.Admin,
        "acctype2": null,
        "acctype3": null,
        "acctype4": null,
        "validuntil": 4200000000, //year 2103, probably fine
        ...user2doorUser(user),
    };
    //console.log(JSON.stringify(command));
    ws.send(JSON.stringify(command));
};

const addUsers = (door, users) => {
    if (users.length == 0) {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        let user = users.pop();

        door.ws.on('message', async (message) => {
            let data = JSON.parse(message)
            //console.log(data);
            if (data.command == 'result' && data.resultof == 'userfile') {
                if (data.result != true) {
                    logUser(logFile, false, 'add', door, user);
                    console.error("failed to add user, dying");
                    process.exit(5);
                }
                logUser(logFile, true, 'add', door, user);
                if (users.length > 0) {
                    user = users.pop();
                    await delay(500);
                    sendUser(door.ws, user);
                } else {
                    console.log("done adding users");
                    resolve();
                }
            }
        });
        sendUser(door.ws, user);
    });
};


// Get items that only occur in the left array,
// using the compareFunction to determine equality.
const onlyInLeft = (left, right, compareFunction) =>
    left.filter(leftValue =>
        !right.some(rightValue =>
            compareFunction(leftValue, rightValue)));
const duplicates = (arr, compareFunction) =>
    arr.filter((item, index) =>
        arr.findIndex(itemB => compareFunction(item, itemB)) != index);

const keypress = async () => {
    process.stdin.setRawMode(true)
    return new Promise(resolve => process.stdin.once('data', () => {
        process.stdin.setRawMode(false)
        resolve()
    }))
};

// *********************** PROGRAM START *****************************
const args = process.argv.slice(2);
if (args[0] == "-h" || args[0] == "--help") {
    console.log("usage: setAccess.js[door-name]");
    console.log("   update doors configured in config.json with people in hello club");
    console.log("   door name just is some substring of door hostname, so like 'a' or 'b'");
    console.log("   access.csv header: " + csvHeaders.join(', '));
    process.exit(1);
}

let doorName = args[0];

let config = JSON.parse(fs.readFileSync(path.resolve(process.env.DATA_DIR, 'config.json')));
let logFile = path.resolve(process.env.DATA_DIR, 'changes.log');

let doorsToProgram = config.doors;
if (doorName) {
    doorsToProgram = config.doors.filter((door) => door.hostname.includes(doorName))
}
if (doorsToProgram.length == 0) {
    console.error(`door ${doorName} not found in config file, remmber DO NOT INCLUDE THE CSV ANYMORE it's all in hello club`);
    process.exit(1);
}
console.log("programming the following doors:")
doorsToProgram.forEach((door) => {
    console.log(`    ${door.hostname}`);
    door.userList = path.resolve(process.env.DATA_DIR, door.userList);
});

console.log("overriding with hello club users");
let expectedUsers = await fetchAndProcessHelloClub(config.helloClubAPI);

const duplicateUsers = duplicates(expectedUsers, (a, b) => a.uid == b.uid);
if (duplicateUsers.length) {
    console.error("duplicate UIDs, fix your helloclub records!");
    console.error(duplicateUsers.map(du => (
        expectedUsers.filter(u => u.uid == du.uid)
            .map(u => `${u.name} -> ${u.uid}`)
    )).flat().join("\n"));
}

await Promise.all(doorsToProgram.map(async (door) => {
    console.log(`connecting to: ${door.user}:${door.pass}@${door.ip}`);
    const auth = await login(door.ip, door.user, door.pass);
    console.log(`${door.hostname} - logged in`);
    
    const ws = await connect(auth, door.ip);
    // TODO: make connect just modify door or something so we can reconnect transparently
    door.ws = ws;
    console.log(`${door.hostname} - connected to websocket`);
    await delay(1000);

    const getUsers = async (fetchActualUsers, door) => {
        if (fetchActualUsers) {
            // read from door, not user file
            const actualUsers = await getActualUsers(door.ws, door.hostname);
            // update cache with whatever we read from door
            writeUserCSVFile(door.userList, actualUsers);
            return actualUsers;
        } else {
            // TODO: readUserCSVFile needs to de duplicate
            return readUserCSVFile(door.userList);
        }
    };

    // TODO: input flag to ask door vs cache
    const fetchActualUsers = true;
    const actualUsers = await getUsers(fetchActualUsers, door);

    const badUsers = onlyInLeft(actualUsers, expectedUsers, isSameUser);
    const missingUsers = onlyInLeft(expectedUsers, actualUsers, isSameUser);
    console.log(`${door.hostname} - users to remove: ${badUsers.length}`);
    console.log(`${door.hostname} - users to add: ${missingUsers.length}`);
    console.log(`bad users ${badUsers.length}`);
    if (badUsers.length) { console.log(badUsers[0]); }
    console.log(`missing users ${missingUsers.length}`);
    if (missingUsers.length) { console.log(missingUsers[0]); }

    if (!badUsers.length && !missingUsers.length) {
        console.log(`${door.hostname} - nothing to do`);
        return;
    }
    
    if (badUsers.length) {
        await delay(1000);
        console.log(`${door.hostname} - deleting ${badUsers.length} users`);
        await deleteUsers(door, badUsers);
        console.log(`${door.hostname} - done removing`);
    }

    if (missingUsers.length) {
        await delay(1000);
        console.log(`${door.hostname} - adding ${missingUsers.length} users`);
        await addUsers(door, missingUsers);
        console.log(`${door.hostname} - done adding`);
    }
}));

console.log("all done");