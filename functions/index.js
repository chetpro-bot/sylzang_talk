const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

// 게시판(talks)에 새 글이 올라오면 모든 기기에 푸시 알림을 보냅니다.
exports.sendTalkNotification = onDocumentCreated("talks/{messageId}", async (event) => {
    const newValue = event.data.data();
    if (!newValue) return null;

    const userName = newValue.user || "익명";
    const content = newValue.content || "내용 없음";

    // 본인(최현석 님)이 쓴 글은 알림을 보내지 않게 설정 (원하시면 삭제 가능)
    if (userName === '최현석') return null;

    try {
        // 1. 등록된 모든 FCM 토큰 가져오기
        const tokensSnapshot = await admin.firestore().collection("fcm_tokens").get();
        const tokens = tokensSnapshot.docs.map(doc => doc.id);

        if (tokens.length === 0) {
            console.log("No devices registered for notifications.");
            return null;
        }

        // 2. 알림 메시지 구성
        const message = {
            notification: {
                title: `📢 약국 실장톡 새 요청`,
                body: `${userName}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
            },
            tokens: tokens,
            webpush: {
                fcmOptions: {
                    link: "https://sylzang-talk-6bab7.web.app/"
                },
                notification: {
                    icon: "https://sylzang-talk-6bab7.web.app/pwa-192x192.png",
                    badge: "https://sylzang-talk-6bab7.web.app/pwa-192x192.png"
                }
            }
        };

        // 3. 발송
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`${response.successCount} messages were sent successfully`);
        
        return null;
    } catch (error) {
        console.error("Error sending notification:", error);
        return null;
    }
});
