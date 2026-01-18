/**
 * file: database.js
 * brief: Base class for Database (Firebase) service initialization and management
 */
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

export class Database {
    constructor(config) {
        this.config = config;
        this.app = null;
        this.auth = null;
        this.googleProvider = null;
        this.initialize();
    }

    initialize() {
        try {
            this.app = initializeApp(this.config);
            this.auth = getAuth(this.app);
            this.storage = getStorage(this.app);
            this.googleProvider = new GoogleAuthProvider();
        } catch (error) {
            console.error('Failed to initialize Database:', error);
        }
    }

    getAuth() {
        return this.auth;
    }

    getStorage() {
        return this.storage;
    }

    getProvider() {
        return this.googleProvider;
    }
}
