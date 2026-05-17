import * as path from "path";
import { dataDir, config } from "$lib/helpers/fileStuff.js";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { building } from "$app/environment";
import Database from "better-sqlite3";

export const auth = building || betterAuth({
    database: new Database(path.resolve(dataDir, 'auth.sqlite')),
	secret: config.auth.secret,
	trustedOrigins: [
		'https://doors.i3.lc',
		'http://localhost:4173'
	],
	plugins: [
		admin()
	],
	emailAndPassword: {
		enabled: true
	}
});