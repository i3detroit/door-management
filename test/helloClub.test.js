import { helloClubOverride, processHelloClubUsers } from "../src/helloClub.js";


const makeUser = (fob, fobpin) => ({
    firstName: 'Test',
    lastName: 'User',
    customFields: { fob, fobpin },
    id: 'test-id'
});

// valid
test('processHelloClubUsers: valid fobs with spaces', () => {
    const users = [makeUser("123, 456 ", " 1111 , 2222")];
    const result = processHelloClubUsers(users);
    expect(result.length).toBe(2);
    expect(result[0].customFields.fob).toBe("123");
    expect(result[0].customFields.fobpin).toBe("1111");
    expect(result[1].customFields.fob).toBe("456");
    expect(result[1].customFields.fobpin).toBe("2222");
});

test('processHelloClubUsers: leading zeros in fob', () => {
    const users = [makeUser("007", "1234")];
    const result = processHelloClubUsers(users);
    expect(result.length).toBe(1);
    expect(result[0].customFields.fob).toBe("007");
});

test('processHelloClubUsers: none pin', () => {
    const users = [makeUser("111", "none")];
    const result = processHelloClubUsers(users);
    expect(result.length).toBe(1);
    expect(result[0].customFields.fob).toBe("111");
    expect(result[0].customFields.fobpin).toBe("");
});

test('processHelloClubUsers: none pin multi', () => {
    const users = [makeUser("111,222", "42,none")];
    const result = processHelloClubUsers(users);
    expect(result.length).toBe(2);
    expect(result[0].customFields.fob).toBe("111");
    expect(result[0].customFields.fobpin).toBe("42");
    expect(result[1].customFields.fob).toBe("222");
    expect(result[1].customFields.fobpin).toBe("");
});


// fob/pin count mismatch
test('processHelloClubUsers: multiple fobs, single pin', () => {
    const users = [makeUser("111,222", "55")];
    const result = processHelloClubUsers(users);
    expect(result.length).toBe(1);
});

test('processHelloClubUsers: single fob, multiple pins', () => {
    const users = [makeUser("111", "222,55")];
    const result = processHelloClubUsers(users);
    expect(result.length).toBe(1);
});

test('processHelloClubUsers: multiple fobs, pin is comma only', () => {
    const users = [makeUser("111,222", ",")];
    const result = processHelloClubUsers(users);
    expect(result.length).toBe(0);
});

test('processHelloClubUsers: multiple fobs, pin has trailing comma', () => {
    const users = [makeUser("111,222", "66,")];
    const result = processHelloClubUsers(users);
    expect(result.length).toBe(1);
});

// missing fields
test('processHelloClubUsers: no customFields attribute', () => {
    const users = [{ firstName: 'Test', lastName: 'User', id: 'test-id' }];
    const result = processHelloClubUsers(users);
    expect(result.length).toBe(0);
});

test('processHelloClubUsers: missing fob', () => {
    const users = [{ firstName: 'Test', lastName: 'User', customFields: { fobpin: '1234' }, id: 'test-id' }];
    const result = processHelloClubUsers(users);
    expect(result.length).toBe(0);
});

test('processHelloClubUsers: missing fobpin', () => {
    const users = [{ firstName: 'Test', lastName: 'User', customFields: { fob: '123456' }, id: 'test-id' }];
    const result = processHelloClubUsers(users);
    expect(result.length).toBe(0);
});

test('processHelloClubUsers: missing both fob and fobpin', () => {
    const users = [{ firstName: 'Test', lastName: 'User', customFields: {}, id: 'test-id' }];
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
