import {
    readUserCSVFile,
    stringifyUserCSV,
    filterOutUser,
    parseUserCSV,
} from "$lib/helpers/fileStuff.js";

test("filter user basic", () => {
    const user = {
        uid: "55555",
        cid: "1",
        name: "easy delete",
        pincode: "5555",
    };
    const users = [structuredClone(user)];
    const filtered = filterOutUser(users, user);
    expect(filtered.length).toBe(0);
});

test("filter user string to string", () => {
    const input = `CID,name,key (DEC),PIN,comment,
3,"valid user",55455,5555,,
1,"person, other",54555,2222,,
1,"person, some",54555,2222,,
4,valid user 2,515151,0021,,
`;
    const output = `CID,name,key (DEC),PIN,comment,
3,valid user,55455,5555
1,"person, other",54555,2222
4,valid user 2,515151,0021
`;
    const user = {
        uid: "54555",
        cid: "1",
        name: "person, some",
        pincode: "2222",
    };
    const users = parseUserCSV(input);
    const filtered = filterOutUser(users, user);
    const actual = stringifyUserCSV(filtered);
    expect(actual).toBe(output);
});

test("parse users", () => {
    const input = `CID,name,key (DEC),PIN,comment,
                    3,"valid user",55455,5555,,
                    1,"easy delete",55555,5555,,
                    1,"person, some",54555,2222,,
                    4,valid user 2,515151,0021,,
`;
    const users = parseUserCSV(input);
    expect(users).toEqual([
        {
            uid: "55455",
            cid: "3",
            name: "valid user",
            pincode: "5555",
        },
        {
            uid: "55555",
            cid: "1",
            name: "easy delete",
            pincode: "5555",
        },
        {
            uid: "54555",
            cid: "1",
            name: "person, some",
            pincode: "2222",
        },
        {
            uid: "515151",
            cid: "4",
            name: "valid user 2",
            pincode: "0021",
        },
    ]);
});

test.skip("parse users", () => {
    const expectedUsers = readUserCSVFile("test/new.csv");
    const cacheUsers = readUserCSVFile("test/cache.csv");
    console.log(expectedUsers);
    console.log(cacheUsers);
});
