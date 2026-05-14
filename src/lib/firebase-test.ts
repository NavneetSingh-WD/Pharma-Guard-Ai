import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from '../firebase';

async function testConnection() {
  try {
    // We expect this to fail with permission denied or not found, 
    // but the point is to check if it can reach the server.
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error.message?.includes('the client is offline')) {
      console.error("Firebase Connection Error: The client is offline. Please check your configuration.");
    } else {
      console.log("Firebase Connectivity Test: Server reached.");
    }
  }
}

export { testConnection };
