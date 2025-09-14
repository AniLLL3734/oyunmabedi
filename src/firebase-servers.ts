// DOSYA: src/firebase-servers.ts (Nihai Versiyon)

import { initializeApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

const chat2Config = {
    apiKey: import.meta.env.VITE_CHAT2_API_KEY,
    authDomain: import.meta.env.VITE_CHAT2_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_CHAT2_PROJECT_ID,
    storageBucket: import.meta.env.VITE_CHAT2_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_CHAT2_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_CHAT2_APP_ID,
};

const chat3Config = {
    apiKey: import.meta.env.VITE_CHAT3_API_KEY,
    authDomain: import.meta.env.VITE_CHAT3_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_CHAT3_PROJECT_ID,
    storageBucket: import.meta.env.VITE_CHAT3_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_CHAT3_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_CHAT3_APP_ID,
};

const chat4Config = {
    apiKey: import.meta.env.VITE_CHAT4_API_KEY,
    authDomain: import.meta.env.VITE_CHAT4_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_CHAT4_PROJECT_ID,
    storageBucket: import.meta.env.VITE_CHAT4_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_CHAT4_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_CHAT4_APP_ID,
};

const initializedApps: Map<string, FirebaseApp> = new Map();
const dbInstances: Map<string, Firestore> = new Map();

export function getChatDb(serverId: string): Firestore {
    if (dbInstances.has(serverId)) {
        return dbInstances.get(serverId)!;
    }
    
    let app: FirebaseApp;
    let config: any; 

    if (serverId === 'server2') config = chat2Config;
    else if (serverId === 'server3') config = chat3Config;
    else if (serverId === 'server4') config = chat4Config;

    if (!config || !config.apiKey || config.apiKey.includes('<')) {
        throw new Error(`'${serverId}' için Firebase yapılandırması bulunamadı veya eksik. Lütfen .env.local dosyasını kontrol edin.`);
    }

    try {
        app = initializeApp(config, serverId);
        initializedApps.set(serverId, app);
    } catch(error) {
        console.error(`Firebase uygulaması '${serverId}' başlatılırken hata oluştu:`, error);
        throw error;
    }
    
    const db = getFirestore(app);
    dbInstances.set(serverId, db);

    return db;
}