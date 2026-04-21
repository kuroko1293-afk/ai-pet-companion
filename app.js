import * as THREE from 'https://esm.sh/three@0.174.0';
import { GLTFLoader } from 'https://esm.sh/three@0.174.0/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://esm.sh/three@0.174.0/examples/jsm/controls/OrbitControls.js';

const WORLD_LIMIT = 7.5;
const MODEL_URL = './assets/model.glb';
const STORAGE_KEY = 'ai-pet-companion-pages-v2-history';
const MAX_HISTORY_ITEMS = 10;

const app = document.querySelector('#app');
app.innerHTML = `
  <div class="shell">
    <div class="loading-toast show" id="loadingToast">モデルと気分を読み込み中…</div>
    <div class="layer-ui">
      <div class="mobile-toolbar">
        <button class="mobile-chip" id="mobileInfoToggle" type="button">詳細</button>
        <button class="mobile-chip" id="mobileTabLog" type="button">会話</button>
        <button class="mobile-chip" id="mobileTabInput" type="button">入力</button>
      </div>
      <section class="glass top-left">
        <h1>AIペット companion ✨</h1>
        <p class="subtitle">
          GitHub Pages 向けの静的版。<br>
          ペットは自律的にうろうろして、会話に合わせて雰囲気を変える。視点はドラッグで回転、ホイールやピンチでズームできるよ。
        </p>
        <div class="status-grid">
          <div class="status-card">
            <div class="status-label">状態</div>
            <div class="status-value" id="statusText">読み込み中…</div>
          </div>
          <div class="status-card">
            <div class="status-label">ソース</div>
            <div class="status-value" id="sourceText">dummy-static</div>
          </div>
          <div class="status-card">
            <div class="status-label">気分</div>
            <div class="status-value" id="emotionText">calm</div>
          </div>
          <div class="status-card">
            <div class="status-label">動き</div>
            <div class="status-value" id="motionText">wander</div>
          </div>
        </div>
      </section>

      <section class="glass top-right mobile-collapsed" id="infoPanel">
        <h2>いまの挙動</h2>
        <div class="tag-row">
          <span class="tag">歩行アニメ <b id="clipText">-</b></span>
          <span class="tag">演出 <b id="auraText">none</b></span>
          <span class="tag">移動方針 <b id="moveModeText">wander</b></span>
          <span class="tag">強さ <b id="intensityText">0.35</b></span>
        </div>
        <ol class="rule-list">
          <li>平常時は有限空間の中を自律移動</li>
          <li>会話後はダミーAIのタグでしばらく振る舞いを変更</li>
          <li>歩行は Blender の Armature アクションだけ使用</li>
          <li>ジャンプ・傾き・回転・キラキラは JS 演出</li>
        </ol>
      </section>

      <section class="bottom-panel" id="bottomPanel">
        <div class="mobile-tabs" id="mobileTabs">
          <button class="mobile-tab is-active" id="tabBtnLog" type="button" data-tab="log">会話ログ</button>
          <button class="mobile-tab" id="tabBtnInput" type="button" data-tab="input">入力</button>
        </div>
        <div class="glass log-panel panel-log is-active" data-panel="log">
          <h2>会話ログ</h2>
          <div class="chat-log" id="chatLog"></div>
        </div>
        <div class="glass input-panel panel-input" data-panel="input">
          <h2>話しかける</h2>
          <form class="form" id="chatForm">
            <textarea id="chatInput" placeholder="例えば: おはよう、今日は元気？"></textarea>
            <div class="controls-row">
              <div class="small-note" id="backendHint">
                この版は完全フロントのみ。GitHub Pages にそのまま置けるダミー応答版だよ。
              </div>
              <div style="display:flex; gap:10px; align-items:center;">
                <button class="secondary" id="clearLogBtn" type="button">ログをクリア</button>
                <button class="primary" id="sendBtn" type="submit">送信</button>
              </div>
            </div>
          </form>
        </div>
      </section>
    </div>
  </div>
`;

const ui = {
  loadingToast: document.querySelector('#loadingToast'),
  statusText: document.querySelector('#statusText'),
  sourceText: document.querySelector('#sourceText'),
  emotionText: document.querySelector('#emotionText'),
  motionText: document.querySelector('#motionText'),
  clipText: document.querySelector('#clipText'),
  auraText: document.querySelector('#auraText'),
  moveModeText: document.querySelector('#moveModeText'),
  intensityText: document.querySelector('#intensityText'),
  chatLog: document.querySelector('#chatLog'),
  chatForm: document.querySelector('#chatForm'),
  chatInput: document.querySelector('#chatInput'),
  sendBtn: document.querySelector('#sendBtn'),
  clearLogBtn: document.querySelector('#clearLogBtn'),
  infoPanel: document.querySelector('#infoPanel'),
  mobileInfoToggle: document.querySelector('#mobileInfoToggle'),
  mobileTabLog: document.querySelector('#mobileTabLog'),
  mobileTabInput: document.querySelector('#mobileTabInput'),
  mobileTabs: document.querySelector('#mobileTabs'),
  tabBtnLog: document.querySelector('#tabBtnLog'),
  tabBtnInput: document.querySelector('#tabBtnInput'),
  mobilePanels: Array.from(document.querySelectorAll('[data-panel]')),
};

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.querySelector('.shell').prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x08101f, 10, 28);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 3.8, 8.8);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 3.8;
controls.maxDistance = 14;
controls.target.set(0, 1.2, 0);

const hemiLight = new THREE.HemisphereLight(0xbfd4ff, 0x1d2636, 1.35);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.45);
dirLight.position.set(5, 9, 6);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.left = -12;
dirLight.shadow.camera.right = 12;
dirLight.shadow.camera.top = 12;
dirLight.shadow.camera.bottom = -12;
scene.add(dirLight);

const fillLight = new THREE.PointLight(0x6486ff, 1.2, 25, 2);
fillLight.position.set(-4, 3, 2);
scene.add(fillLight);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(20, 72),
  new THREE.MeshStandardMaterial({ color: 0x162235, roughness: 0.96, metalness: 0.03 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(20, 20, 0x6688c4, 0x293c5f);
grid.position.y = 0.002;
if (Array.isArray(grid.material)) {
  grid.material.forEach((material) => {
    material.transparent = true;
    material.opacity = 0.38;
  });
} else {
  grid.material.transparent = true;
  grid.material.opacity = 0.38;
}
scene.add(grid);

const boundary = new THREE.Box3(
  new THREE.Vector3(-WORLD_LIMIT, 0, -WORLD_LIMIT),
  new THREE.Vector3(WORLD_LIMIT, 4, WORLD_LIMIT)
);

const worldRoot = new THREE.Group();
const motionRoot = new THREE.Group();
const auraRoot = new THREE.Group();
worldRoot.add(motionRoot);
worldRoot.add(auraRoot);
scene.add(worldRoot);

const sparkleTexture = makeSparkleTexture();
const sparkleSprites = [];
for (let index = 0; index < 18; index += 1) {
  const material = new THREE.SpriteMaterial({
    map: sparkleTexture,
    color: 0xb7ccff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(material);
  sprite.visible = false;
  sprite.scale.setScalar(0.22);
  auraRoot.add(sprite);
  sparkleSprites.push({ sprite, active: false, life: 0, duration: 1, velocity: new THREE.Vector3() });
}

const auraRing = new THREE.Mesh(
  new THREE.RingGeometry(0.58, 0.92, 48),
  new THREE.MeshBasicMaterial({
    color: 0x8ca8ff,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
);
auraRing.rotation.x = -Math.PI / 2;
auraRing.position.y = 0.03;
auraRoot.add(auraRing);

const loader = new GLTFLoader();
const clock = new THREE.Clock();
const moveVector = new THREE.Vector3();
const tempVector = new THREE.Vector3();
const workVector = new THREE.Vector3();

const history = [];
const agent = {
  emotion: 'calm',
  motion: 'none',
  aura: 'none',
  moveMode: 'wander',
  intensity: 0.35,
  directiveTimer: 0,
  idleTimer: 0,
  nextDecisionTimer: 1.2,
  target: new THREE.Vector3(0, 0, 0),
  velocity: new THREE.Vector3(),
  moveSpeed: 1.05,
  wobbleTimer: 0,
  spinTimer: 0,
  spinDuration: 0,
  spinTurns: 0,
  tiltTimer: 0,
  tiltDuration: 0,
  tiltSide: 1,
  hopTimer: 0,
  hopDuration: 0,
  hopHeight: 0,
  spawnSparkleAccumulator: 0,
};

const modelState = {
  root: null,
  mixer: null,
  walkClipName: '',
  walkAction: null,
  loaded: false,
};


const mediaMobile = window.matchMedia('(max-width: 720px)');

function setMobileTab(tab) {
  const isMobile = mediaMobile.matches;
  ui.mobilePanels.forEach((panel) => {
    if (!isMobile) {
      panel.classList.add('is-active');
      return;
    }
    panel.classList.toggle('is-active', panel.dataset.panel === tab);
  });
  ui.tabBtnLog?.classList.toggle('is-active', tab === 'log');
  ui.tabBtnInput?.classList.toggle('is-active', tab === 'input');
}

function setInfoPanelOpen(isOpen) {
  if (!ui.infoPanel) return;
  ui.infoPanel.classList.toggle('mobile-open', !!isOpen);
  ui.infoPanel.classList.toggle('mobile-collapsed', !isOpen);
  if (ui.mobileInfoToggle) {
    ui.mobileInfoToggle.textContent = isOpen ? '閉じる' : '詳細';
  }
}

function syncResponsiveUi() {
  if (mediaMobile.matches) {
    setMobileTab('log');
    setInfoPanelOpen(false);
  } else {
    setMobileTab('log');
    setInfoPanelOpen(true);
  }
}

const KEYWORD_RULES = [
  {
    keywords: ['おはよう', '朝', 'hello', 'こんにちは'],
    payload: {
      reply: '来てくれてうれしいよ。今日はどんな気分で過ごしたい？',
      emotion: 'happy',
      motion: 'hop',
      aura: 'sparkle',
      move_mode: 'approach',
      intensity: 0.75,
      duration_sec: 4.5,
      source: 'dummy-static',
    },
  },
  {
    keywords: ['眠', 'ねむ', 'おやすみ'],
    payload: {
      reply: 'ちょっとまどろんでたかも。ゆっくり話そう。',
      emotion: 'sleepy',
      motion: 'tilt',
      aura: 'pulse',
      move_mode: 'idle',
      intensity: 0.4,
      duration_sec: 5.0,
      source: 'dummy-static',
    },
  },
  {
    keywords: ['すごい', 'かわいい', '好き', 'えらい'],
    payload: {
      reply: 'えへへ、そう言ってもらえるとふわっと元気になるね。',
      emotion: 'happy',
      motion: 'spin',
      aura: 'sparkle',
      move_mode: 'orbit',
      intensity: 0.85,
      duration_sec: 5.5,
      source: 'dummy-static',
    },
  },
  {
    keywords: ['悲', 'つら', 'しんど', '疲れ'],
    payload: {
      reply: 'ここで少し休もう。急がなくて大丈夫だよ。',
      emotion: 'sad',
      motion: 'tilt',
      aura: 'glow',
      move_mode: 'approach',
      intensity: 0.45,
      duration_sec: 5.5,
      source: 'dummy-static',
    },
  },
  {
    keywords: ['なに', 'どう', '教えて', '知りたい'],
    payload: {
      reply: '気になること、いっしょにほどいていこう。',
      emotion: 'curious',
      motion: 'tilt',
      aura: 'glow',
      move_mode: 'approach',
      intensity: 0.6,
      duration_sec: 4.0,
      source: 'dummy-static',
    },
  },
];

const GENERAL_VARIANTS = [
  {
    reply: 'うん、ちゃんと聞いてるよ。次はどんなこと話そうか。',
    emotion: 'calm',
    motion: 'none',
    aura: 'none',
    move_mode: 'wander',
    intensity: 0.35,
    duration_sec: 3.5,
    source: 'dummy-static',
  },
  {
    reply: 'それ、ちょっと面白いね。ふわっと考えてみる。',
    emotion: 'thinking',
    motion: 'tilt',
    aura: 'glow',
    move_mode: 'idle',
    intensity: 0.5,
    duration_sec: 4.0,
    source: 'dummy-static',
  },
  {
    reply: 'よし、もう少し近くで一緒に見てみよう。',
    emotion: 'curious',
    motion: 'hop',
    aura: 'sparkle',
    move_mode: 'approach',
    intensity: 0.65,
    duration_sec: 4.5,
    source: 'dummy-static',
  },
];

const RECENT_VARIANTS = [
  {
    reply: '話しているうちに、だんだん君の空気がわかってきた気がする。続けよう。',
    emotion: 'thinking',
    motion: 'tilt',
    aura: 'glow',
    move_mode: 'orbit',
    intensity: 0.55,
    duration_sec: 4.0,
    source: 'dummy-static',
  },
  {
    reply: 'その話、もう少し聞きたいな。近くで聞いてもいい？',
    emotion: 'curious',
    motion: 'none',
    aura: 'pulse',
    move_mode: 'approach',
    intensity: 0.5,
    duration_sec: 4.5,
    source: 'dummy-static',
  },
];

async function bootstrap() {
  await loadModel();
  ui.sourceText.textContent = 'dummy-static';
  ui.statusText.textContent = modelState.loaded ? '待機中' : 'モデル読み込み失敗';
  ui.loadingToast.classList.toggle('show', !modelState.loaded);
  seedInitialMessages();
  restoreChatLog();
  pickRandomTarget();
  animate();
}

function chooseWalkClip(clips) {
  const armature = clips.find((clip) => /armature/i.test(clip.name));
  if (armature) return armature;
  const nonCube = clips.find((clip) => !/cube/i.test(clip.name));
  return nonCube ?? clips[0] ?? null;
}

async function loadModel() {
  try {
    const gltf = await loader.loadAsync(MODEL_URL);
    modelState.root = gltf.scene;
    motionRoot.add(modelState.root);
    modelState.root.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

    const box = new THREE.Box3().setFromObject(modelState.root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    modelState.root.position.x -= center.x;
    modelState.root.position.z -= center.z;
    modelState.root.position.y -= box.min.y;

    const biggestXZ = Math.max(size.x, size.z) || 1;
    const scale = 2.2 / biggestXZ;
    motionRoot.scale.setScalar(scale);

    modelState.mixer = new THREE.AnimationMixer(modelState.root);
    const walkClip = chooseWalkClip(gltf.animations);
    if (walkClip) {
      modelState.walkClipName = walkClip.name;
      modelState.walkAction = modelState.mixer.clipAction(walkClip);
      modelState.walkAction.setLoop(THREE.LoopRepeat, Infinity);
      modelState.walkAction.enabled = true;
      modelState.walkAction.clampWhenFinished = false;
      modelState.walkAction.play();
      modelState.walkAction.paused = true;
      ui.clipText.textContent = walkClip.name;
    } else {
      ui.clipText.textContent = 'なし';
    }

    modelState.loaded = true;
    ui.loadingToast.classList.remove('show');
    return true;
  } catch (error) {
    console.error(error);
    ui.loadingToast.textContent = 'モデル読み込みに失敗したよ';
    ui.loadingToast.classList.add('show');
    return false;
  }
}

function seedInitialMessages() {
  if (history.length > 0) return;
  pushChatRecord({
    role: 'assistant',
    content: '準備できたよ。話しかけてくれたら、ダミーAIで雰囲気を変えながらうごくね。',
    emotion: 'calm',
    motion: 'none',
    aura: 'none',
    move_mode: 'wander',
    source: 'dummy-static',
  });
}

function restoreChatLog() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    renderChatLog();
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('history is not array');
    history.length = 0;
    for (const item of parsed.slice(-MAX_HISTORY_ITEMS)) {
      if (!item || typeof item !== 'object') continue;
      if (item.role !== 'user' && item.role !== 'assistant') continue;
      if (typeof item.content !== 'string' || !item.content.trim()) continue;
      history.push(item);
    }
  } catch (error) {
    console.warn('history restore failed', error);
    history.length = 0;
    seedInitialMessages();
  }

  if (history.length === 0) {
    seedInitialMessages();
  }
  renderChatLog();
}

function saveHistory() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-MAX_HISTORY_ITEMS)));
}

function pushChatRecord(item) {
  history.push(item);
  if (history.length > MAX_HISTORY_ITEMS) {
    history.splice(0, history.length - MAX_HISTORY_ITEMS);
  }
  saveHistory();
  renderChatLog();
}

function renderChatLog() {
  ui.chatLog.innerHTML = '';
  for (const item of history) {
    const wrapper = document.createElement('div');
    wrapper.className = `chat-item ${item.role}`;

    const role = document.createElement('div');
    role.className = 'chat-role';
    role.textContent = item.role === 'user' ? 'YOU' : 'PET';

    const text = document.createElement('div');
    text.className = 'chat-text';
    text.textContent = item.content;

    wrapper.append(role, text);

    if (item.role === 'assistant') {
      const meta = document.createElement('div');
      meta.className = 'chat-meta';
      meta.innerHTML = `
        <span>emotion: ${item.emotion ?? 'calm'}</span>
        <span>motion: ${item.motion ?? 'none'}</span>
        <span>aura: ${item.aura ?? 'none'}</span>
        <span>move: ${item.move_mode ?? 'wander'}</span>
      `;
      wrapper.append(meta);
    }

    ui.chatLog.append(wrapper);
  }
  ui.chatLog.scrollTop = ui.chatLog.scrollHeight;
}

function resetChatLog() {
  history.length = 0;
  window.localStorage.removeItem(STORAGE_KEY);
  seedInitialMessages();
  saveHistory();
  renderChatLog();
}

ui.mobileInfoToggle?.addEventListener('click', () => {
  if (!mediaMobile.matches) return;
  const willOpen = !ui.infoPanel.classList.contains('mobile-open');
  setInfoPanelOpen(willOpen);
});

ui.mobileTabLog?.addEventListener('click', () => setMobileTab('log'));
ui.mobileTabInput?.addEventListener('click', () => setMobileTab('input'));
ui.tabBtnLog?.addEventListener('click', () => setMobileTab('log'));
ui.tabBtnInput?.addEventListener('click', () => setMobileTab('input'));
mediaMobile.addEventListener('change', syncResponsiveUi);
syncResponsiveUi();

ui.clearLogBtn.addEventListener('click', () => {
  resetChatLog();
});

ui.chatForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = ui.chatInput.value.trim();
  if (!message) return;

  pushChatRecord({ role: 'user', content: message });
  ui.chatInput.value = '';
  ui.sendBtn.disabled = true;
  ui.statusText.textContent = '考え中…';
  ui.loadingToast.textContent = '返事を考え中…';
  ui.loadingToast.classList.add('show');

  try {
    await sleep(320 + Math.random() * 620);
    const data = makeDummyResponse(message, history);
    pushChatRecord({ role: 'assistant', content: data.reply, ...data });
    applyDirective(data);
    ui.sourceText.textContent = data.source;
    ui.statusText.textContent = '返事したよ';
  } catch (error) {
    console.error(error);
    const fallback = {
      role: 'assistant',
      content: 'いま少し言葉がつかえちゃった。もう一度話しかけてみて。',
      emotion: 'sad',
      motion: 'tilt',
      aura: 'none',
      move_mode: 'idle',
      source: 'fallback',
      intensity: 0.4,
      duration_sec: 3.0,
    };
    pushChatRecord(fallback);
    applyDirective(fallback);
    ui.sourceText.textContent = 'fallback';
    ui.statusText.textContent = '応答失敗';
  } finally {
    ui.sendBtn.disabled = false;
    ui.loadingToast.classList.remove('show');
  }
});

function makeDummyResponse(message, items) {
  const lowered = message.toLowerCase();
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((keyword) => lowered.includes(keyword))) {
      return { ...rule.payload };
    }
  }

  const recentUserCount = items.slice(-6).filter((item) => item.role === 'user').length;
  if (recentUserCount >= 3) {
    return { ...pickRandom(RECENT_VARIANTS) };
  }
  return { ...pickRandom(GENERAL_VARIANTS) };
}

function applyDirective(data) {
  agent.emotion = data.emotion ?? 'calm';
  agent.motion = data.motion ?? 'none';
  agent.aura = data.aura ?? 'none';
  agent.moveMode = data.move_mode ?? 'wander';
  agent.intensity = Number.isFinite(data.intensity) ? data.intensity : 0.5;
  agent.directiveTimer = Number.isFinite(data.duration_sec) ? data.duration_sec : 4.0;

  ui.emotionText.textContent = agent.emotion;
  ui.motionText.textContent = agent.motion;
  ui.auraText.textContent = agent.aura;
  ui.moveModeText.textContent = agent.moveMode;
  ui.intensityText.textContent = agent.intensity.toFixed(2);

  if (agent.motion === 'spin') triggerSpin(0.8 + agent.intensity * 1.2, 1 + Math.round(agent.intensity * 2));
  if (agent.motion === 'hop') triggerHop(0.55 + agent.intensity * 0.95, 0.95 + agent.intensity * 0.25);
  if (agent.motion === 'tilt') triggerTilt(1.8 + agent.intensity * 1.6, Math.random() < 0.5 ? -1 : 1);

  if (agent.moveMode === 'approach') {
    const cameraDir = new THREE.Vector3();
    camera.getWorldDirection(cameraDir);
    const target = controls.target.clone().addScaledVector(cameraDir.multiplyScalar(-1), 2.0);
    target.y = 0;
    setTargetWithinBounds(target);
  } else if (agent.moveMode === 'retreat') {
    tempVector.copy(worldRoot.position).sub(camera.position).setY(0).normalize();
    if (tempVector.lengthSq() < 0.001) tempVector.set(1, 0, 0);
    setTargetWithinBounds(worldRoot.position.clone().addScaledVector(tempVector, 2.8 + agent.intensity * 1.4));
  } else if (agent.moveMode === 'orbit') {
    const angle = Math.random() * Math.PI * 2;
    const radius = 2.2 + agent.intensity * 2.6;
    setTargetWithinBounds(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  } else if (agent.moveMode === 'idle') {
    agent.idleTimer = 1.2 + agent.intensity * 2.2;
  } else {
    pickRandomTarget();
  }
}

function setTargetWithinBounds(target) {
  target.x = THREE.MathUtils.clamp(target.x, -WORLD_LIMIT + 0.8, WORLD_LIMIT - 0.8);
  target.z = THREE.MathUtils.clamp(target.z, -WORLD_LIMIT + 0.8, WORLD_LIMIT - 0.8);
  target.y = 0;
  agent.target.copy(target);
}

function pickRandomTarget() {
  setTargetWithinBounds(
    new THREE.Vector3(
      THREE.MathUtils.randFloatSpread((WORLD_LIMIT - 1.2) * 2),
      0,
      THREE.MathUtils.randFloatSpread((WORLD_LIMIT - 1.2) * 2)
    )
  );
}

function triggerHop(height = 0.8, duration = 1.1) {
  agent.hopTimer = 0.0001;
  agent.hopHeight = height;
  agent.hopDuration = duration;
}

function triggerSpin(duration = 1.4, turns = 2) {
  agent.spinTimer = 0.0001;
  agent.spinDuration = duration;
  agent.spinTurns = turns;
}

function triggerTilt(duration = 2.2, side = 1) {
  agent.tiltTimer = 0.0001;
  agent.tiltDuration = duration;
  agent.tiltSide = side;
}

function updateAutonomousMotion(delta) {
  agent.nextDecisionTimer -= delta;
  agent.directiveTimer = Math.max(0, agent.directiveTimer - delta);
  agent.idleTimer = Math.max(0, agent.idleTimer - delta);
  agent.wobbleTimer += delta;

  if (agent.directiveTimer <= 0 && agent.nextDecisionTimer <= 0) {
    const roll = Math.random();
    if (roll < 0.22) {
      triggerHop(0.45 + Math.random() * 0.45, 0.9 + Math.random() * 0.25);
    } else if (roll < 0.35) {
      triggerTilt(1.6 + Math.random() * 1.1, Math.random() < 0.5 ? -1 : 1);
    } else if (roll < 0.44) {
      triggerSpin(1.0 + Math.random() * 0.8, 1 + Math.floor(Math.random() * 2));
    }

    if (Math.random() < 0.25) {
      agent.idleTimer = 0.8 + Math.random() * 1.4;
    } else {
      pickRandomTarget();
    }
    agent.nextDecisionTimer = 1.8 + Math.random() * 2.6;
  }

  if (agent.idleTimer > 0) {
    agent.velocity.lerp(new THREE.Vector3(0, 0, 0), 0.08);
    return;
  }

  moveVector.copy(agent.target).sub(worldRoot.position).setY(0);
  const distance = moveVector.length();

  if (distance < 0.25) {
    if (agent.directiveTimer <= 0) {
      agent.idleTimer = 0.5 + Math.random() * 1.2;
      pickRandomTarget();
    }
    agent.velocity.lerp(new THREE.Vector3(0, 0, 0), 0.08);
    return;
  }

  moveVector.normalize();

  const behaviorSpeed = getBehaviorSpeed();
  agent.velocity.lerp(moveVector.multiplyScalar(behaviorSpeed), 0.08);
  worldRoot.position.addScaledVector(agent.velocity, delta);
  worldRoot.position.x = THREE.MathUtils.clamp(worldRoot.position.x, -WORLD_LIMIT, WORLD_LIMIT);
  worldRoot.position.z = THREE.MathUtils.clamp(worldRoot.position.z, -WORLD_LIMIT, WORLD_LIMIT);

  if (!boundary.containsPoint(new THREE.Vector3(worldRoot.position.x, 1, worldRoot.position.z))) {
    pickRandomTarget();
  }

  if (agent.velocity.lengthSq() > 0.0008) {
    const desiredYaw = Math.atan2(agent.velocity.x, agent.velocity.z);
    worldRoot.rotation.y = THREE.MathUtils.lerp(worldRoot.rotation.y, desiredYaw, 0.12);
  }
}

function getBehaviorSpeed() {
  let speed = agent.moveSpeed;
  switch (agent.moveMode) {
    case 'approach':
      speed *= 1.15 + agent.intensity * 0.45;
      break;
    case 'retreat':
      speed *= 1.25 + agent.intensity * 0.5;
      break;
    case 'orbit':
      speed *= 0.95 + agent.intensity * 0.25;
      break;
    case 'idle':
      speed *= 0.45;
      break;
    default:
      speed *= 0.85 + agent.intensity * 0.35;
      break;
  }
  return speed;
}

function updateWalkAnimation() {
  if (!modelState.walkAction) return;
  const moving = agent.velocity.lengthSq() > 0.04;
  modelState.walkAction.paused = !moving;
  modelState.walkAction.timeScale = THREE.MathUtils.mapLinear(agent.velocity.length(), 0, 2.5, 0.8, 1.6);
}

function updateBodyFX(delta) {
  const wobble = Math.sin(agent.wobbleTimer * 1.25) * 0.025;
  motionRoot.rotation.z = wobble * 0.7;
  motionRoot.rotation.x = Math.cos(agent.wobbleTimer * 1.6) * 0.02;
  motionRoot.position.y = 0;
  motionRoot.scale.set(1, 1, 1);

  if (agent.tiltTimer > 0 && agent.tiltDuration > 0) {
    agent.tiltTimer += delta;
    const t = Math.min(agent.tiltTimer / agent.tiltDuration, 1);
    const wave = Math.sin(t * Math.PI * 2.2) * (0.16 + agent.intensity * 0.22) * agent.tiltSide;
    motionRoot.rotation.z += wave;
    motionRoot.rotation.x += wave * 0.25;
    if (t >= 1) {
      agent.tiltTimer = 0;
    }
  }

  if (agent.spinTimer > 0 && agent.spinDuration > 0) {
    agent.spinTimer += delta;
    const t = Math.min(agent.spinTimer / agent.spinDuration, 1);
    const eased = easeOutCubic(t);
    motionRoot.rotation.y = eased * Math.PI * 2 * agent.spinTurns;
    if (t >= 1) {
      agent.spinTimer = 0;
      motionRoot.rotation.y = 0;
    }
  }

  if (agent.hopTimer > 0 && agent.hopDuration > 0) {
    agent.hopTimer += delta;
    const t = Math.min(agent.hopTimer / agent.hopDuration, 1);
    const arc = Math.sin(t * Math.PI);
    const jumpY = arc * agent.hopHeight;
    motionRoot.position.y += jumpY;

    const stretch = 1 + arc * 0.16;
    const squash = 1 - arc * 0.09;

    if (t < 0.18) {
      const prep = t / 0.18;
      motionRoot.scale.set(1 + prep * 0.14, 1 - prep * 0.16, 1 + prep * 0.14);
    } else if (t < 0.8) {
      motionRoot.scale.set(squash, stretch, squash);
    } else {
      const settle = (t - 0.8) / 0.2;
      motionRoot.scale.set(1 + (1 - settle) * 0.08, 1 - (1 - settle) * 0.08, 1 + (1 - settle) * 0.08);
    }

    if (t >= 1) {
      agent.hopTimer = 0;
      motionRoot.position.y = 0;
      motionRoot.scale.set(1, 1, 1);
    }
  }
}

function updateAura(delta) {
  const auraStrength = getAuraStrength();
  auraRing.material.opacity = auraStrength * 0.48;
  const pulse = 1 + Math.sin(clock.elapsedTime * 3.4) * 0.08 * auraStrength;
  auraRing.scale.setScalar(pulse);

  agent.spawnSparkleAccumulator += delta * auraStrength * 7.5;
  while (agent.spawnSparkleAccumulator >= 1) {
    spawnSparkle();
    agent.spawnSparkleAccumulator -= 1;
  }

  for (const item of sparkleSprites) {
    if (!item.active) continue;
    item.life += delta;
    const t = item.life / item.duration;
    if (t >= 1) {
      item.active = false;
      item.sprite.visible = false;
      item.sprite.material.opacity = 0;
      continue;
    }

    item.sprite.position.addScaledVector(item.velocity, delta);
    item.sprite.material.opacity = Math.sin((1 - t) * Math.PI) * 0.8 * auraStrength;
    item.sprite.scale.setScalar(0.18 + t * 0.16 + auraStrength * 0.08);
  }
}

function getAuraStrength() {
  switch (agent.aura) {
    case 'sparkle':
      return 0.95 * agent.intensity + 0.2;
    case 'glow':
      return 0.7 * agent.intensity + 0.18;
    case 'pulse':
      return 0.55 * agent.intensity + 0.14;
    default:
      return 0.02;
  }
}

function spawnSparkle() {
  const slot = sparkleSprites.find((item) => !item.active);
  if (!slot) return;
  slot.active = true;
  slot.life = 0;
  slot.duration = 0.7 + Math.random() * 0.9;
  slot.sprite.visible = true;
  slot.sprite.position.set(
    THREE.MathUtils.randFloatSpread(1.6),
    0.5 + Math.random() * 1.1,
    THREE.MathUtils.randFloatSpread(1.6)
  );
  slot.velocity.set(
    THREE.MathUtils.randFloatSpread(0.35),
    0.55 + Math.random() * 0.5,
    THREE.MathUtils.randFloatSpread(0.35)
  );
}

function makeSparkleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.18, 'rgba(220,235,255,0.95)');
  gradient.addColorStop(0.4, 'rgba(170,200,255,0.55)');
  gradient.addColorStop(1, 'rgba(170,200,255,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(64, 64, 64, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);

  updateAutonomousMotion(delta);
  updateWalkAnimation();
  updateBodyFX(delta);
  updateAura(delta);

  if (modelState.mixer) {
    modelState.mixer.update(delta);
  }

  workVector.set(worldRoot.position.x, 1.2, worldRoot.position.z);
  controls.target.lerp(workVector, 0.05);
  controls.update();

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

bootstrap();
