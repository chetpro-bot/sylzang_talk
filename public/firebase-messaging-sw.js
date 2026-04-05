importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// 서비스 워커 전용 설정 (App에서 쓰는 설정과 동일해야 함)
firebase.initializeApp({
  apiKey: "AIzaSyDZUOMmZZ4MhmqK_fQMSSK8-9Rb2MmOn9I",
  authDomain: "sylzang-talk-6bab7.firebaseapp.com",
  projectId: "sylzang-talk-6bab7",
  storageBucket: "sylzang-talk-6bab7.firebasestorage.app",
  messagingSenderId: "801090100229",
  appId: "1:801090100229:web:de85d91198cb76a81dd06c"
});

const messaging = firebase.messaging();

// 백그라운드 메시지 핸들러
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
