const currentTimeEl = document.getElementById('current-time');
const alarmTimeInput = document.getElementById('alarm-time');
const alarmLabelInput = document.getElementById('alarm-label');
const addBtn = document.getElementById('add-btn');
const alarmListEl = document.getElementById('alarm-list');
const ringOverlay = document.getElementById('ring-overlay');
const ringLabelEl = document.getElementById('ring-label');
const ringTimeEl = document.getElementById('ring-time');
const stopBtn = document.getElementById('stop-btn');

let alarms = JSON.parse(localStorage.getItem('alarms') || '[]');
let ringingAudio = null;
let ringingId = null;

function createBeepAudio() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();

  function beep(startTime, freq) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.4, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
    osc.start(startTime);
    osc.stop(startTime + 0.4);
  }

  let t = ctx.currentTime;
  for (let i = 0; i < 3; i++) {
    beep(t, 880);
    beep(t + 0.5, 1100);
    t += 1.0;
  }

  const loop = setInterval(() => {
    if (!ringingId) { clearInterval(loop); ctx.close(); return; }
    let lt = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      beep(lt, 880);
      beep(lt + 0.5, 1100);
      lt += 1.0;
    }
  }, 3500);

  return { ctx, stop: () => { clearInterval(loop); ctx.close(); } };
}

function tick() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  currentTimeEl.textContent = `${hh}:${mm}:${ss}`;
  if (ss === '00') checkAlarms(hh, mm);
}

function checkAlarms(hh, mm) {
  alarms.forEach(a => {
    if (a.active && a.time === `${hh}:${mm}`) triggerAlarm(a);
  });
}

function triggerAlarm(alarm) {
  ringingId = alarm.id;
  ringLabelEl.textContent = alarm.label || '';
  ringTimeEl.textContent = alarm.time;
  ringOverlay.classList.remove('hidden');
  ringingAudio = createBeepAudio();
}

stopBtn.addEventListener('click', () => {
  if (ringingAudio) { ringingAudio.stop(); ringingAudio = null; }
  ringingId = null;
  ringOverlay.classList.add('hidden');
});

addBtn.addEventListener('click', () => {
  const time = alarmTimeInput.value;
  if (!time) { alarmTimeInput.focus(); return; }
  const alarm = { id: Date.now(), time, label: alarmLabelInput.value.trim(), active: true };
  alarms.push(alarm);
  save();
  render();
  alarmTimeInput.value = '';
  alarmLabelInput.value = '';
});

function save() {
  localStorage.setItem('alarms', JSON.stringify(alarms));
}

function render() {
  alarmListEl.innerHTML = '';
  if (alarms.length === 0) return;
  [...alarms].sort((a, b) => a.time.localeCompare(b.time)).forEach(alarm => {
    const item = document.createElement('div');
    item.className = `alarm-item ${alarm.active ? 'active' : 'inactive'}`;
    const toggleId = `toggle-${alarm.id}`;
    item.innerHTML = `
      <div class="info">
        <div class="time">${escHtml(alarm.time)}</div>
        ${alarm.label ? `<div class="label">${escHtml(alarm.label)}</div>` : ''}
      </div>
      <label class="toggle">
        <input type="checkbox" id="${toggleId}" ${alarm.active ? 'checked' : ''} />
        <span class="toggle-track"></span>
      </label>
      <button class="delete-btn" title="削除">✕</button>
    `;
    item.querySelector(`#${toggleId}`).addEventListener('change', e => {
      alarm.active = e.target.checked;
      item.className = `alarm-item ${alarm.active ? 'active' : 'inactive'}`;
      save();
    });
    item.querySelector('.delete-btn').addEventListener('click', () => {
      alarms = alarms.filter(a => a.id !== alarm.id);
      save();
      render();
    });
    alarmListEl.appendChild(item);
  });
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

render();
tick();
setInterval(tick, 1000);
