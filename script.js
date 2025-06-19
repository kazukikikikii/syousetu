// Firebase SDKのインポート
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Firebase変数をグローバルスコープで定義
let app;
let db;
let auth;
let userId; // 現在のユーザーID

document.addEventListener('DOMContentLoaded', async () => {
  // Firebaseの初期化と認証
  try {
    const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    // 認証状態の監視
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        userId = user.uid;
        console.log("Firebase authenticated. User ID:", userId);
        // 認証後に本の読み込みを開始
        if (window.location.pathname.includes("bookshelf.html")) {
          setupBookshelfRealtimeListener();
        }
      } else {
        // ユーザーが認証されていない場合、匿名認証を試みる
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        if (initialAuthToken) {
          await signInWithCustomToken(auth, initialAuthToken);
        } else {
          await signInAnonymously(auth);
          userId = auth.currentUser?.uid || crypto.randomUUID(); // 匿名ユーザーIDまたはランダムUUID
          console.log("Firebase signed in anonymously. User ID:", userId);
        }
        // 初回認証後に本の読み込みを開始
        if (window.location.pathname.includes("bookshelf.html")) {
          setupBookshelfRealtimeListener();
        }
      }
    });

  } catch (error) {
    console.error("Firebase初期化または認証中にエラーが発生しました:", error);
    // UIにエラーメッセージを表示するなどの対応
  }


  // ✅ メニューバー展開処理
  const menuBtn = document.getElementById('menuButton');
  const menuNav = document.getElementById('menuNav');
  if (menuBtn && menuNav) {
    menuBtn.addEventListener('click', () => {
      menuNav.classList.toggle('open');
    });
  }

  // ✅ 戻るボタン処理
  const back = document.querySelector(".back-icon");
  if (back) {
    back.addEventListener("click", () => {
      history.back();
    });
  }

  // ✅ ページごとのキャラクターと吹き出しの初期表示 (共通処理)
  const characterContainer = document.getElementById('characterContainer');
  const speechElement = document.getElementById('speech');
  const speechText = document.getElementById('speechText');
  const closeBtn = document.getElementById('closeSpeech');

  if (characterContainer && speechElement && speechText && closeBtn) {
    const path = window.location.pathname;
    let message = "こんにちは！何かお手伝いしましょうか？"; // デフォルトメッセージ

    if (path.includes("index.html")) {
      message = "ここはスタート画面だよ！「スタート」ボタンで始めよう！";
    } else if (path.includes("index2.html")) {
      message = "小説のモードを選んでね！アイデア、てなおし、プロット作成、小説を書くの4つがあるよ！";
    } else if (path.includes("index3.html")) { // アイデアモードのジャンル選択
      message = "アイデアが欲しい小説のジャンルを選んでね！";
    } else if (path.includes("eraser.html")) { // てなおしモードのジャンル選択
      message = "てなおししたい小説のジャンルを選んでね！";
    } else if (path.includes("plot.html")) {
      message = "小説のプロットを作成しよう！どんなストーリーにしたいか教えてね。";
    } else if (path.includes("chat.html")) {
      const urlParams = new URLSearchParams(window.location.search);
      const mode = urlParams.get('mode');
      const genre = urlParams.get('genre');

      if (mode === 'idea') {
        message = `「${genre || '未設定'}」ジャンルのアイデアが欲しいんだね！どんな文章やテーマについてアイデアが欲しいか教えてね！`;
      } else if (mode === 'eraser') {
        message = `「${genre || '未設定'}」ジャンルのてなおしだね！推敲したい文章をここに入力してね！`;
      } else {
        message = "チャットでお話しよう！";
      }
    } else if (path.includes("novel_editor.html")) {
      message = "ここで小説を書いて保存したり、本にしたりできるよ！";
    } else if (path.includes("idea_notebook.html")) {
      message = "アイデア帳には、今までAIが生成したアイデアが保存されているよ。検索もできるから活用してね！";
    } else if (path.includes("bookshelf.html")) {
      message = "本棚には、あなたが「本にする」を選んだ小説が並ぶよ！";
    }

    speechText.textContent = message;
    speechElement.style.display = "flex"; // 吹き出しを表示

    closeBtn.addEventListener("click", () => {
      characterContainer.style.display = "none"; // キャラクターごと非表示
    });
  }

  // ✅ モード選択の画面遷移処理（index2.htmlにのみ存在）
  const ideaBtn = document.getElementById('ideaBtn');
  const eraserBtn = document.getElementById('eraserBtn');
  const blockBtn = document.getElementById('blockBtn');

  if (ideaBtn) {
    ideaBtn.onclick = () => location.href = 'index3.html';
  }
  if (eraserBtn) {
    eraserBtn.onclick = () => location.href = 'eraser.html';
  }
  if (blockBtn) {
    blockBtn.onclick = () => location.href = 'plot.html';
  }
});


// ✅ チャット送信関数 (plot.html と chat.html で使用)
async function sendMessage() {
  const input = document.getElementById('userInput');
  const text = input?.value.trim();
  if (!text) return;

  const messagesContainer = document.getElementById('messages');

  // ユーザーメッセージを追加
  const userMessage = document.createElement('div');
  userMessage.classList.add('message', 'user');
  userMessage.innerHTML = `
    <div class="bubble">${text}</div>
    <img src="user.png" alt="ユーザーアイコン">
  `;
  messagesContainer.appendChild(userMessage);
  input.value = ''; // 入力フィールドをクリア

  // スクロールを一番下にする
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  // AI思考中のメッセージを追加
  const thinkingMessage = document.createElement('div');
  thinkingMessage.classList.add('message', 'ai');
  thinkingMessage.innerHTML = `
    <img src="ai.png" alt="AIアイコン">
    <div class="bubble">AIが考えています...</div>
  `;
  messagesContainer.appendChild(thinkingMessage);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  // 現在のモードとジャンルを取得
  const path = window.location.pathname;
  let currentMode = '';
  let currentGenre = '';

  if (path.includes("plot.html")) {
    currentMode = 'plot';
  } else if (path.includes("chat.html")) {
    const urlParams = new URLSearchParams(window.location.search);
    currentMode = urlParams.get('mode');
    currentGenre = urlParams.get('genre');
  }

  try {
    // AIの応答をシミュレート (実際のLLM呼び出しの代わり)
    const aiResponseText = await getSimulatedLLMResponse(text, currentMode, currentGenre);

    // 思考中のメッセージを削除し、AIの実際の応答を追加
    if (messagesContainer.contains(thinkingMessage)) {
      messagesContainer.removeChild(thinkingMessage);
    }

    const aiMessage = document.createElement('div');
    aiMessage.classList.add('message', 'ai');
    aiMessage.innerHTML = `
      <img src="ai.png" alt="AIアイコン">
      <div class="bubble">${aiResponseText}</div>
    `;
    messagesContainer.appendChild(aiMessage);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

  } catch (error) {
    console.error("AI応答の取得中にエラーが発生しました:", error);
    // エラーメッセージを表示
    if (messagesContainer.contains(thinkingMessage)) {
      messagesContainer.removeChild(thinkingMessage);
    }
    const errorMessage = document.createElement('div');
    errorMessage.classList.add('message', 'ai');
    errorMessage.innerHTML = `
      <img src="ai.png" alt="AIアイコン">
      <div class="bubble">エラーが発生しました。もう一度お試しください。</div>
    `;
    messagesContainer.appendChild(errorMessage);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

// AI応答のシミュレーション関数（実際のLLM呼び出しの代わり）
async function getSimulatedLLMResponse(prompt, mode, genre) {
  return new Promise(resolve => {
    setTimeout(() => {
      let response = "なるほど、それについてもっと詳しく教えていただけますか？"; // デフォルト応答

      if (mode === 'plot') {
        response = `「${prompt}」を元に、以下のようなプロットを提案します。\n\n**導入**: 静かな日常を過ごす主人公が、ある日突然、奇妙な現象に巻き込まれる。\n**展開**: その現象の背後には古の魔法が関わっており、主人公は仲間と出会い、真実を求めて旅に出る。\n**結末**: 幾多の困難を乗り越え、魔法の秘密を解き明かし、世界を救う。しかし、その代償として…\n\nこのプロットについて、さらに詳しく知りたいですか？`;
      } else if (mode === 'idea') {
        switch (genre) {
          case 'love':
            response = `「${prompt}」に関する恋愛小説のアイデアですね。\n\n**アイデア1**: 幼馴染との再会から始まる切ない恋の物語。\n**アイデア2**: タイムスリップした先で運命の人と出会う、甘くも悲しいラブストーリー。\n**アイデア3**: 敵対する組織のメンバー同士が秘密の恋に落ちるスリリングな展開。\n\nどれか気になるアイデアはありますか？`;
            break;
          case 'sf':
            response = `「${prompt}」に関するSF小説のアイデアです。\n\n**アイデア1**: 滅びゆく地球を脱出し、新たな惑星を目指す人類のサバイバル。\n**アイデア2**: AIが感情を持ったとき、人間社会との共存は可能か？を問うサイバーパンク。\n**アイデア3**: 量子力学を利用した時間操作で、歴史の謎を解き明かす冒険。\n\nこれらのアイデアはいかがでしょうか？`;
            break;
          case 'adventure':
            response = `「${prompt}」に関する冒険小説のアイデアです。\n\n**アイデア1**: 伝説の秘宝を求めて、未開のジャングルや古代遺跡を探索する。\n**アイデア2**: 空飛ぶ島々を渡り歩き、幻の生物と出会うファンタジー冒険。\n**アイデア3**: 深海の巨大生物や未知の文明と遭遇する、海底探査の物語。\n\n冒険の舞台はどこに興味がありますか？`;
            break;
          default: // ジャンルが指定されていない場合
            response = `「${prompt}」に関するアイデアですね。例えば、「突然現れた不思議な力」「過去からのメッセージ」といった要素を盛り込むのはどうでしょうか？`;
        }
      } else if (mode === 'eraser') {
        response = `「${prompt}」の部分ですね。この表現をもっと引き立てるために、「${prompt.replace('走る', '疾走する').replace('速い', '目にも留まらぬ速さの')}」のように、類義語やより具体的な描写を加えるのはどうでしょうか？\n\n他に気になる箇所はありますか？`;
      }
      resolve(response);
    }, 1500); // 1.5秒の遅延をシミュレート
  });
}

/**
 * 小説データをFirestoreに保存する関数
 * @param {string} title 小説のタイトル
 * @param {string} text 小説の本文
 * @param {string} genre 小説のジャンル
 */
export async function saveNovelToFirestore(title, text, genre) {
  if (!db || !userId) {
    console.error("FirestoreまたはユーザーIDが初期化されていません。");
    return { success: false, message: "Firestoreの準備ができていません。" };
  }

  if (!title || !text || !genre) {
    return { success: false, message: "タイトル、本文、ジャンルは必須です。" };
  }

  try {
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const novelsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/novels`);
    
    await addDoc(novelsCollectionRef, {
      title: title,
      text: text,
      genre: genre,
      createdAt: serverTimestamp() // サーバータイムスタンプで作成日時を記録
    });
    console.log("小説が正常に保存されました。");
    return { success: true, message: "小説を本棚に保存しました！" };
  } catch (error) {
    console.error("小説の保存中にエラーが発生しました:", error);
    return { success: false, message: "小説の保存に失敗しました。" };
  }
}

/**
 * Firestoreから小説データをリアルタイムで読み込み、表示を更新する関数
 */
export function setupBookshelfRealtimeListener() {
  if (!db || !userId) {
    console.warn("FirestoreまたはユーザーIDが初期化されていないため、本の読み込みを開始できません。");
    return;
  }

  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  const novelsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/novels`);
  
  // orderByを使用してソートします (Firestoreでインデックスが必要になる場合があります)
  const q = query(novelsCollectionRef, orderBy('createdAt', 'desc')); 

  onSnapshot(q, (snapshot) => {
    const bookshelfContainer = document.getElementById('bookList');
    if (!bookshelfContainer) {
      console.warn("bookList要素が見つかりません。");
      return;
    }
    bookshelfContainer.innerHTML = ''; // 既存の内容をクリア

    if (snapshot.empty) {
      bookshelfContainer.innerHTML = '<p class="no-books-message">まだ本棚に小説はありません。小説を書いて「本にする」ボタンを押してみましょう！</p>';
      return;
    }

    snapshot.forEach((doc) => {
      const novel = doc.data();
      const novelId = doc.id; // ドキュメントIDも取得

      const bookItem = document.createElement('div');
      bookItem.classList.add('book-item');
      bookItem.innerHTML = `
        <div class="book-cover">
          <span class="book-title">${novel.title || '無題の小説'}</span>
        </div>
        <button class="read-btn" data-id="${novelId}">読む</button>
        <button class="edit-btn" data-id="${novelId}">編集</button>
      `;
      bookshelfContainer.appendChild(bookItem);
    });

    // 各本の「読む」ボタンと「編集」ボタンにイベントリスナーを設定
    bookshelfContainer.querySelectorAll('.read-btn').forEach(button => {
      button.addEventListener('click', (event) => {
        const novelId = event.target.dataset.id;
        const novelData = snapshot.docs.find(doc => doc.id === novelId)?.data();
        if (novelData) {
          displayNovelModal(novelData.title, novelData.text, novelData.genre);
        }
      });
    });

    // 「編集」ボタンはまだ機能を実装していません
    bookshelfContainer.querySelectorAll('.edit-btn').forEach(button => {
      button.addEventListener('click', (event) => {
        const novelId = event.target.dataset.id;
        // alert(`小説ID: ${novelId} の編集機能はまだ準備中です！`);
        // ここに編集画面への遷移ロジックなどを追加
        showCustomAlert(`小説ID: ${novelId} の編集機能はまだ準備中です！`);
      });
    });
  }, (error) => {
    console.error("小説の読み込み中にエラーが発生しました:", error);
    const bookshelfContainer = document.getElementById('bookList');
    if (bookshelfContainer) {
      bookshelfContainer.innerHTML = '<p class="error-message">本の読み込みに失敗しました。ページを再読み込みしてください。</p>';
    }
  });
}

/**
 * 小説内容を表示するモーダル
 * @param {string} title - 小説のタイトル
 * @param {string} text - 小説の本文
 * @param {string} genre - 小説のジャンル
 */
function displayNovelModal(title, text, genre) {
  const modalHTML = `
    <div id="novelModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 1000;">
      <div style="background-color: white; padding: 25px; border-radius: 10px; border: 3px solid black; max-width: 80%; max-height: 80%; overflow-y: auto; display: flex; flex-direction: column; box-shadow: 0 5px 15px rgba(0,0,0,0.3);">
        <h2 style="margin-top: 0; margin-bottom: 15px; font-size: 1.5rem; text-align: center; border-bottom: 2px solid black; padding-bottom: 10px;">${title} <span style="font-size: 0.9rem; color: #555;">(${genre})</span></h2>
        <div style="flex: 1; white-space: pre-wrap; font-size: 1rem; line-height: 1.8; padding-right: 10px; overflow-y: auto;">
          ${text}
        </div>
        <button onclick="document.getElementById('novelModal').remove()" style="margin-top: 20px; padding: 10px 20px; background-color: #a7d676; border: 2px solid black; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1.1rem; align-self: center;">閉じる</button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * alert()の代わりに使うカスタムアラート表示関数
 * @param {string} message - 表示するメッセージ
 */
function showCustomAlert(message) {
  const alertModal = document.createElement('div');
  alertModal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background-color: rgba(0,0,0,0.5); display: flex;
    justify-content: center; align-items: center; z-index: 9999;
  `;
  alertModal.innerHTML = `
    <div style="background-color: white; padding: 30px; border-radius: 10px; border: 2px solid black; text-align: center; font-weight: bold; max-width: 80%; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
      <p style="margin-bottom: 20px;">${message}</p>
      <button onclick="this.parentElement.parentElement.remove()" style="padding: 10px 20px; background-color: #a7d676; border: 2px solid black; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1rem;">OK</button>
    </div>
  `;
  document.body.appendChild(alertModal);
}

// グローバルスコープに関数を公開 (HTMLから直接呼び出すため)
window.sendMessage = sendMessage; // これを追加しました
window.getSimulatedLLMResponse = getSimulatedLLMResponse; // これを追加しました
window.saveNovelToFirestore = saveNovelToFirestore;
window.setupBookshelfRealtimeListener = setupBookshelfRealtimeListener;
window.displayNovelModal = displayNovelModal;
window.showCustomAlert = showCustomAlert;
