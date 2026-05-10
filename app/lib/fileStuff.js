import * as csv from "csvtojson";
import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

export const isSameUser = (a, b) =>
    a.uid == b.uid
    //&& a.cid == b.cid
    && a.name.substring(0, 10) == b.name.substring(0, 10)
    && a.pincode == b.pincode;

export const parseUserCSV = (dataStr) => {
    const data = parse(dataStr, {
        columns: true,
        relax_column_count: true,
    });

    return data.map((user) => ({
        uid: parseInt(user["key (DEC)"]).toString(),
        cid: user.CID.trim(),
        name: user.name.trim(),
        pincode: user.PIN.trim(),
    }));
};

export const readUserCSVFile = (file) => {
    const data = fs.readFileSync(file).toString();
    return parseUserCSV(data);
};

export const stringifyUserCSV = (users) => {
    return (
        "CID,name,key (DEC),PIN,comment,\n" +
        stringify(
            users.map((user) => [user.cid, user.name, user.uid, user.pincode])
        )
    );
};

export const writeUserCSVFile = (filename, users) => {
    fs.writeFileSync(filename, stringifyUserCSV(users));
};

export const filterOutUser = (users, userToRemove) => {
    return users.filter((user) => !isSameUser(user, userToRemove));
};

export const logFiles = Object.fromEntries(
    [ 'access', 'changes' ].map(fileName => (
        [ fileName, path.resolve(process.env.DATA_DIR, `${fileName}.log`) ]
    ))
);

export const logUser = (success, action, door, user) => {
    //console.log(`${success ? "successfuly" : "Failed to"} ${action} ${user.cid} ${user.name} on ${door.hostname}`);
    if (success) {
        let users = readUserCSVFile(door.userList);
        if (action == "add") {
            users.push(user);
        } else if (action == "del") {
            users = filterOutUser(users, user);
        }
        writeUserCSVFile(door.userList, users);
    }
    fs.appendFile(
        logFiles.changes,
        `${new Date().toISOString()} [${door.hostname} ${action}] success: ${success}, cid:"${
            user.cid
        }" name:"${user.name}", uid:"${user.uid}", pin:"${user.pincode}"\n`,
        (err) => {
            if (err) console.error(`failed to write to changes logfile`);
        }
    );
};

export const logSwipe = (data) => {
    fs.appendFile(
        logFiles.access,
        `${data}\n`,
        (err) => {
            if (err) console.error(`failed to write to access logfile`);
        }
    );
}

export const pruneLogByLines = (logFile, keepLines) => {
    if (!fs.existsSync(logFile)) { return; }

    const logData = fs.readFileSync(logFile).toString();
    const lines = logData.split('\n');

    const keptLines = lines.splice(-keepLines, keepLines);
    fs.writeFileSync(logFile, keptLines.join('\n'));
};

export const pruneLogByDays = (logFile, keepDays) => {
    if (!fs.existsSync(logFile)) { return; }

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - keepDays);

    const logData = fs.readFileSync(logFile).toString();
    const lines = logData.split('\n');

    const keptLines = lines.filter(line => {
        try {
            if (!line.length) { return true; }
            const date = new Date(JSON.parse(line).date);
            return date > daysAgo;
        } catch (error) {
            console.log(error);
            return true;
        }
    });

    fs.writeFileSync(logFile, keptLines.join('\n'));
};