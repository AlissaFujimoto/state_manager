/**
 * file: databaseAuth.js
 * brief: Provider-agnostic authentication base for the Database (Firebase) service
 */
import { Database } from './database.js';
import { databaseConfig } from './databaseConfig.js';
import { signInWithPopup } from "firebase/auth";

const db = new Database(databaseConfig);
export const auth = db.getAuth();
export const storage = db.getStorage();

/**
 * Generic sign in with a given provider
 * @param {object} provider - Firebase Auth Provider instance
 * @returns {Promise<object>} Auth user object
 */
export async function signIn(provider) {
    if (!auth) {
        throw new Error('Database was not initialized correctly');
    }
    const result = await signInWithPopup(auth, provider);
    return result.user;
}
