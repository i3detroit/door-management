# door-management

Management scripts for a fleet of esp-rfid doors

## Initialization

Use `docker compose up` to run the container. To create a blank database for logins, run `npx auth generate --config ./src/lib/helpers/authServer.js` and `npx auth migrate [...]`. You may need to manually/temporarily replace the data directory variable because they refuse to support aliases for some reason.

## Run the files in `test/`

Use `npm run test` to run the tests
