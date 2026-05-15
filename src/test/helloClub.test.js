import { jest } from "@jest/globals";
import {
    helloClubOverride,
    processHelloClubUsers
} from "$lib/helpers/helloClub.js";

const makeUser = (fob, fobpin) => ({
    firstName: 'Test',
    lastName: 'User',
    customFields: {fob, fobpin},
    id: 'test-id'
});

// none is a magic string to clearly separate data entry issues and "no pin"
//
// fob/fobpin        -> fob/pin
// "123,456"/"11,22" -> 123/11, 456/22
// "123,456"/"11"    -> warning (mismatched count)
// "123"/"none"      -> 123/""
// "123"/""          -> warning (missing pin)
// ""/"11"           -> warning (missing fob)

const cases = [
    // happy paths
    {
        name: "single fob and pin",
        user: makeUser("123", "1111"),
        output: [{fob: "123", fobpin: "1111"}],
    },
    {
        name: "valid fobs with spaces",
        user: makeUser("123, 456 ", " 1111 , 2222"),
        output: [{fob: "123", fobpin: "1111"}, {fob: "456", fobpin: "2222"}],
    },
    {
        name: "leading zeros in fob",
        user: makeUser("007", "1234"),
        output: [{fob: "007", fobpin: "1234"}],
    },
    {
        name: "none pin",
        user: makeUser("111", "none"),
        output: [{fob: "111", fobpin: ""}],
    },
    {
        name: "none pin multi",
        user: makeUser("111,222", "42,none"),
        output: [{fob: "111", fobpin: "42"}, {fob: "222", fobpin: ""}],
    },
    {
        name: "zero-prefixed pin",
        user: makeUser("111", "0010"),
        output: [{fob: "111", fobpin: "0010"}],
    },

    // mismatched fob/pin counts -> warning, partial output
    {
        name: "two fobs, one pin",
        user: makeUser("111,222", "55"),
        output: [{fob: "111", fobpin: "55"}],
        warning: /\bfobs?\b.*\bpins?\b|mismatched/i,
    },
    {
        name: "one fob, two pins",
        user: makeUser("111", "222,55"),
        output: [{fob: "111", fobpin: "222"}],
        warning: /\bfobs?\b.*\bpins?\b|mismatched/i,
    },
    {
        name: "multi fob, trailing-comma pin",
        user: makeUser("111,222", "66,"),
        output: [{fob: "111", fobpin: "66"}],
        warning: /bad fob data/i,
    },
    {
        name: "multi fob, comma-only pin",
        user: makeUser("111,222", ","),
        output: [],
        warning: /bad fob data/i,
    },

    // missing / bad values -> warning, empty output
    {
        name: "blanks",
        user: makeUser("", ""),
        output: [],
        warning: /bad fob data/i,
    },
    {
        name: "missing pin",
        user: makeUser("123", ""),
        output: [],
        warning: /bad fob data/i,
    },
    {
        name: "missing fob",
        user: makeUser("", "42"),
        output: [],
        warning: /bad fob data/i,
    },

    // missing fields on the user object
    {
        name: "no customFields attribute",
        user: {firstName: 'Test', lastName: 'User', id: 'test-id'},
        output: [],
        warning: /bad fob data/i,
    },
    {
        name: "missing fob field",
        user: {firstName: 'Test', lastName: 'User', id: 'test-id', customFields: {fobpin: '1234'}},
        output: [],
        warning: /bad fob data/i,
    },
    {
        name: "missing fobpin field",
        user: {firstName: 'Test', lastName: 'User', id: 'test-id', customFields: {fob: '123456'}},
        output: [],
        warning: /bad fob data/i,
    },
    {
        name: "missing both fob and fobpin",
        user: {firstName: 'Test', lastName: 'User', id: 'test-id', customFields: {}},
        output: [],
        warning: /bad fob data/i,
    },
];

describe('processHelloClubUsers', () => {
    let warnSpy;
    beforeEach(() => {
        warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {
        });
    });
    afterEach(() => {
        warnSpy.mockRestore();
    });

    cases.forEach(({name, user, output, warning}) => {
        test(name, () => {
            const result = processHelloClubUsers([user]);
            expect(result).toHaveLength(output.length);
            output.forEach((expected, i) => {
                expect(result[i].customFields.fob).toBe(expected.fob);
                expect(result[i].customFields.fobpin).toBe(expected.fobpin);
            });
            if (warning) {
                expect(warnSpy).toHaveBeenCalled();
                const messages = warnSpy.mock.calls.map(c => c.join(' '));
                expect(messages.some(m => warning.test(m))).toBe(true);
            } else {
                expect(warnSpy).not.toHaveBeenCalled();
            }
        });
    });
});


test('filter user basic', () => {
    const helloClubUsers =
        [{
            firstName: 'foo',
            lastName: 'bar',
            customFields: {fob: '1426046', fobpin: '1111'},
            id: '68432db6f62bde87e6e0f5f8'
        }];
    const csvUsers = [{
        uid: '1426046',
        cid: '666',
        name: 'foo bar',
        pincode: '9999'
    }];

    const finalUsers = helloClubOverride(csvUsers, helloClubUsers);

    expect(finalUsers.length).toBe(1);
    expect(finalUsers[0].pincode).toBe("1111");
});

test('add user', () => {
    const helloClubUsers =
        [{
            firstName: 'foo',
            lastName: 'bar',
            customFields: {fob: '1426046', fobpin: '1111'},
            id: '68432db6f62bde87e6e0f5f8'
        }];
    const csvUsers = [];

    const finalUsers = helloClubOverride(csvUsers, helloClubUsers);

    expect(finalUsers.length).toBe(1);
});
