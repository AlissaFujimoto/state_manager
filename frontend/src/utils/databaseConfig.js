/**
 * file: databaseConfig.js
 * brief: Configuration for the Database (Firebase) service
 */

const config = {
    apiKey: import.meta.env.DATABASE_API_KEY,
    authDomain: import.meta.env.DATABASE_AUTH_DOMAIN,
    projectId: import.meta.env.DATABASE_PROJECT_ID,
    storageBucket: import.meta.env.DATABASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.DATABASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.DATABASE_APP_ID,
};

export const databaseConfig = config;

export default databaseConfig;
