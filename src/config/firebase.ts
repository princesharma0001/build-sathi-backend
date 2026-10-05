import {
    initializeApp,
    getApps,
    cert,
    type App,
  } from "firebase-admin/app";
  
  import {
    getMessaging,
    type Messaging,
  } from "firebase-admin/messaging";
  
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase environment variables are missing. Please check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY."
    );
  }
  
  let firebaseApp: App;
  
  if (getApps().length === 0) {
    firebaseApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } else {
    firebaseApp = getApps()[0];
  }
  
  export const firebaseAdmin = firebaseApp;
  
  export const firebaseMessaging: Messaging =
    getMessaging(firebaseApp);