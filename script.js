document.addEventListener('DOMContentLoaded', () => {
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
  // writeBtn は novel_editor.html に直接遷移するように HTML で変更済み
  // idea_notebook, bookshelf は script.js で直接遷移させない。メニューまたは専用ボタンから遷移させる。

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
    messagesContainer.removeChild(thinkingMessage);

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
