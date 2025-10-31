import * as csv from "csvtojson";
import * as fs from "fs";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

export const isSameUser = (a, b) =>
    a.uid == b.uid
    && a.cid == b.cid
    && a.name == b.name
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

export const logUser = (logFile, success, action, door, user) => {
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
        logFile,
        `${new Date().toISOString()} [${door.hostname} ${action}] success: ${success}, cid:"${
            user.cid
        }" name:"${user.name}", uid:"${user.uid}", pin:"${user.pincode}"\n`,
        (err) => {
            if (err) console.error(`failed to write to logfile ${logFile}`);
        }
    );
};
