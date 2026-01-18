/**
 * file: security.js
 * brief: Web Crypto API wrapper for ECDH + AES-GCM Encryption
 */

// Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Convert Base64 to Uint8Array
function base64ToUint8Array(base64) {
    const binary_string = atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
}

// PEM to ArrayBuffer (strips headers)
function pemToArrayBuffer(pem) {
    const b64 = pem.replace(/-----BEGIN PUBLIC KEY-----/g, "")
        .replace(/-----END PUBLIC KEY-----/g, "")
        .replace(/[\n\r]/g, "");
    return base64ToUint8Array(b64).buffer;
}

// ArrayBuffer to PEM
function arrayBufferToPem(buffer) {
    const b64 = arrayBufferToBase64(buffer);
    let pem = "-----BEGIN PUBLIC KEY-----\n";
    for (let i = 0; i < b64.length; i += 64) {
        pem += b64.substring(i, i + 64) + "\n";
    }
    pem += "-----END PUBLIC KEY-----";
    return pem;
}

export class SecuritySessionManager {
    static instance;
    sessionKey = null;
    sessionId = null;
    handshakePromise = null;

    constructor() { }

    static getInstance() {
        if (!SecuritySessionManager.instance) {
            SecuritySessionManager.instance = new SecuritySessionManager();
        }
        return SecuritySessionManager.instance;
    }

    getSessionId() {
        return this.sessionId;
    }

    async performHandshake(apiUrl) {
        if (this.handshakePromise) {
            return this.handshakePromise;
        }

        this.handshakePromise = this._executeHandshake(apiUrl);

        try {
            return await this.handshakePromise;
        } finally {
            this.handshakePromise = null;
        }
    }

    async _executeHandshake(apiUrl) {
        try {
            // 1. Generate Client Key Pair (ECDH P-256)
            const keyPair = await window.crypto.subtle.generateKey(
                {
                    name: "ECDH",
                    namedCurve: "P-256",
                },
                true,
                ["deriveKey", "deriveBits"]
            );

            // 2. Export Client Public Key to PEM
            const exportedPublicKey = await window.crypto.subtle.exportKey(
                "spki",
                keyPair.publicKey
            );
            const clientPublicKeyPem = arrayBufferToPem(exportedPublicKey);

            // 3. Send to Server
            let handshakeUrl = `${apiUrl}/handshake`;
            const headers = {
                'Content-Type': 'application/json'
            };

            const response = await fetch(handshakeUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ public_key: clientPublicKeyPem })
            });

            if (!response.ok) {
                throw new Error(`Handshake failed: ${response.status}`);
            }

            const data = await response.json();
            this.sessionId = data.session_id;
            const serverPublicKeyPem = data.public_key;

            // 4. Import Server Public Key
            const serverPublicKey = await window.crypto.subtle.importKey(
                "spki",
                pemToArrayBuffer(serverPublicKeyPem),
                {
                    name: "ECDH",
                    namedCurve: "P-256",
                },
                false,
                []
            );

            // 5. Derive Shared Secret & Session Key (AES-GCM, 256 bits)
            const sharedSecretBits = await window.crypto.subtle.deriveBits(
                {
                    name: "ECDH",
                    public: serverPublicKey,
                },
                keyPair.privateKey,
                256
            );

            // Step B: Import shared secret as key for HKDF
            const hkdfKey = await window.crypto.subtle.importKey(
                "raw",
                sharedSecretBits,
                { name: "HKDF" },
                false,
                ["deriveKey"]
            );

            // Step C: Derive final AES-GCM key
            this.sessionKey = await window.crypto.subtle.deriveKey(
                {
                    name: "HKDF",
                    hash: "SHA-256",
                    salt: new Uint8Array(32),  // Match Python's default (HashLen zeros)
                    info: new TextEncoder().encode("handshake data"),
                },
                hkdfKey,
                {
                    name: "AES-GCM",
                    length: 256,
                },
                false,
                ["encrypt", "decrypt"]
            );

            return true;
        } catch (error) {
            console.error("[Security] Handshake error:", error);
            this.sessionId = null;
            this.sessionKey = null;
            return false;
        }
    }

    async decryptData(encryptedData) {
        if (!this.sessionKey) throw new Error("No session key");

        try {
            const iv = base64ToUint8Array(encryptedData.iv);
            const ciphertext = base64ToUint8Array(encryptedData.content);

            const decryptedBuffer = await window.crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: iv,
                },
                this.sessionKey,
                ciphertext
            );

            const decoder = new TextDecoder();
            const jsonStr = decoder.decode(decryptedBuffer);
            const payload = JSON.parse(jsonStr);

            if (!payload || typeof payload !== 'object' || !('data' in payload) || !('timestamp' in payload)) {
                throw new Error("Invalid payload format: missing timestamp or data");
            }

            // In the future, we could verify the server-side timestamp here if needed.
            return payload.data;
        } catch (e) {
            console.error("[Security] Decryption failed:", e);
            throw e;
        }
    }

    async encryptData(data) {
        if (!this.sessionKey) throw new Error("No session key");

        const payload = {
            data: data,
            timestamp: Date.now()
        };

        const jsonStr = JSON.stringify(payload);
        const encoder = new TextEncoder();
        const encoded = encoder.encode(jsonStr);

        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        const ciphertext = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            this.sessionKey,
            encoded
        );

        return {
            iv: arrayBufferToBase64(iv.buffer),
            content: arrayBufferToBase64(ciphertext)
        };
    }
}

export const securitySession = SecuritySessionManager.getInstance();
