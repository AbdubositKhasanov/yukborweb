import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: 'AIzaSyAM7vWcSeV2_k8aS5sRN6OT5teJGA7VptI',
  authDomain: 'yukbor-f7000.firebaseapp.com',
  projectId: 'yukbor-f7000',
  storageBucket: 'yukbor-f7000.firebasestorage.app',
  messagingSenderId: '192026796781',
  appId: '1:192026796781:web:e417ef1bf16aad6b7262e4',
  measurementId: 'G-1WHB2DEX0W',
};

const app = initializeApp(firebaseConfig);

let analytics = null;

isSupported()
  .then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  })
  .catch(() => {
    // Analytics not supported (e.g. SSR, privacy extensions)
  });

export { app, analytics };
