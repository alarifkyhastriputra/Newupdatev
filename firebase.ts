
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyAgOPD5DDtjExQaVeu6VLFI7CMP9i8VOQw",
  authDomain: "projectchat01-d16bc.firebaseapp.com",
  databaseURL: "https://projectchat01-d16bc-default-rtdb.firebaseio.com",
  projectId: "projectchat01-d16bc",
  storageBucket: "projectchat01-d16bc.appspot.com",
  messagingSenderId: "163313653543",
  appId: "1:163313653543:web:8bf5627ebe6a92ff11bb02"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
