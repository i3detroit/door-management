#!/usr/bin/env nodejs
'use strict';
const WebSocket = require("ws");
const rp = require('request-promise-native');
const csv=require('csvtojson')
const fs = require('fs');

let config = JSON.parse(fs.readFileSync('config.json'));

// parse csv of "cid, Name, Serial, PIN"
const getExpectedUsers = (filename) => {
    return csv()
        .fromFile(filename)
        .then((users) => users.map((user) => {
            return {
                uid: user.Serial,
                acctype: 1,
                username: `${user.cid}: ${user.Name}`,
                validuntil: 4200000000, //year 2103, probably fine
                pincode: `${user.PIN}`
            };
        }));
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

    return rp(loginOptions).then( (response) => {
        if(response.statusCode != 200) {
            reject("failed to login");
        }
        return response.request.headers.authorization;
    })
}


//getExpectedUsers('users.csv').then((users) => {
//  console.log(users);
//});

const userTypes = {
    Always: 1,
    Disabled: 0,
    Admin: 99,
};

const getActualUsers = (ws) => {
    return new Promise((resolve, reject) => {
        let users = [];
        ws.on('message', (message) => {
            let data = JSON.parse(message)
            //console.log(data);
            if(data.command == 'userlist') {
                users = users.concat(data.list);
                console.log(`parsed userlist page ${data.page} of ${data.haspages}`);
                if(data.page < data.haspages) {
                    ws.send('{"command":"userlist", "page":' + (data.page + 1) + '}');
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
const deleteUsers = (ws, badUsers, ip) => {
    badUsers.forEach((u) => {
        ws.send(JSON.stringify( {
            "command": "remove",
            "uid": u.uid
        }));
    });
}
const addUsers = (ws, users, ip) => {
    users.forEach((u) => {
        ws.send(JSON.stringify( {
            "command":"userfile",
            "uid":u.uid,
            "pincode":u.pincode,
            "user":u.username,
            "acctype":1,
            "acctype2":null,
            "acctype3":null,
            "acctype4":null,
            "validuntil":u.validuntil
        }));
    });
}

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

(async () => {
    console.log('make sure nobody is logged into the web ui of the doors');
    console.log("press enter to continue...");
    await keypress();
})().then(() => {
    config.doors.forEach((host) => {
        console.log(`connecting to: ${host.user}:${host.pass}@${host.ip}`);
        login(host.ip, host.user, host.pass)
            .then((auth) => {
                console.log('logged in');
                return connect(auth, host.ip)
            }) .then(async (ws) => {
                console.log('connected to websocket');
                const actualUsers = await getActualUsers(ws);
                const expectedUsers = await getExpectedUsers('users.csv');

                const badUsers = onlyInLeft(actualUsers, expectedUsers, isSameUser);
                const missingUsers = onlyInLeft(expectedUsers, actualUsers, isSameUser);
                // I guess it won't let us add duplicate UIDs
                //const duplicateUsers = duplicates( actualUsers, isSameUser);
                console.log("bad users");
                console.log(badUsers);
                console.log("missing users");
                console.log(missingUsers);
                //console.log("duplicate users");
                //console.log(duplicateUsers);

                deleteUsers(ws, badUsers);
                addUsers(ws, missingUsers)
                process.exit(0);
            });
    });
});
