import axios from 'axios';

// https://help.helloclub.com/en/articles/9978567-v2-transitioning-the-api
// https://helloclub.stoplight.io/docs/api-docs/b3A6MjQ3Njc3-query-members

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchHelloClubAll = async (apiKey) => {
    return _fetchHelloClub(apiKey, false);
};
export const fetchHelloClub = async (apiKey) => {
    return _fetchHelloClub(apiKey, true);
};
const _fetchHelloClub = async (apiKey, onlyCurrentMembers) => {
    const base_url = "https://api-v2.helloclub.com/profiles"
    let users = [];
    let offset = 0
    const headers = {
        'Accept': 'application/json',
        'X-Api-Key': apiKey,
    }
    let params = {
        'fields': 'firstName,lastName,customFields',
        'offset': offset,
    };
    if(onlyCurrentMembers) {
        params['withCurrentMembership'] = true;
    }

    let totalUsers = 0;
    do {
        // Make request
        const response = await axios
            .get(base_url, {
                params: params,
                headers: headers,
            })
            .then((res) => res.data);
        params.offset += response.meta.count;
        users = users.concat(response.profiles);
        console.log(`Fetched ${response.meta.count} users, total ${users.length}`);

        await delay(500);
        totalUsers = response.meta.total;
    } while(users.length < totalUsers);


    const returnUsers = [];
    for(const user of users) {
        // treat undefined as empty string cause that's how it shows up in the UI
        if(!user.customFields.fobpin) {
            user.customFields.fobpin = "";
        }
        if(!user.customFields.fob) {
            user.customFields.fob = "";
        }
        if( !/^[0-9]+$/.test(user.customFields.fob) ||  !/^[0-9]*$/.test(user.customFields.fobpin)) {
            console.error(`hello club user ${user.firstName} ${user.lastName} has bad fob data: fob: '${user.customFields.fob}', pin: '${user.customFields.fobpin}'`);
        } else {
            returnUsers.push(user);
        }
    }
    // [{
    //     firstName
    //     lastName
    //     id
    //     "customFields": {
    //         "fob": "333" | false,
    //         "fobpin": "" | "0010",
    //     }
    // }]
    return returnUsers;
};

/*
 * if helloClubUsers has an entry with same uid, override csvUsers
 * if helloClubUsers has an entry not in the csv, add it
 * return in the csv format
 *
 * csvUsers: [{ uid, cid, name, pincode }]
 * helloClubUsers: [{ firstName, lastName, customFields, id, }]
 */
export const helloClubOverride = (csvUsers, helloClubUsers) => {
    helloClubUsers.forEach((hcu) => {
        if(!hcu.customFields || !hcu.customFields.fob) {
            console.log(`bad HC user: ${JSON.stringify(hcu)}`);
            return;
        }
        const found = csvUsers.some((cu) => { // some for early exit if match
            if(cu.uid === hcu.customFields.fob) {
                console.log(`updating "${cu.uid}"="${hcu.customFields.fob}": "${cu.cid}"->"${hcu.id}"; "${cu.name}"->"${hcu.firstName} ${hcu.lastName}"; "${cu.pincode}"->"${hcu.customFields.fobpin}"`);
                cu.cid = hcu.id;
                cu.name = `${hcu.firstName} ${hcu.lastName}`;
                cu.pincode = hcu.customFields.fobpin;
                return true;
            }
            return false;
        });
        if(!found) {
            // not found, add
            csvUsers.push({
                uid: hcu.customFields.fob,
                cid: hcu.id,
                name: `${hcu.firstName} ${hcu.lastName}`,
                pincode: hcu.customFields.fobpin,
            });
        }
    });
    return csvUsers;
};

export const fetchHelloClubAndOverride = (apiKey, csvUsers) => {
    return fetchHelloClub(apiKey)
        .then((helloClubUsers) => helloClubOverride(csvUsers, helloClubUsers));
}
