#!/usr/bin/env nodejs
'use strict';
const WebSocket = require("ws");
const rp = require('request-promise-native');
const csv=require('csvtojson')
const fs = require('fs');
const path = require('path');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const csvHeaders = ["CID", "name", "key (DEC)", "PIN"];

const args = process.argv.slice(2);
if(args.length != 1 || args[0] == "-h" || args[0] == "--help") {
    console.log("usage: setAccess.js <access.csv>");
    console.log("   update doors configured in config.json with people in access.csv");
    console.log("   access.csv header: " + csvHeaders.join(', '));
    process.exit(1);
}
let fileToParse = args[0];

try {
    if (! fs.existsSync(fileToParse)) {
        console.error(`no such file: "${fileToParse}"`);
        process.exit(2);
    }
} catch(err) {
    console.error(`error opening file: "${fileToParse}"`);
    console.error(err)
    process.exit(2);
}

let config = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'config.json')));


const hasSubArray = (master, sub) => {
    return sub.every(el => master.includes(el));
}


const userTypes = {
    Always: 1,
    Admin: 99,
    Disabled: 0,
};
const getExpectedUsers = (filename) => {
    return csv()
        .fromFile(filename)
        .then((users) => users.map((user) => {
            if(!hasSubArray(Object.keys(user), csvHeaders)) {
                console.error("userfile has bad headers, expecting " + csvHeaders.join(', '));
                process.exit(5);
            }
            return {
                uid: parseInt(user["key (DEC)"]).toString(),
                acctype: userTypes.Admin,
                username: `${user.CID}: ${user.name}`,
                validuntil: 4200000000, //year 2103, probably fine
                pincode: user.PIN
            };
        }).filter(user => user.uid != "NaN")); // assume that if we can't parse the key field the line is invalid
};

// return a promise to a working authorization header
const login = (host, username, password) => {
    const loginOptions = {
        uri: `http://${host}/login`,
        'auth': {
            'user': username,
            'pass': password,
            'sendImmediately': false
        },
        resolveWithFullResponse: true,
    };

    return rp(loginOptions).then((response) => {
        if (response.statusCode != 200) {
            console.log("unknown login issue, non 200 success response");
            console.log(response);
            throw new Error("unknown login issue");
        }
        return response.request.headers.authorization;
    }, (badResponse) => {
        if (badResponse.statusCode == 401) {
            throw new Error("bad password");
        } else {
            console.log("unknown login issue, bad response");
            console.log(badResponse);
            throw new Error("unknown login issue");
        }
    })
}


const getActualUsers = (ws) => {
    return new Promise((resolve, reject) => {
        let users = [];
        ws.on('message', async (message) => {
            let data = JSON.parse(message)
            //console.log(data);
            if(data.command == 'userlist') {
                users = users.concat(data.list);
                console.log(`parsed userlist page ${data.page} of ${data.haspages}`);
                if(data.page < data.haspages) {
                    await delay(500);
                    ws.send(`{"command":"userlist", "page":${data.page + 1}}`);
                } else {
                    resolve(users);
                }
            }
        });

        ws.send('{"command":"userlist", "page":1}');
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

const delUser = (ws, badUID) => {
    process.stdout.write(".");
    ws.send(JSON.stringify( {
        "command": "remove",
        "uid": badUID
    }));
};
const deleteUsers = (ws, badUsers) => {
    if(badUsers.length == 0) {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        let badUser = badUsers.pop();

        ws.on('message', async (message) => {
            let data = JSON.parse(message)
            //console.log(data);
            if(data.command == 'result' && data.resultof == 'remove') {
                if(data.result != true) {
                    console.error("failed to remove user, dying");
                    process.exit(5);
                }
                if(badUsers.length > 0) {
                    badUser = badUsers.pop();
                    await delay(500);
                    delUser(ws, badUser.uid);
                } else {
                    console.log("done removing users");
                    resolve();
                }
            }
        });
        delUser(ws, badUser.uid);
    });
};

const sendUser = (ws, user) => {
    process.stdout.write(".");
    let command = {
        "command": "userfile",
        "uid": user.uid.toString(),
        "pincode": user.pincode.toString(),
        "user": user.username,
        "acctype": user.acctype,
        "acctype2": null,
        "acctype3": null,
        "acctype4": null,
        "validuntil": user.validuntil
    };
    //console.log(JSON.stringify(command));
    ws.send(JSON.stringify(command));
};

const addUsers = (ws, users) => {
    if(users.length == 0) {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        let user = users.pop();

        ws.on('message', async (message) => {
            let data = JSON.parse(message)
            //console.log(data);
            if(data.command == 'result' && data.resultof == 'userfile') {
                if(data.result != true) {
                    console.error("failed to add user, dying");
                    process.exit(5);
                }
                if(users.length > 0) {
                    user = users.pop();
                    await delay(500);
                    sendUser(ws, user);
                } else {
                    console.log("done adding users");
                    resolve();
                }
            }
        });
        sendUser(ws, user);
    });
};

const isSameUser = (a, b) => a.uid == b.uid
    && a.username == b.username
    && a.pincode == b.pincode
    && a.acctype == b.acctype
    && a.validuntil == b.validuntil;

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

getExpectedUsers(fileToParse).then(async (expectedUsers) => {
    console.log(expectedUsers.length);
    console.log(expectedUsers[0]);

    const duplicateUsers = duplicates( expectedUsers, (a, b) => a.uid == b.uid);
    if(duplicateUsers.length > 0) {
        console.log("duplicate UIDs, fix config!");
        console.log(duplicateUsers.map(u => u.uid));
        process.exit(1);
    }

    console.log('make sure nobody is logged into the web ui of the doors');
    console.log("press enter to continue...");
    await keypress();
    return expectedUsers;
}).then((expectedUsers) => {
    config.doors.forEach((host) => {
        console.log(`connecting to: ${host.user}:${host.pass}@${host.ip}`);
        login(host.ip, host.user, host.pass)
            .then((auth) => {
                console.log('logged in');
                return connect(auth, host.ip)
            }) .then(async (ws) => {
                console.log('connected to websocket');
                await delay(1000);
                const actualUsers = await getActualUsers(ws);

                console.log(`expected ${expectedUsers.length} users`);
                console.log(`actual ${actualUsers.length} users`);
                const badUsers = onlyInLeft(actualUsers, expectedUsers, isSameUser);
                const missingUsers = onlyInLeft(expectedUsers, actualUsers, isSameUser);
                //console.log("bad users");
                //console.log(badUsers);
                //console.log("missing users");
                //console.log(missingUsers);

                if(badUsers.length == 0 && missingUsers.length == 0) {
                    console.log("nothing to do =D");
                } else {
                    if(badUsers.length > 0) {
                        await delay(1000);
                        console.log(`deleting ${badUsers.length} users`);
                        await deleteUsers(ws, badUsers);
                        console.log("done removing");
                    }
                    if(missingUsers.length > 0) {
                        await delay(1000);
                        console.log(`adding ${missingUsers.length} users`);
                        await addUsers(ws, missingUsers);
                        console.log("done adding");
                    }
                }
                process.exit(0);
            });
    });
});
