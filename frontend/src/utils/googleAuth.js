/**
 * file: googleAuth.js
 * brief: Google Authentication adapter using the agnostic databaseAuth base
 */
import { auth, signIn } from './databaseAuth.js';
import { GoogleAuthProvider } from "firebase/auth";

const googleProvider = new GoogleAuthProvider();

/**
 * Realiza login especificamente com Google
 * @returns {Promise<object>} Auth user object
 */
export async function loginWithGoogle() {
    return await signIn(googleProvider);
}

export { auth };
