import { helloClubOverride, processHelloClubUsers } from "../src/helloClub.js";

const makeUser = (fob, fobpin) => ({
    firstName: 'Test',
    lastName: 'User',
    customFields: { fob, fobpin },
    id: 'test-id'
});

test('processHelloClubUsers: multiple fobs, single pin', () => {
    const users = [makeUser("foo,bar", "asdf")];
    const result = processHelloClubUsers(users);
    expect(result.length).toBe(0);
});

test('processHelloClubUsers: single fob, multiple pins', () => {
    const users = [makeUser("foo", "bar,bat")];
    const result = processHelloClubUsers(users);
    expect(result.length).toBe(0);
});

test('processHelloClubUsers: multiple fobs, pin is comma only', () => {
    const users = [makeUser("foo,bar", ",")];
    const result = processHelloClubUsers(users);
    expect(result.length).toBe(0);
});

test('processHelloClubUsers: multiple fobs, pin has trailing comma', () => {
    const users = [makeUser("foo,bar", "a,")];
    const result = processHelloClubUsers(users);
    expect(result.length).toBe(0);
});

test('processHelloClubUsers: no customFields attribute', () => {
    const users = [{ firstName: 'Test', lastName: 'User', id: 'test-id' }];
    expect(() => processHelloClubUsers(users)).toThrow();
});

test('processHelloClubUsers: missing fob', () => {
    const users = [{ firstName: 'Test', lastName: 'User', customFields: { fobpin: '1234' }, id: 'test-id' }];
    const result = processHelloClubUsers(users);
    expect(result.length).toBe(0);
});

test('processHelloClubUsers: missing fobpin', () => {
    const users = [{ firstName: 'Test', lastName: 'User', customFields: { fob: '123456' }, id: 'test-id' }];
    const result = processHelloClubUsers(users);
    expect(result.length).toBe(1);
});

test('processHelloClubUsers: missing both fob and fobpin', () => {
    const users = [{ firstName: 'Test', lastName: 'User', customFields: {}, id: 'test-id' }];
    const result = processHelloClubUsers(users);
    expect(result.length).toBe(0);
});

test('processHelloClubUsers: empty strings for both', () => {
    const users = [makeUser("", "")];
    const result = processHelloClubUsers(users);
    expect(result.length).toBe(0);
});


test('filter user basic', () => {
    const helloClubUsers =
        [{
            firstName: 'foo',
            lastName: 'bar',
            customFields: { fob: '1426046', fobpin: '1111' },
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
            customFields: { fob: '1426046', fobpin: '1111' },
            id: '68432db6f62bde87e6e0f5f8'
        }];
    const csvUsers = [];

    const finalUsers = helloClubOverride(csvUsers, helloClubUsers);

    expect(finalUsers.length).toBe(1);
});
