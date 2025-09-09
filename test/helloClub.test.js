import { helloClubOverride } from "../src/helloClub.js";


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
