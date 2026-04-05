import React, { useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  arrayUnion,
  limitToLast
} from 'firebase/firestore';
import { db, messaging } from './firebase';
import { getToken, onMessage } from 'firebase/messaging';
import {
  Send,
  MessageSquare,
  Clock,
  CheckCircle,
  Trash2,
  Edit3,
  PlusCircle,
  MoreVertical,
  CornerDownRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- CONFIGURATION ---
const TELEGRAM_TOKEN = '8768041342:AAH0xNgULH_470lFH2v7VYJcm5J-cHAozg4';
const TELEGRAM_CHAT_ID = '8635739681';

const SUPPLIES_DATA = [
  {
    category: "💊 조제 / 포장",
    items: [
      { name: "ATC", specs: "롤, 리본" },
      { name: "약포지", specs: "팜툴스용, 예제용" },
      { name: "공병", specs: "30정, 100정, 차광" }
    ]
  },
  {
    category: "🧴 투약병 (액제용)",
    items: [
      { name: "긴마개 투약병", specs: "12cc, 20cc, 30cc" },
      { name: "일반 투약병", specs: "20, 30, 50, 60, 100, 120, 150, 200cc" }
    ]
  },
  {
    category: "🛍️ 봉투 / 지퍼백",
    items: [
      { name: "지퍼백", specs: "6*9, 10*16, 15*23, 20*30" },
      { name: "차광지퍼백", specs: "10*16, 15*21" },
      { name: "봉투", specs: "1박스, 2박스, 종이봉투, 전산봉투" }
    ]
  },
  {
    category: "🖨️ 전산 / 사무",
    items: [
      { name: "라벨 용지", specs: "40*25, 100*80" },
      { name: "프린터 잉크", specs: "검정, 파랑, 노랑, 빨강, 유지보수킷" },
      { name: "용지", specs: "카드단말기, 가격표시기" }
    ]
  },
  {
    category: "🧼 위생 / 소모품",
    items: [
      { name: "위생용품", specs: "핸드타월, 점보롤, 물티슈, 세모금컵" },
      { name: "니트릴장갑", specs: "XS, S, M" }
    ]
  }
];

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [userName, setUserName] = useState(localStorage.getItem('userName') || '직원');
  const [isSending, setIsSending] = useState(false);
  const [commentInputs, setCommentInputs] = useState({});
  const [msgLimit, setMsgLimit] = useState(3);
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showSuppliesModal, setShowSuppliesModal] = useState(false);
  const scrollRef = useRef(null);

  // 알림 권한 요청 및 토큰 가져오기
  useEffect(() => {
    const requestPermission = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('Notification permission granted.');
          // NOTE: 아래 vapidKey에 Firebase Console에서 생성한 키를 넣으세요.
          const token = await getToken(messaging, {
            vapidKey: 'BOM26upQA_QBrurghRO7mXz3gtxpRMAlLPM_Z6vF0goJK7KEpKhdQFmySpQNvFCCnj2iCKhep_mk8AdHc_FhiJU'
          });
          if (token) {
            // 토큰을 Firestore에 저장 (중복 방지)
            await setDoc(doc(db, 'fcm_tokens', token), {
              user: userName,
              updatedAt: serverTimestamp()
            });
          }
        }
      } catch (error) {
        console.error('An error occurred while retrieving token:', error);
      }
    };

    requestPermission();

    // 포그라운드 메시지 수신 처리 (앱이 열려 있을 때)
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Message received. ', payload);
      alert(`[알림] ${payload.notification.title}\n${payload.notification.body}`);
    });

    return () => unsubscribe();
  }, []);

  // Real-time listener for Firestore
  useEffect(() => {
    const q = query(
      collection(db, 'talks'),
      orderBy('timestamp', 'asc'),
      limitToLast(msgLimit)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(data);
    });
    return () => unsubscribe();
  }, [msgLimit]);

  const prevMsgCount = useRef(0);
  useEffect(() => {
    if (messages.length > prevMsgCount.current) {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
    prevMsgCount.current = messages.length;
  }, [messages]);

  const handleLoadMore = () => {
    setMsgLimit(prev => prev + 5);
    setShowCompleted(true);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    setIsSending(true);
    const currentUser = userName;
    localStorage.setItem('userName', currentUser);

    try {
      await addDoc(collection(db, 'talks'), {
        user: currentUser,
        content: input,
        timestamp: serverTimestamp(),
        status: 'active',
        comments: []
      });

      if (currentUser.trim() !== '최현석' && TELEGRAM_TOKEN && TELEGRAM_CHAT_ID) {
        const text = `📢 <b>약국 실장톡 새 요청</b>\n👤 <b>작성자:</b> ${currentUser}\n📝 <b>내용:</b> ${input}`;
        fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' })
        }).catch(err => console.error('Telegram fail:', err));
      }

      setInput('');
    } catch (error) {
      console.error("Error sending message: ", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleEditComment = async (messageId) => {
    if (!editingComment) return;
    const { index, content } = editingComment;

    try {
      const msgRef = doc(db, 'talks', messageId);
      const msgSnap = await getDoc(msgRef);
      if (msgSnap.exists()) {
        const newComments = [...msgSnap.data().comments];
        newComments[index].content = content;
        await updateDoc(msgRef, { comments: newComments });
      }
      setEditingComment(null);
    } catch (error) {
      console.error("Error editing comment:", error);
    }
  };

  const handleUpdateMessage = async () => {
    if (!editingMessage) return;
    try {
      await updateDoc(doc(db, 'talks', editingMessage.id), {
        content: editingMessage.content
      });
      setEditingMessage(null);
    } catch (error) {
      console.error("Error updating message:", error);
    }
  };

  const handleDeleteComment = async (messageId, index) => {
    if (!window.confirm('답글을 삭제하시겠습니까?')) return;
    try {
      const msgRef = doc(db, 'talks', messageId);
      const msgSnap = await getDoc(msgRef);
      if (msgSnap.exists()) {
        const newComments = [...msgSnap.data().comments];
        newComments.splice(index, 1);
        await updateDoc(msgRef, { comments: newComments });
      }
      setEditingComment(null);
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const handleAddComment = async (messageId, originalContent) => {
    const commentText = commentInputs[messageId];
    if (!commentText?.trim()) return;

    const currentUser = userName;
    try {
      await updateDoc(doc(db, 'talks', messageId), {
        comments: arrayUnion({
          user: currentUser,
          content: commentText,
          timestamp: new Date().toISOString()
        })
      });

      if (currentUser.trim() !== '최현석' && TELEGRAM_TOKEN && TELEGRAM_CHAT_ID) {
        const text = `💬 <b>약국 실장톡 답글 알림</b>\n👤 <b>작성자:</b> ${currentUser}\n💬 <b>답글:</b> ${commentText}\n---메모---\n📌 <b>원문:</b> ${originalContent.substring(0, 50)}${originalContent.length > 50 ? '...' : ''}`;
        fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' })
        }).catch(err => console.error('Telegram fail:', err));
      }

      setCommentInputs({ ...commentInputs, [messageId]: '' });
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const toggleStatus = async (messageId, currentStatus) => {
    try {
      await updateDoc(doc(db, 'talks', messageId), {
        status: currentStatus === 'completed' ? 'active' : 'completed'
      });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleDelete = async (messageId) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'talks', messageId));
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  // Filter messages based on showCompleted
  const filteredMessages = showCompleted
    ? messages
    : messages.filter(m => m.status !== 'completed');

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-slate-200 shadow-xl font-sans overflow-hidden">

      {/* Header */}
      <header className="bg-white border-b border-slate-300 px-5 py-2 flex items-center justify-between z-30 shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-black text-slate-800 tracking-tighter">약국 실장톡</h1>
          <div className="flex items-center gap-1 ml-1 scale-90">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-[9px] text-slate-500 font-bold whitespace-nowrap">LIVE</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSuppliesModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 text-white text-[11px] font-bold rounded-lg hover:bg-slate-900 transition-colors active:scale-95 border border-slate-700 shadow-sm"
          >
            <PlusCircle size={12} />
            <span>소모품</span>
          </button>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="이름"
            className="bg-slate-100 border-none rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-primary-500 w-16 text-center font-bold text-slate-700"
          />
        </div>
      </header>

      {/* Main Board Area */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Scrollable Feed (History Top - Chronological Order) */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-2 pb-2 space-y-2 custom-scrollbar"
        >
          <AnimatePresence initial={false}>
            {filteredMessages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "bg-white rounded-xl shadow-sm border border-slate-300 overflow-hidden transition-all duration-300",
                  message.status === 'completed' && "opacity-40 bg-slate-100 grayscale-[0.8] brightness-75 scale-95 origin-center"
                )}
              >
                {/* Card Header (Compact) */}
                <div className="px-4 py-1.5 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                  <span className="text-primary-800 font-bold text-[15px]">{message.user}</span>
                  <div className="flex items-center gap-2">
                    {message.status === 'completed' && (
                      <span className="bg-slate-500 text-white text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider">DONE</span>
                    )}
                    <span className="text-[10px] text-slate-400 font-medium">{formatDate(message.timestamp)}</span>
                  </div>
                </div>

                {/* Card Content (Compact) */}
                <div className="px-4 py-2">
                  {editingMessage?.id === message.id ? (
                    <div className="space-y-2">
                      <textarea
                        autoFocus
                        className="w-full p-2 text-[15px] border border-primary-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 bg-slate-50"
                        value={editingMessage.content}
                        onChange={(e) => setEditingMessage({ ...editingMessage, content: e.target.value })}
                        rows="3"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => setEditingMessage(null)}
                          className="px-3 py-1 text-xs font-bold text-slate-500 bg-slate-100 rounded-md"
                        >취소</button>
                        <button
                          onClick={handleUpdateMessage}
                          className="px-3 py-1 text-xs font-bold text-white bg-primary-500 rounded-md"
                        >저장</button>
                      </div>
                    </div>
                  ) : (
                    <p className={cn(
                      "text-slate-800 text-[15px] leading-snug whitespace-pre-wrap font-medium",
                      message.status === 'completed' && "line-through text-slate-500"
                    )}>
                      {message.content}
                    </p>
                  )}

                  {/* Action Buttons (Compact) */}
                  <div className="flex items-center justify-end gap-1.5 mt-2">
                    {!editingMessage && (
                      <button
                        onClick={() => setEditingMessage({ id: message.id, content: message.content })}
                        className="px-2 py-1 text-xs text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-md transition-colors border border-slate-100"
                      >
                        수정
                      </button>
                    )}
                    <button
                      onClick={() => toggleStatus(message.id, message.status)}
                      className={cn(
                        "px-2 py-1 text-xs font-semibold rounded-md transition-colors border",
                        message.status === 'completed'
                          ? "bg-slate-300 text-slate-700 border-slate-400"
                          : "bg-emerald-500 text-white border-emerald-600"
                      )}
                    >
                      {message.status === 'completed' ? '재작업' : '완료'}
                    </button>
                    <button
                      onClick={() => handleDelete(message.id)}
                      className="px-2 py-1 text-xs font-semibold text-white bg-rose-500 rounded-md hover:bg-rose-600 transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                {/* Comments Section (Compact) */}
                <div className="bg-slate-100/40 px-4 py-2 border-t border-slate-50 space-y-1.5">
                  {message.comments?.map((comment, idx) => (
                    <div key={idx} className="group flex flex-col items-start gap-0.5 relative">
                      <div className="flex items-center gap-2 px-0.5">
                        <span className="text-[10px] font-bold text-slate-500">{comment.user}</span>
                        <span className="text-[8px] text-slate-300 italic">
                          {comment.timestamp ? new Date(comment.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>

                      {editingComment && editingComment.messageId === message.id && editingComment.index === idx ? (
                        <div className="w-full flex flex-col gap-1.5 mt-1 bg-white p-2 rounded-lg border border-primary-200 shadow-sm animate-in fade-in zoom-in duration-100">
                          <input
                            autoFocus
                            className="w-full p-1.5 text-xs border-b border-primary-100 outline-none"
                            value={editingComment.content}
                            onChange={(e) => setEditingComment({ ...editingComment, content: e.target.value })}
                          />
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => handleDeleteComment(message.id, idx)}
                              className="px-2 py-1 text-[10px] bg-rose-50 text-rose-500 rounded font-bold"
                            >삭제</button>
                            <button
                              onClick={() => setEditingComment(null)}
                              className="px-2 py-1 text-[10px] bg-slate-100 text-slate-500 rounded"
                            >취소</button>
                            <button
                              onClick={() => handleEditComment(message.id)}
                              className="px-2 py-1 text-[10px] bg-primary-500 text-white rounded font-bold"
                            >저장</button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => setEditingComment({ messageId: message.id, index: idx, content: comment.content })}
                          className="bg-yellow-200/60 px-2.5 py-1 rounded-xl rounded-tl-none border border-yellow-300/30 shadow-sm transition-all hover:bg-yellow-200 cursor-pointer"
                        >
                          <p className="text-[12px] text-slate-700 font-bold">{comment.content}</p>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Comment Input (Very Compact) */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <input
                      type="text"
                      value={commentInputs[message.id] || ''}
                      onChange={(e) => setCommentInputs({ ...commentInputs, [message.id]: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddComment(message.id, message.content);
                      }}
                      placeholder="답글 입력"
                      className="flex-1 h-8 px-3 rounded-full border border-slate-200 bg-white text-xs focus:ring-1 focus:ring-primary-500 outline-none shadow-inner"
                    />
                    <button
                      onClick={() => handleAddComment(message.id, message.content)}
                      className="h-8 px-3 bg-primary-500 text-white rounded-full text-[11px] font-bold hover:bg-primary-600 transition-all active:scale-95 shadow-sm"
                    >
                      전송
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Load More Button (Past) - Tight Horizontally */}
          <div className="py-1 flex justify-center">
            <button
              onClick={handleLoadMore}
              className="px-8 py-2 bg-white/70 border border-slate-300/70 rounded-xl text-[12px] font-bold text-slate-600 hover:bg-white hover:text-primary-700 hover:border-primary-300 transition-all shadow-md active:scale-95"
            >
              {showCompleted ? '과거 내역 더 불러오기 (+5건)' : '과거 및 완료 내역 보기 (+5건)'}
            </button>
          </div>
        </div>

        {/* New Post Area (Bottom - Sticky Card) - Dynamic size */}
        <div className="bg-slate-200 border-t border-slate-300 p-1 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] z-20">
          <section className="bg-white rounded-xl shadow-xl border border-slate-300 p-2 max-w-xl mx-auto">
            <h2 className="text-[13px] font-black text-slate-800 mb-1 pl-2 border-l-2 border-primary-500">새로운 요청 / 공지</h2>
            <form onSubmit={handleSend} className="space-y-1">
              <textarea
                rows="3"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="내용을 입력하세요..."
                className="w-full bg-slate-50 border border-slate-100 rounded-lg px-4 py-2 text-[15px] focus:ring-1 focus:ring-primary-500 focus:bg-white outline-none resize-none shadow-inner min-h-[80px]"
              />
              <button
                type="submit"
                disabled={!input.trim() || isSending}
                className={cn(
                  "w-full py-2.5 rounded-lg text-[16px] font-black transition-all text-white shadow-lg",
                  input.trim() && !isSending
                    ? "bg-slate-800 hover:bg-slate-900 active:scale-95"
                    : "bg-slate-300 cursor-not-allowed"
                )}
              >
                {isSending ? '전송 중...' : '작성하기'}
              </button>
            </form>
          </section>
        </div>
      </main>

      {/* Supplies Modal */}
      <AnimatePresence>
        {showSuppliesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSuppliesModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 50, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-center bg-white sticky top-0 z-10">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  📋 약국 소모품 목록
                </h3>
              </div>
              <div className="p-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="bg-slate-50 rounded-2xl p-3 space-y-3">
                  {SUPPLIES_DATA.flatMap(cat => cat.items).map((item, idx) => (
                    <div key={idx} className="flex flex-col border-b border-slate-200 last:border-0 pb-3 last:pb-0">
                      <span className="text-[12px] text-slate-500 font-bold uppercase tracking-tight mb-0.5 leading-none">{item.name}</span>
                      <span className="text-[20px] font-black text-slate-900 leading-tight tabular-nums">{item.specs}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-slate-50/50">
                <button
                  onClick={() => setShowSuppliesModal(false)}
                  className="w-full py-3 bg-slate-800 text-white rounded-2xl font-black shadow-lg active:scale-[0.98] transition-all"
                >
                  닫기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
