/**
 * file: appleAuth.js
 * brief: Apple Authentication adapter using the agnostic databaseAuth base
 */
import { auth, signIn } from './databaseAuth.js';
import { OAuthProvider } from "firebase/auth";

const appleProvider = new OAuthProvider('apple.com');

/**
 * Realiza login especificamente com Apple
 * @returns {Promise<object>} Auth user object
 */
export async function loginWithApple() {
    return await signIn(appleProvider);
}

export { auth };
