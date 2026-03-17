import { initializeApp } from "firebase/app";
import { getDatabase, ref, child, push, set, update, remove, get, onValue, runTransaction, type DatabaseReference } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyA3WsPHW64uJ5dqXpvN2A5H_ZZr4posBKs",
  authDomain: "international-trade-game.firebaseapp.com",
  databaseURL: "https://international-trade-game-default-rtdb.firebaseio.com",
  projectId: "international-trade-game",
  storageBucket: "international-trade-game.firebasestorage.app",
  messagingSenderId: "119708825687",
  appId: "1:119708825687:web:b7967a8e00d217f49c8b12"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const gamesRef = ref(database, "games");

export { database, gamesRef, ref, child, push, set, update, remove, get, onValue, runTransaction };
export type { DatabaseReference };
