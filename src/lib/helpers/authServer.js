import * as path from "path";
import { dataDir } from "$lib/helpers/fileStuff.js";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import Database from "better-sqlite3";

export const auth = betterAuth({
    database: new Database(path.resolve(dataDir, 'auth.sqlite')),
	plugins: [ admin() ],
	emailAndPassword: {
		enabled: true
	}
});