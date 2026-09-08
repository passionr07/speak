// 1. Firebase тохиргоо (apiKey болон холбогдох утгуудыг шалгаж оруулна)
const firebaseConfig = {
  apiKey: "AIzaSyAp75u7Gx2hCsiVODWawOj-FVrNTdd_r44",
  authDomain: "passionr-1feee.firebaseapp.com",
  projectId: "passionr-1feee",
  storageBucket: "passionr-1feee.firebasestorage.app",
  messagingSenderId: "605392505175",
  appId: "1:605392505175:web:d69a8e57f584812a099612",
  measurementId: "G-RS16B87YTZ"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 2. Хувьсагчууд ба DOM элементүүд
let mediaRecorder;
let audioChunks = [];
let audioBlob = null;
let selectedMime = 'audio/webm';
let currentAudio = null;
let phrases = [];
let answeringRequestId = null; // Жуулчны хүсэлтэд хариулж байгаа үеийн ID

// Модал болон Үндсэн товчлуурууд
const modal = document.getElementById('addPhraseModal');
const toggleFormBtn = document.getElementById('toggleFormBtn');
const cancelBtn = document.getElementById('cancelBtn');
const recordBtn = document.getElementById('recordBtn');
const recordStatus = document.getElementById('recordStatus');
const audioPreview = document.getElementById('audioPreview');
const submitBtn = document.getElementById('submitBtn');
const phraseList = document.getElementById('phraseList');
const searchInput = document.getElementById('searchInput');

// Табууд болон Хүсэлтийн элементүүд
const tabPhrasesBtn = document.getElementById('tabPhrasesBtn');
const tabRequestsBtn = document.getElementById('tabRequestsBtn');
const phrasesSection = document.getElementById('phrasesSection');
const requestsSection = document.getElementById('requestsSection');
const requestCount = document.getElementById('requestCount');
const requestList = document.getElementById('requestList');

const requestModal = document.getElementById('requestModal');
const toggleRequestBtn = document.getElementById('toggleRequestBtn');
const cancelReqBtn = document.getElementById('cancelReqBtn');
const submitReqBtn = document.getElementById('submitReqBtn');
const reqEnInput = document.getElementById('reqEnInput');

// 3. Таб солих удирдлага
tabPhrasesBtn.onclick = () => {
  tabPhrasesBtn.classList.add('active');
  tabRequestsBtn.classList.remove('active');
  phrasesSection.classList.remove('hidden');
  requestsSection.classList.add('hidden');
};

tabRequestsBtn.onclick = () => {
  tabRequestsBtn.classList.add('active');
  tabPhrasesBtn.classList.remove('active');
  requestsSection.classList.remove('hidden');
  phrasesSection.classList.add('hidden');
};

// 4. Үг нэмэх модал цонх удирдах
toggleFormBtn.onclick = () => {
  answeringRequestId = null;
  modal.classList.remove('hidden');
};

cancelBtn.onclick = () => resetModal();

function resetModal() {
  modal.classList.add('hidden');
  document.getElementById('inputEn').value = '';
  document.getElementById('inputMn').value = '';
  audioBlob = null;
  audioChunks = [];
  audioPreview.src = '';
  audioPreview.classList.add('hidden');
  recordStatus.innerText = 'Not recorded';
  recordBtn.innerText = '🎙️ Start Recording';
  recordBtn.classList.remove('recording');
  submitBtn.disabled = true;
  submitBtn.innerText = 'Publish';
  answeringRequestId = null;
}

// 5. Микрофоноор дуу бичих (iOS Safari болон Android-д зориулсан)
recordBtn.onclick = async () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    recordBtn.innerText = '🎙️ Record Again';
    recordBtn.classList.remove('recording');
    recordStatus.innerText = 'Recording saved!';
  } else {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let options = {};
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        selectedMime = 'audio/mp4';
        options = { mimeType: 'audio/mp4' };
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        selectedMime = 'audio/webm;codecs=opus';
        options = { mimeType: 'audio/webm;codecs=opus' };
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        selectedMime = 'audio/webm';
        options = { mimeType: 'audio/webm' };
      }

      mediaRecorder = new MediaRecorder(stream, options);
      audioChunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || selectedMime;
        audioBlob = new Blob(audioChunks, { type: mimeType });
        audioPreview.src = URL.createObjectURL(audioBlob);
        audioPreview.load();
        audioPreview.classList.remove('hidden');
        submitBtn.disabled = false;
      };

      mediaRecorder.start();
      recordBtn.innerText = '⏹️ Stop Recording';
      recordBtn.classList.add('recording');
      recordStatus.innerText = 'Recording... Speak clearly!';
    } catch (err) {
      alert('Микрофоны зөвшөөрөл олгоно уу: ' + err.message);
    }
  }
};

// 6. Аудиог Base64 болгож хадгалах & Хүсэлтийг хаах
submitBtn.onclick = async () => {
  const en = document.getElementById('inputEn').value.trim();
  const mn = document.getElementById('inputMn').value.trim();
  const category = document.getElementById('inputCategory').value;

  if (!en || !mn || !audioBlob) {
    alert('Талбаруудыг бүрэн бөглөж дуугаа бичнэ үү!');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerText = 'Saving...';

  const reader = new FileReader();
  reader.readAsDataURL(audioBlob);
  reader.onloadend = async () => {
    const base64Audio = reader.result;

    try {
      // Үндсэн сан руу хадгалах
      await db.collection('phrases').add({
        en: en,
        mn: mn,
        category: category,
        audioData: base64Audio,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Хүсэлтэд хариулсан бол тухайн хүсэлтийг жагсаалтаас хасах
      if (answeringRequestId) {
        await db.collection('requests').doc(answeringRequestId).delete();
        answeringRequestId = null;
      }

      resetModal();
    } catch (err) {
      alert('Хадгалахад алдаа гарлаа: ' + err.message);
      submitBtn.disabled = false;
      submitBtn.innerText = 'Publish';
    }
  };
};

// 7. Үндсэн үгсийг татаж дэлгэцэнд харуулах
db.collection('phrases').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
  phrases = [];
  snapshot.forEach((doc) => {
    phrases.push({ id: doc.id, ...doc.data() });
  });
  renderPhrases(phrases);
});

function renderPhrases(items) {
  phraseList.innerHTML = '';
  if (items.length === 0) {
    phraseList.innerHTML = `<p style="text-align:center; color:#64748b;">No phrases yet. Add the first one!</p>`;
    return;
  }

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'phrase-card';
    card.innerHTML = `
      <div class="phrase-texts">
        <div class="en-text">${item.en}</div>
        <div class="mn-text">${item.mn}</div>
      </div>
      <div class="speaker-btn">🔊</div>
    `;

    card.onclick = () => playVoice(item.audioData, card);
    phraseList.appendChild(card);
  });
}

// 8. Дуу тоглуулах
function playVoice(src, card) {
  if (currentAudio) {
    currentAudio.pause();
    document.querySelectorAll('.phrase-card').forEach(c => c.classList.remove('playing'));
  }
  currentAudio = new Audio(src);
  card.classList.add('playing');
  currentAudio.play();
  currentAudio.onended = () => card.classList.remove('playing');
}

// 9. Үг хайх
searchInput.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  const filtered = phrases.filter(p => 
    p.en.toLowerCase().includes(q) || p.mn.toLowerCase().includes(q)
  );
  renderPhrases(filtered);
});

// 10. Хүсэлт илгээх модал цонх удирдах
toggleRequestBtn.onclick = () => requestModal.classList.remove('hidden');
cancelReqBtn.onclick = () => {
  requestModal.classList.add('hidden');
  reqEnInput.value = '';
};

submitReqBtn.onclick = async () => {
  const enText = reqEnInput.value.trim();
  if (!enText) return alert('Хүсэлтээ бичнэ үү!');

  submitReqBtn.disabled = true;
  try {
    await db.collection('requests').add({
      en: enText,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    reqEnInput.value = '';
    requestModal.classList.add('hidden');
  } catch (err) {
    alert('Алдаа: ' + err.message);
  } finally {
    submitReqBtn.disabled = false;
  }
};

// 11. Хүсэлтүүдийг шууд хянах (Realtime Listener)
db.collection('requests').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
  requestList.innerHTML = '';
  requestCount.innerText = snapshot.size;

  if (snapshot.empty) {
    requestList.innerHTML = `<p style="text-align:center; color:#64748b; padding:20px;">Одоогоор хүсэлт алга байна.</p>`;
    return;
  }

  snapshot.forEach((doc) => {
    const data = doc.data();
    const reqCard = document.createElement('div');
    reqCard.className = 'request-card';
    reqCard.innerHTML = `
      <div>
        <div style="font-weight:bold; font-size:1.05rem; color:#f8fafc;">${data.en}</div>
        <span style="font-size:0.8rem; color:#64748b;">Орчуулга & Дуу хүлээгдэж байна</span>
      </div>
      <button class="btn-answer">🎙️ Хариулах</button>
    `;

    reqCard.querySelector('.btn-answer').onclick = () => {
      answeringRequestId = doc.id;
      document.getElementById('inputEn').value = data.en;
      modal.classList.remove('hidden');
    };

    requestList.appendChild(reqCard);
  });
});