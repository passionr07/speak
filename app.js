// 1. Firebase тохиргоо (apiKey-ээ өөрийнхөөрөө солино)
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

// 2. Хувьсагчууд
let mediaRecorder;
let audioChunks = [];
let audioBlob = null;
let currentAudio = null;
let phrases = [];

const modal = document.getElementById('addPhraseModal');
const toggleFormBtn = document.getElementById('toggleFormBtn');
const cancelBtn = document.getElementById('cancelBtn');
const recordBtn = document.getElementById('recordBtn');
const recordStatus = document.getElementById('recordStatus');
const audioPreview = document.getElementById('audioPreview');
const submitBtn = document.getElementById('submitBtn');
const phraseList = document.getElementById('phraseList');
const searchInput = document.getElementById('searchInput');

// Модал цонх удирдах
toggleFormBtn.onclick = () => modal.classList.remove('hidden');
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
}

// 3. Микрофоноор дуу бичих
recordBtn.onclick = async () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    recordBtn.innerText = '🎙️ Record Again';
    recordBtn.classList.remove('recording');
    recordStatus.innerText = 'Recording saved!';
  } else {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        audioPreview.src = URL.createObjectURL(audioBlob);
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

// 4. Дууг Base64 текст болгож Firestore-д шууд хадгалах
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
      await db.collection('phrases').add({
        en: en,
        mn: mn,
        category: category,
        audioData: base64Audio,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      resetModal();
    } catch (err) {
      alert('Хадгалахад алдаа гарлаа: ' + err.message);
      submitBtn.disabled = false;
      submitBtn.innerText = 'Publish';
    }
  };
};

// 5. Баазаас үгсийг шууд уншиж дэлгэцэнд зурах
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

// Дуу тоглуулах
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

// Хайлт хийх
searchInput.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  const filtered = phrases.filter(p => 
    p.en.toLowerCase().includes(q) || p.mn.toLowerCase().includes(q)
  );
  renderPhrases(filtered);
});