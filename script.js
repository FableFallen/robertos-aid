// Roberto's Aid — Minimal Cinematic Command Center

const { useState, useEffect, useRef, useCallback } = React;

// ─── Sound System ─────────────────────────────────────────
const SOUND_VOLUME      = 0.15;
const SOUND_COOLDOWN_MS = 120;

// Module-level control object — React toggles mutate this directly
// so playSound() doesn't need React state access.
// Defaults to muted (true) on first visit to avoid GitHub Pages surprises.
const soundCtrl = {
  muted: (() => {
    try {
      const v = localStorage.getItem('ra_sound_muted');
      return v === null ? true : v === 'true';
    } catch(e) { return true; }
  })(),
  lastPlayed: {},
};

const SOUNDS = {};
['select', 'swipe_01', 'button', 'toggle_on', 'notification'].forEach(name => {
  try {
    const a = new Audio(`sounds/${name}.wav`);
    a.preload = 'auto';
    a.volume  = SOUND_VOLUME;
    SOUNDS[name] = a;
  } catch(e) {}
});

function playSound(name) {
  if (soundCtrl.muted) return;
  try {
    const a = SOUNDS[name];
    if (!a) return;
    const now = Date.now();
    if (now - (soundCtrl.lastPlayed[name] || 0) < SOUND_COOLDOWN_MS) return;
    soundCtrl.lastPlayed[name] = now;
    a.volume      = SOUND_VOLUME;
    a.currentTime = 0;
    a.play().catch(() => {});
  } catch(e) {}
}

// ─── Utilities ───────────────────────────────────────────
const pad   = n  => String(Math.floor(n)).padStart(2, '0');
const fmt2  = s  => `${pad(s / 60)}:${pad(s % 60)}`;
const fmtH  = s  => s >= 3600 ? `${pad(s/3600)}:${pad((s%3600)/60)}:${pad(s%60)}` : fmt2(s);
const fmtTs = ts => new Date(ts).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:false });
const fmtMin = s => {
  const m = Math.round((s || 0) / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
};

const readFileAsDataURL = file => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = e => res(e.target.result);
  r.onerror = rej;
  r.readAsDataURL(file);
});

function computeTaskFocus(sessions) {
  const map = {};
  sessions.forEach(s => {
    const key = (s.attachedTask || '').toLowerCase().trim();
    if (!key) return;
    if (!map[key]) map[key] = { count: 0, totalSecs: 0 };
    map[key].count++;
    map[key].totalSecs += (s.durationSecs || 0);
  });
  return map;
}

function computeTaskAccomplishments(accomplishments) {
  const map = {};
  accomplishments.forEach(a => {
    const key = (a.linkedTask || '').toLowerCase().trim();
    if (!key) return;
    if (!map[key]) map[key] = { count: 0, totalSecs: 0 };
    map[key].count++;
    map[key].totalSecs += (a.timeSecs || 0);
  });
  return map;
}

// Strip session-only objUrl before localStorage
const serializeAcc = a => ({
  ...a,
  attachments: (a.attachments || []).map(({ objUrl, ...rest }) => rest),
});

// ─── Constants ───────────────────────────────────────────
// Add more entries here to extend the gallery
const BACKGROUNDS = [
  { id: 'hall',     label: 'Hall',          src: 'backgrounds/background hall.mp4', type: 'video' },
  { id: 'particle', label: 'Particle Field', src: 'backgrounds/genricparticle.png',  type: 'image' },
  { id: 'space',    label: 'Space',          src: 'backgrounds/space.png',           type: 'image' },
];

const FILTER_OPTIONS = [
  { id: 'clean',     label: 'Clean',     desc: 'No effect'      },
  { id: 'retro',     label: 'Retro',     desc: 'Sepia vignette' },
  { id: 'scanlines', label: 'Scanlines', desc: 'Subtle lines'   },
  { id: 'dim',       label: 'Dim',       desc: 'Darker overlay' },
  { id: 'mono',      label: 'Mono',      desc: 'Grayscale'      },
];

const THEMES = [
  { id: 'dark', label: 'Dark Space' },
  { id: 'tan',  label: 'Light Tan'  },
];

const HABIT_TYPES = [
  { id: 'binary',     label: 'Binary',     desc: 'Done / not done'      },
  { id: 'quantity',   label: 'Quantity',   desc: 'Track an amount'      },
  { id: 'duration',   label: 'Duration',   desc: 'Track time spent'     },
  { id: 'abstinence', label: 'Abstinence', desc: 'Stay free of a habit' },
];

const HABIT_UNITS = ['oz','cups','L','g','mg','pages','reps','sets','km','miles','hrs'];

// ─── Import helpers ───────────────────────────────────────
function csvSplitLine(line) {
  const res = []; let cur = ''; let inQ = false;
  for (const ch of line) {
    if (ch === '"' && !inQ) { inQ = true; }
    else if (ch === '"' && inQ) { inQ = false; }
    else if (ch === ',' && !inQ) { res.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  res.push(cur.trim());
  return res;
}

function parseImportCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = csvSplitLine(lines[0]).map(h => h.replace(/^"|"$/g,'').trim());
  return lines.slice(1).map(line => {
    const vals = csvSplitLine(line).map(v => v.replace(/^"|"$/g,'').trim());
    const obj = {};
    headers.forEach((h,i) => { obj[h] = vals[i] ?? ''; });
    return obj;
  });
}

const DEFAULT_PROFILE = {
  name:     '',
  initials: '',
  timezone: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch(e) { return ''; } })(),
};

function loadState(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch(e) { return fallback; }
}
function saveState(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
}

// Thin shim for ra_sound_muted — stored as raw 'true'/'false' by the module-level soundCtrl init
const safeLS = {
  get: (k, def) => { try { return localStorage.getItem(k) ?? def; } catch(e) { return def; } },
  set: (k, v)   => { try { localStorage.setItem(k, v); } catch(e) {} },
};

// ─── Icons ────────────────────────────────────────────────
const SvgIcon = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none"
    stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

const Icons = {
  pomodoro:        <SvgIcon d={<><circle cx="10" cy="10" r="7.5" strokeDasharray="24 23" strokeDashoffset="6"/><circle cx="10" cy="10" r="2.5" fill="currentColor" stroke="none"/></>}/>,
  timer:           <SvgIcon d={<><circle cx="10" cy="11" r="6.5"/><line x1="10" y1="11" x2="10" y2="7"/><line x1="10" y1="11" x2="13" y2="13"/><line x1="7" y1="3" x2="13" y2="3"/></>}/>,
  tasks:           <SvgIcon d={<><line x1="7" y1="6" x2="16" y2="6"/><line x1="7" y1="10" x2="16" y2="10"/><line x1="7" y1="14" x2="13" y2="14"/><circle cx="4" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="4" cy="10" r="1.2" fill="currentColor" stroke="none"/><circle cx="4" cy="14" r="1.2" fill="currentColor" stroke="none"/></>}/>,
  accomplishments: <SvgIcon d={<><circle cx="10" cy="10" r="7.5"/><polyline points="7,10 9,13 14,7"/></>}/>,
  backdrop:        <SvgIcon size={16} d={<><rect x="2" y="3" width="16" height="12" rx="2"/><line x1="6" y1="19" x2="14" y2="19"/><line x1="10" y1="15" x2="10" y2="19"/></>}/>,
  soundOn:         <SvgIcon size={16} d={<><polygon points="3,8 7,8 11,4 11,16 7,12 3,12"/><path d="M13.5,8.5 C14.5,9.5 14.5,10.5 13.5,11.5"/><path d="M15.5,6.5 C17.5,8.5 17.5,11.5 15.5,13.5"/></>}/>,
  soundOff:        <SvgIcon size={16} d={<><polygon points="3,8 7,8 11,4 11,16 7,12 3,12"/><line x1="14" y1="7" x2="18" y2="13"/><line x1="14" y1="13" x2="18" y2="7"/></>}/>,
  person:          <SvgIcon size={16} d={<><circle cx="10" cy="7.5" r="3"/><path d="M3.5,17.5 C3.5,14 6,12 10,12 C14,12 16.5,14 16.5,17.5"/></>}/>,
  calendar:        <SvgIcon d={<><rect x="3" y="4" width="14" height="13" rx="1.5"/><line x1="3" y1="8" x2="17" y2="8"/><line x1="7" y1="2" x2="7" y2="6"/><line x1="13" y1="2" x2="13" y2="6"/></>}/>,
  habits:          <SvgIcon d={<><path d="M4.5 10a5.5 5.5 0 1 0 5.5-5.5"/><polyline points="6,4.5 10,4.5 10,8.5"/><polyline points="7,10.5 9,13 13.5,7"/></>}/>,
};

const NAV = [
  { id: 'pomodoro',        label: 'Pomodoro'        },
  { id: 'timer',           label: 'Timer'           },
  { id: 'tasks',           label: 'Tasks'           },
  { id: 'accomplishments', label: 'Accomplishments' },
  { id: 'calendar',        label: 'Calendar'        },
  { id: 'habits',          label: 'Habits'          },
];

// ─── Calendar utilities ───────────────────────────────────
const HOUR_H    = 64; // px per hour in the time grid
const CAL_HOURS = Array.from({length: 24}, (_, i) => i);
const CAL_DAYS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const CAL_COLORS = [
  { id: 'crimson', label: 'Crimson', hex: '#c0392b' },
  { id: 'cobalt',  label: 'Cobalt',  hex: '#2471a3' },
  { id: 'teal',    label: 'Teal',    hex: '#148f77' },
  { id: 'amber',   label: 'Amber',   hex: '#ca6f1e' },
  { id: 'sage',    label: 'Sage',    hex: '#1e8449' },
  { id: 'violet',  label: 'Violet',  hex: '#7d3c98' },
];

const CAL_RECUR = [
  { id: 'none',     label: 'None'     },
  { id: 'daily',    label: 'Daily'    },
  { id: 'weekly',   label: 'Weekly'   },
  { id: 'weekdays', label: 'Weekdays' },
];

const CAL_MONTH = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function calWeekStart(date) {
  const d = new Date(date); d.setHours(0,0,0,0);
  d.setDate(d.getDate() - d.getDay()); return d;
}
function calAddDays(date, n) {
  const d = new Date(date); d.setDate(d.getDate() + n); return d;
}
function calDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
function calToMins(t) {
  if (!t) return 0;
  const [h,m] = t.split(':').map(Number);
  return (h||0)*60 + (m||0);
}
function calFromMins(mins) {
  const h = Math.floor(Math.max(0,mins)/60) % 24;
  const m = Math.max(0,mins) % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}
function calNowMins() { const n=new Date(); return n.getHours()*60+n.getMinutes(); }
function calColorHex(id) {
  if (id && id.startsWith('#')) return id;
  return (CAL_COLORS.find(c=>c.id===id)||CAL_COLORS[0]).hex;
}

// Expand recurring events into the visible week; adds _idate (instance date string)
function calExpandRecurring(events, weekStart) {
  const result = [], weekEnd = calAddDays(weekStart, 7);
  events.forEach(ev => {
    const rec = ev.recurrence || 'none';
    if (rec === 'none') {
      try {
        const d = new Date(ev.date+'T00:00:00');
        if (!isNaN(d) && d >= weekStart && d < weekEnd)
          result.push({...ev, _idate: ev.date});
      } catch(e) {}
    } else if (rec === 'daily') {
      for (let i=0; i<7; i++) result.push({...ev, _idate: calDateStr(calAddDays(weekStart,i))});
    } else if (rec === 'weekly') {
      try {
        const orig = new Date(ev.date+'T00:00:00');
        if (!isNaN(orig)) {
          const d = calAddDays(weekStart, orig.getDay());
          if (d >= weekStart && d < weekEnd) result.push({...ev, _idate: calDateStr(d)});
        }
      } catch(e) {}
    } else if (rec === 'weekdays') {
      for (let i=1; i<=5; i++) result.push({...ev, _idate: calDateStr(calAddDays(weekStart,i))});
    }
  });
  return result;
}

// Greedy column assignment for overlapping events in one day
function calLayoutDay(evs) {
  if (!evs.length) return [];
  const sorted = [...evs].sort((a,b) => calToMins(a.startTime)-calToMins(b.startTime));
  const cols = [];
  sorted.forEach(ev => {
    const s = calToMins(ev.startTime);
    let placed = false;
    for (const col of cols) {
      if (calToMins(col[col.length-1].endTime) <= s) { col.push(ev); placed=true; break; }
    }
    if (!placed) cols.push([ev]);
  });
  const n = cols.length;
  return sorted.map(ev => {
    const ci = cols.findIndex(c => c.some(e => e===ev));
    return {ev, ci, n};
  });
}

// ─── Habit utilities ──────────────────────────────────────
const HABIT_COLORS = [
  { id: 'crimson', hex: '#c0392b', label: 'Crimson' },
  { id: 'cobalt',  hex: '#2471a3', label: 'Cobalt'  },
  { id: 'teal',    hex: '#148f77', label: 'Teal'    },
  { id: 'amber',   hex: '#ca6f1e', label: 'Amber'   },
  { id: 'sage',    hex: '#1e8449', label: 'Sage'    },
  { id: 'slate',   hex: '#5d6d7e', label: 'Slate'   },
];

const HABIT_FREQ = [
  { id: 'daily',    label: 'Daily'         },
  { id: 'weekdays', label: 'Weekdays'      },
  { id: 'specific', label: 'Specific Days' },
  { id: 'weekly',   label: 'Weekly'        },
];

const HAB_WEEK_SHORT = ['S','M','T','W','T','F','S'];
const HAB_WEEK_LONG  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const HAB_MOODS      = ['😊','😌','😐','😓','😫'];
const HAB_DIFFS      = ['Easy','Medium','Hard'];

function habitDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function todayHabitStr() { return habitDateStr(new Date()); }

function getHabitWeekDates() {
  const d = new Date(); d.setHours(0,0,0,0);
  d.setDate(d.getDate() - d.getDay());
  return Array.from({length:7}, (_,i) => {
    const x = new Date(d); x.setDate(d.getDate()+i); return habitDateStr(x);
  });
}

function habitColorHex(id) {
  if (id && (id.startsWith('#') || id.startsWith('rgb'))) return id;
  return (HABIT_COLORS.find(c=>c.id===id)||HABIT_COLORS[0]).hex;
}

function abstinenceStreak(habit) {
  const since = habit.lastOccurrence || habit.createdAt || Date.now();
  return Math.max(0, Math.floor((Date.now() - since) / 86400000));
}

function isHabitDue(habit, dateStr) {
  const d   = new Date(dateStr+'T00:00:00');
  const dow = d.getDay();
  switch (habit.frequency || 'daily') {
    case 'daily':    return true;
    case 'weekdays': return dow >= 1 && dow <= 5;
    case 'specific': return (habit.specificDays || []).includes(dow);
    case 'weekly':   return true;
    default:         return true;
  }
}

function habitStreak(habit, logs) {
  const d = new Date(); d.setHours(0,0,0,0);
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const ds = habitDateStr(d);
    if (isHabitDue(habit, ds)) {
      if (!logs.some(l => l.habitId === habit.id && l.date === ds)) break;
      streak++;
    }
    d.setDate(d.getDate()-1);
  }
  return streak;
}

// ─── Landing: vertical wheel selector ─────────────────────
function Landing({ onNavigate }) {
  const [sel, setSel] = useState(0);
  const landingRef    = useRef(null);
  const selRef        = useRef(sel);
  selRef.current      = sel;

  const go = useCallback(dir => {
    setSel(i => Math.max(0, Math.min(NAV.length - 1, i + dir)));
    playSound('swipe_01');
  }, []);

  const open = useCallback(() => {
    playSound('select');
    onNavigate(NAV[selRef.current].id);
  }, [onNavigate]);

  useEffect(() => {
    const h = e => {
      if (e.key === 'ArrowUp')   { e.preventDefault(); go(-1); }
      if (e.key === 'ArrowDown') { e.preventDefault(); go(1);  }
      if (e.key === 'Enter')     open();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [go, open]);

  useEffect(() => {
    const el = landingRef.current;
    if (!el) return;
    const h = e => { e.preventDefault(); go(e.deltaY > 0 ? 1 : -1); };
    el.addEventListener('wheel', h, { passive: false });
    return () => el.removeEventListener('wheel', h);
  }, [go]);

  const ITEM_H = 84;

  return (
    <div className="landing" ref={landingRef}>
      <video className="landing-video" autoPlay muted loop playsInline>
        <source src="backgrounds/looping space.mp4" type="video/mp4"/>
      </video>
      <div className="landing-overlay"/>
      <div className="landing-content fade-in">
        <div className="landing-brand">
          <div className="landing-eyebrow">Personal Command Center</div>
          <div className="landing-title"><strong>Roberto's</strong> Aid</div>
        </div>
        <div className="wheel-wrap">
          <div className="wheel-center-bar"/>
          {NAV.map((mod, i) => {
            const offset  = i - sel;
            const abs     = Math.abs(offset);
            const isSel   = offset === 0;
            const scale   = isSel ? 1 : abs === 1 ? 0.8 : 0.62;
            const opacity = isSel ? 1 : abs === 1 ? 0.38 : 0.13;
            return (
              <div key={mod.id}
                className={`wheel-item${isSel ? ' sel' : ''}`}
                style={{ transform: `translateY(${offset * ITEM_H}px) scale(${scale})`, opacity }}
                onClick={() => { if (isSel) open(); else { playSound('swipe_01'); setSel(i); } }}>
                <div className={`wheel-icon${isSel ? ' sel' : ''}`}>{Icons[mod.id]}</div>
                <span className="wheel-label">{mod.label}</span>
              </div>
            );
          })}
        </div>
        <div className="wheel-hint">↑ ↓  Scroll or arrow keys  ·  Enter to open</div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────
function Sidebar({ screen, onNavigate, bgPanelOpen, onToggleBgPanel, soundMuted, onToggleSound, onOpenProfile }) {
  return (
    <nav className="sidebar">
      <button className="sidebar-logo"
        onClick={() => { playSound('button'); onNavigate('landing'); }}
        title="Home">
        <span className="sidebar-logo-text">R·A</span>
      </button>
      <div className="sidebar-nav">
        {NAV.map(({ id, label }) => (
          <button key={id}
            className={`sidebar-btn ${screen === id ? 'active' : ''}`}
            onClick={() => { playSound('button'); onNavigate(id); }}
            data-tip={label}>
            {Icons[id]}
          </button>
        ))}
      </div>
      <button className={`sidebar-btn ${bgPanelOpen ? 'active' : ''}`}
        style={{marginTop:'auto'}}
        onClick={onToggleBgPanel}
        data-tip="Background">
        {Icons.backdrop}
      </button>
      <button className={`sidebar-btn ${!soundMuted ? 'active' : ''}`}
        style={{marginTop:4}}
        onClick={onToggleSound}
        data-tip={soundMuted ? 'Sound off' : 'Sound on'}>
        {soundMuted ? Icons.soundOff : Icons.soundOn}
      </button>
      <button className="sidebar-btn"
        style={{marginTop:4}}
        onClick={onOpenProfile}
        data-tip="Profile & Settings">
        {Icons.person}
      </button>
    </nav>
  );
}

// ─── Background Settings Panel ────────────────────────────
function BgSettingsPanel({ bgChoice, bgFilter, onSetBgChoice, onSetBgFilter, onClose }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="bg-panel">
      <div className="row jb ac" style={{marginBottom:14}}>
        <div className="mono t9 c3 uc ls-wide">Background</div>
        <button className="btn ghost sm" style={{width:24,height:24,padding:0,fontSize:15,lineHeight:1}}
          onClick={onClose}>×</button>
      </div>
      <div className="bg-thumb-row" style={{marginBottom:16}}>
        {BACKGROUNDS.map(bg => (
          <button key={bg.id}
            className={`bg-thumb-btn ${bgChoice === bg.id ? 'active' : ''}`}
            onClick={() => onSetBgChoice(bg.id)}>
            <div className="bg-thumb">
              {bg.type === 'image'
                ? <img src={bg.src} alt={bg.label}/>
                : <div style={{width:'100%',height:'100%',background:'linear-gradient(135deg,#0c0c0c,#1c1c1c)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <span style={{fontSize:14,opacity:0.4}}>▶</span>
                  </div>
              }
            </div>
            <span className="mono" style={{fontSize:11}}>{bg.label}</span>
          </button>
        ))}
      </div>
      <div className="mono t9 c3 uc ls-wide" style={{marginBottom:8}}>Filter</div>
      <div className="filter-btn-row">
        {FILTER_OPTIONS.map(f => (
          <button key={f.id}
            className={`filter-btn ${bgFilter === f.id ? 'active' : ''}`}
            onClick={() => onSetBgFilter(f.id)}>
            <span style={{width:6,height:6,borderRadius:'50%',flexShrink:0,background:bgFilter===f.id?'var(--red-2)':'var(--text-3)',transition:'background 0.15s'}}/>
            <span style={{flex:1}}>{f.label}</span>
            <span style={{color:'var(--text-3)',fontSize:9}}>{f.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────
function AppShell({ screen, onNavigate, bgChoice, bgFilter, onSetBgChoice, onSetBgFilter, soundMuted, onToggleSound, onOpenProfile, children }) {
  const [showBgPanel, setShowBgPanel] = useState(false);
  const bg = BACKGROUNDS.find(b => b.id === bgChoice) || BACKGROUNDS[0];

  return (
    <div className={`app-shell filter-${bgFilter}`}>
      <div className="app-bg">
        {bg.type === 'video' ? (
          <>
            <img src="backgrounds/genricparticle.png" className="app-bg-fallback" alt=""/>
            <video className="app-bg-video" autoPlay muted loop playsInline key={bg.src}>
              <source src={bg.src} type="video/mp4"/>
            </video>
          </>
        ) : (
          <img src={bg.src} className="app-bg-static" alt=""/>
        )}
        <div className="app-bg-overlay"/>
      </div>
      <Sidebar screen={screen} onNavigate={onNavigate}
        bgPanelOpen={showBgPanel}
        onToggleBgPanel={() => { playSound('button'); setShowBgPanel(v => !v); }}
        soundMuted={soundMuted}
        onToggleSound={onToggleSound}
        onOpenProfile={onOpenProfile}
      />
      {showBgPanel && (
        <>
          <div style={{position:'fixed',inset:0,zIndex:499}} onClick={() => setShowBgPanel(false)}/>
          <BgSettingsPanel
            bgChoice={bgChoice} bgFilter={bgFilter}
            onSetBgChoice={v => { onSetBgChoice(v); }}
            onSetBgFilter={v => { onSetBgFilter(v); }}
            onClose={() => setShowBgPanel(false)}
          />
        </>
      )}
      <div className="main fade-in" onClick={() => showBgPanel && setShowBgPanel(false)}>
        {children}
      </div>
    </div>
  );
}

function Header({ eyebrow, title, actions }) {
  return (
    <div className="screen-header">
      <div>
        {eyebrow && <div className="screen-eyebrow">{eyebrow}</div>}
        <div className="screen-title">{title}</div>
      </div>
      {actions && <div className="screen-actions">{actions}</div>}
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// POMODORO
// ═════════════════════════════════════════════════════════

function DurInput({ label, value, onChange, chips }) {
  const [local, setLocal] = useState(String(value));
  useEffect(() => setLocal(String(value)), [value]);
  const commit = () => { const n = Math.max(1, parseInt(local)||1); onChange(n); setLocal(String(n)); };
  return (
    <div className="col g5">
      <div className="mono t9 c3 uc">{label}</div>
      <div className="row ac g6">
        <div className="field" style={{width:58,flexShrink:0}}>
          <input type="number" min="1" max="480" value={local}
            onChange={e => setLocal(e.target.value)} onBlur={commit}
            onKeyDown={e => e.key === 'Enter' && commit()}
            style={{width:'100%',textAlign:'center'}} className="mono t13"/>
        </div>
        <span className="mono t9 c3" style={{flexShrink:0}}>min</span>
      </div>
      <div className="row g4 wrap">
        {chips.map(m => (
          <button key={m} className={`btn sm ${value===m?'primary':'ghost'}`}
            onClick={() => { playSound('toggle_on'); onChange(m); }}>{m}m</button>
        ))}
      </div>
    </div>
  );
}

function advancePhase(p) {
  let nextPhase, nextDur;
  if (p.phase === 'work') {
    const useLong = p.roundsBeforeLong > 0 && p.round % p.roundsBeforeLong === 0;
    nextPhase = useLong ? 'longBreak' : 'break';
    nextDur   = useLong ? p.longBreakDur : p.breakDur;
  } else {
    nextPhase = 'work';
    nextDur   = p.workDur;
  }
  const logEntry = p.phase === 'work'
    ? { id: Date.now(), label: (p.sessionLabel||'').trim()||'Focus Session',
        attachedTask: (p.attachedTask||'').trim(), durationSecs: p.workDur*60,
        type: 'pomodoro', at: Date.now() }
    : null;
  return {
    ...p,
    phase:          nextPhase,
    timeLeft:       nextDur * 60,
    round:          nextPhase === 'work' ? p.round + 1 : p.round,
    completedToday: p.phase === 'work' ? p.completedToday + 1 : p.completedToday,
    sessions:       logEntry ? [...p.sessions, logEntry] : p.sessions,
  };
}

function Pomodoro({ pomState: p, setPomState, taskTitles, onPostAccomplishment }) {
  const { workDur, breakDur, longBreakDur, roundsBeforeLong, phase, round, timeLeft, running,
          completedToday, sessionLabel, attachedTask, sessions } = p;

  const totalSecs = phase==='work' ? workDur*60 : phase==='longBreak' ? longBreakDur*60 : breakDur*60;
  const pct       = Math.max(0, Math.min(1, 1 - timeLeft / totalSecs));
  const R = 120, C = 2 * Math.PI * R;
  const ringAngle = pct * 360 - 90;
  const phaseLabel = { work:'Work', break:'Break', longBreak:'Long Break' }[phase];

  const toggle = () => { playSound('button'); setPomState(s => ({...s, running: !s.running})); };
  const reset  = () => { playSound('button'); setPomState(s => ({...s, running:false, phase:'work', round:1, timeLeft:s.workDur*60})); };
  const skip   = () => { playSound('toggle_on'); setPomState(s => advancePhase(s)); };

  const setDur = (key, mins) => {
    playSound('toggle_on');
    setPomState(s => {
      const out = {...s, [key]:mins};
      if (!s.running) {
        if (key==='workDur'      && s.phase==='work')      out.timeLeft = mins*60;
        if (key==='breakDur'     && s.phase==='break')     out.timeLeft = mins*60;
        if (key==='longBreakDur' && s.phase==='longBreak') out.timeLeft = mins*60;
      }
      return out;
    });
  };

  const numDots = Math.min(roundsBeforeLong > 0 ? roundsBeforeLong : 4, 8);
  const tOpts   = running ? 'stroke-dashoffset 1.05s linear' : 'none';

  return (
    <div className="screen">
      <Header eyebrow={`Round ${round} · ${phaseLabel} · ${completedToday} completed today`} title="Pomodoro"/>

      <div className="row g20 flex1" style={{minHeight:0}}>
        <div className="panel flex1 col ac jc red-rim of-h rel">
          <div className="abs" style={{inset:0,background:'radial-gradient(circle at center,rgba(192,57,43,0.06),transparent 60%)',pointerEvents:'none'}}/>
          <div className="mono t10 c3 uc ls-wide" style={{position:'absolute',top:24,left:0,right:0,textAlign:'center',textShadow:'0 1px 4px rgba(0,0,0,0.8)'}}>
            {phaseLabel} · {fmt2(timeLeft)} remaining
          </div>

          <svg width="300" height="300" viewBox="0 0 360 360">
            <defs><filter id="pomo-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="4"/></filter></defs>
            <circle cx="180" cy="180" r="155" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="2 5"/>
            {Array.from({length:60},(_,i)=>{
              const a=(i/60)*Math.PI*2-Math.PI/2, r1=R+14, r2=i%5===0?R+24:R+19;
              return <line key={i} x1={180+Math.cos(a)*r1} y1={180+Math.sin(a)*r1} x2={180+Math.cos(a)*r2} y2={180+Math.sin(a)*r2}
                stroke={i%5===0?'rgba(255,255,255,0.22)':'rgba(255,255,255,0.08)'} strokeWidth="1"/>;
            })}
            <circle cx="180" cy="180" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10"/>
            <circle cx="180" cy="180" r={R} fill="none" stroke="rgba(192,57,43,0.35)" strokeWidth="14"
              strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C*(1-pct)}
              transform="rotate(-90 180 180)" filter="url(#pomo-glow)" style={{transition:tOpts}}/>
            <circle cx="180" cy="180" r={R} fill="none" stroke="#c0392b" strokeWidth="4"
              strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C*(1-pct)}
              transform="rotate(-90 180 180)" style={{transition:tOpts}}/>
            {pct > 0.005 && (
              <g style={{transformOrigin:'180px 180px',transform:`rotate(${ringAngle}deg)`,transition:running?'transform 1.05s linear':'none'}}>
                <circle cx={180+R} cy={180} r="10" fill="rgba(192,57,43,0.4)" filter="url(#pomo-glow)"/>
                <circle cx={180+R} cy={180} r="5" fill="#e05050"/>
                <circle cx={180+R} cy={180} r="2.5" fill="#fff"/>
              </g>
            )}
            <text x="180" y="168" textAnchor="middle" fontFamily="'JetBrains Mono',monospace" fontSize="11" fill="rgba(255,255,255,0.32)" letterSpacing="3">{phaseLabel.toUpperCase()}</text>
            <text x="180" y="210" textAnchor="middle" fontFamily="'Space Grotesk',sans-serif" fontSize="56" fontWeight="300" fill="#f5f5f5">{fmt2(timeLeft)}</text>
            <text x="180" y="232" textAnchor="middle" fontFamily="'JetBrains Mono',monospace" fontSize="9" fill="rgba(255,255,255,0.32)" letterSpacing="2">{Math.round(pct*100)}% COMPLETE</text>
          </svg>

          <div className="row g12 ac" style={{marginTop:-4,zIndex:1}}>
            <button className="btn ghost" style={{width:40,height:40,borderRadius:'50%'}} onClick={reset} title="Reset">↺</button>
            <button className="btn primary" style={{width:64,height:52,borderRadius:14,fontSize:20}} onClick={toggle}>{running?'❚❚':'▶'}</button>
            <button className="btn ghost" style={{width:40,height:40,borderRadius:'50%'}} onClick={skip} title="Skip phase">⏭</button>
          </div>
          <div className="row g6" style={{marginTop:16}}>
            {Array.from({length:numDots},(_,i) => {
              const done=(i+1)<round, cur=(i+1)===round&&phase==='work';
              return <div key={i} style={{width:18,height:4,borderRadius:2,background:done?'#c0392b':cur?'rgba(192,57,43,0.45)':'rgba(255,255,255,0.1)',boxShadow:done?'0 0 6px rgba(192,57,43,0.4)':'none'}}/>;
            })}
          </div>
        </div>

        <div className="col g10 of-a" style={{width:280,flexShrink:0}}>
          {/* Cycle builder */}
          <div className="panel p16 col g12">
            <div className="mono t9 c3 uc ls-wide">Work / break cycle</div>
            <DurInput label="Work"       value={workDur}      onChange={v => setDur('workDur',v)}      chips={[25,45,60,90]}/>
            <DurInput label="Break"      value={breakDur}     onChange={v => setDur('breakDur',v)}     chips={[5,10,15]}/>
            <DurInput label="Long break" value={longBreakDur} onChange={v => setDur('longBreakDur',v)} chips={[15,30]}/>
            <div className="col g5">
              <div className="mono t9 c3 uc">Rounds before long break <span style={{fontWeight:400}}>(0 = off)</span></div>
              <div className="row ac g6">
                <div className="field" style={{width:58,flexShrink:0}}>
                  <input type="number" min="0" max="20" value={roundsBeforeLong}
                    onChange={e => setPomState(s=>({...s,roundsBeforeLong:Math.max(0,parseInt(e.target.value)||0)}))}
                    style={{width:'100%',textAlign:'center'}} className="mono t13"/>
                </div>
                <span className="mono t9 c3">rounds</span>
                <div className="row g4">
                  {[2,3,4].map(n => (
                    <button key={n} className={`btn sm ${roundsBeforeLong===n?'primary':'ghost'}`}
                      onClick={() => { playSound('toggle_on'); setPomState(s=>({...s,roundsBeforeLong:n})); }}>{n}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Session panel */}
          <div className="panel p16 col g10">
            <div className="row jb ac">
              <div className="mono t9 c3 uc ls-wide">Session</div>
              <div className="mono" style={{fontSize:8,color:'var(--text-3)',opacity:0.7}}>saved on work end</div>
            </div>
            <div className="col g4">
              <div className="mono t9 c3">Label</div>
              <div className="field">
                <input value={sessionLabel} placeholder="e.g. Physics Homework"
                  onChange={e => setPomState(s=>({...s,sessionLabel:e.target.value}))}/>
              </div>
            </div>
            <div className="col g4">
              <div className="mono t9 c3">Attached task</div>
              <div className="field">
                <input value={attachedTask} placeholder="Link to a task…" list="pom-task-sugg"
                  onChange={e => setPomState(s=>({...s,attachedTask:e.target.value}))}
                  onBlur={e => { if (e.target.value.trim()) playSound('toggle_on'); }}/>
              </div>
              <datalist id="pom-task-sugg">{(taskTitles||[]).map((t,i) => <option key={i} value={t}/>)}</datalist>
            </div>
          </div>

          <div className="panel p14 row jb ac">
            <div className="mono t9 c3">Today</div>
            <div className="mono t11">{completedToday} sessions · {fmtMin(completedToday*workDur*60)} focused</div>
          </div>

          {sessions.length > 0 && (
            <div className="panel p16 col g0 of-a" style={{maxHeight:180}}>
              <div className="mono t9 c3 uc ls-wide" style={{marginBottom:8}}>Session log</div>
              {[...sessions].reverse().slice(0,14).map(s => (
                <div key={s.id} className="row jb as" style={{padding:'6px 0',borderBottom:'1px solid var(--border)',gap:8}}>
                  <div className="col g2 flex1" style={{minWidth:0}}>
                    <div className="row ac g6">
                      <div style={{width:5,height:5,borderRadius:'50%',background:'var(--red-2)',flexShrink:0}}/>
                      <span className="t11 c1" style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.label}</span>
                    </div>
                    {s.attachedTask && <span className="mono t9 c3" style={{paddingLeft:11,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.attachedTask}</span>}
                  </div>
                  <div className="col ae g2" style={{flexShrink:0}}>
                    <div className="row ac g4">
                      <span className="mono t9 c3">{s.durationSecs ? fmtMin(s.durationSecs) : `${s.duration||0}m`}</span>
                      <button className="btn ghost" style={{padding:'0 4px',height:16,fontSize:9,lineHeight:1,opacity:0.6}}
                        title="Post as accomplishment"
                        onClick={() => onPostAccomplishment({title:s.label||'Focus Session',notes:'',timeSecs:s.durationSecs||0,breaks:0,linkedTask:s.attachedTask||'',label:''})}>↗</button>
                    </div>
                    <span className="mono t9 c3">{fmtTs(s.at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// TIMER
// ═════════════════════════════════════════════════════════
function TimerScreen({ sessions, onAddSession, taskTitles, onPostAccomplishment }) {
  const [mode,         setMode]        = useState('countdown');
  const [secs,         setSecs]        = useState(25*60);
  const [elapsed,      setEl]          = useState(0);
  const [running,      setRun]         = useState(false);
  const [preset,       setPre]         = useState(3);
  const [label,        setLabel]       = useState('');
  const [attachedTask, setAttachedTask] = useState('');

  const iRef          = useRef(null);
  const secsRef       = useRef(secs);
  secsRef.current     = secs;
  const labelRef      = useRef(label);
  const attachedRef   = useRef(attachedTask);
  const presetRef     = useRef(preset);
  const addSessRef    = useRef(onAddSession);
  labelRef.current    = label;
  attachedRef.current = attachedTask;
  presetRef.current   = preset;
  addSessRef.current  = onAddSession;

  const PRESETS = [
    {d:'5m',s:300},{d:'10m',s:600},{d:'15m',s:900},{d:'25m',s:1500},
    {d:'45m',s:2700},{d:'1h',s:3600},{d:'2h',s:7200},
  ];

  useEffect(() => {
    if (!running) { clearInterval(iRef.current); return; }
    iRef.current = setInterval(() => {
      if (mode === 'countdown') {
        const cur = secsRef.current, next = Math.max(0, cur-1);
        setSecs(next); secsRef.current = next;
        if (next === 0 && cur > 0) {
          setRun(false);
          playSound('notification');
          addSessRef.current({ id:Date.now(), label:labelRef.current.trim()||'Timer Session',
            attachedTask:attachedRef.current.trim(), durationSecs:PRESETS[presetRef.current].s,
            type:'timer', at:Date.now() });
        }
      } else {
        setEl(e => e+1);
      }
    }, 1000);
    return () => clearInterval(iRef.current);
  }, [running, mode]);

  const applyPreset = i => { playSound('toggle_on'); setPre(i); setSecs(PRESETS[i].s); secsRef.current=PRESETS[i].s; setRun(false); };
  const reset = () => { playSound('button'); setRun(false); if (mode==='countdown') { setSecs(PRESETS[preset].s); secsRef.current=PRESETS[preset].s; } else setEl(0); };
  const logStopwatch = () => {
    if (elapsed===0) return;
    playSound('button');
    onAddSession({ id:Date.now(), label:label.trim()||'Stopwatch Session', attachedTask:attachedTask.trim(),
      durationSecs:elapsed, type:'stopwatch', at:Date.now() });
  };

  const display = mode==='countdown' ? secs : elapsed;

  return (
    <div className="screen">
      <Header eyebrow={mode==='countdown'?'Countdown timer':'Stopwatch · manual pause'} title="Timer"
        actions={
          <div className="seg">
            <button className={`btn sm ${mode==='countdown'?'active red':''}`}
              onClick={() => { playSound('toggle_on'); setMode('countdown'); setRun(false); }}>Timer</button>
            <button className={`btn sm ${mode==='stopwatch'?'active red':''}`}
              onClick={() => { playSound('toggle_on'); setMode('stopwatch'); setRun(false); setEl(0); }}>Stopwatch</button>
          </div>
        }
      />

      <div className="row g24 flex1" style={{minHeight:0}}>
        <div className="panel flex1 col ac jc of-h rel">
          <div className="abs" style={{inset:0,background:'radial-gradient(circle at center,rgba(192,57,43,0.04),transparent 55%)',pointerEvents:'none'}}/>
          <div className="mono t10 c3 uc ls-wide" style={{marginBottom:24,textShadow:'0 1px 4px rgba(0,0,0,0.8)'}}>
            {mode==='countdown'?'◷ Countdown':'⏱ Stopwatch'}
          </div>
          <div className="disp fw3" style={{fontSize:80,lineHeight:1,letterSpacing:'-0.02em',color:'#f5f5f5',textShadow:'0 0 40px rgba(255,255,255,0.07),0 2px 20px rgba(0,0,0,0.7)'}}>
            {fmtH(display)}
          </div>
          {mode==='countdown' && (
            <div className="row g6 ac" style={{marginTop:28,flexWrap:'wrap',justifyContent:'center'}}>
              {PRESETS.map((p,i) => <button key={p.d} className={`btn sm ${i===preset?'primary':''}`} onClick={() => applyPreset(i)}>{p.d}</button>)}
            </div>
          )}
          <div className="row g12 ac" style={{marginTop:32}}>
            <button className="btn ghost" style={{width:42,height:42,borderRadius:'50%'}} onClick={reset}>↺</button>
            <button className="btn primary" style={{width:64,height:52,borderRadius:14,fontSize:20}}
              onClick={() => { playSound('button'); setRun(r => !r); }}>{running?'❚❚':'▶'}</button>
          </div>
          <div className="mono t10 c3 uc" style={{marginTop:28,letterSpacing:'0.2em',textShadow:'0 1px 4px rgba(0,0,0,0.8)'}}>
            {running?'● RUNNING':'● STANDING BY'}
          </div>
        </div>

        <div className="col g10" style={{width:224,flexShrink:0}}>
          <div className="panel p20 col g12">
            <div className="row jb ac">
              <div className="mono t9 c3 uc ls-wide">Session</div>
              <div className="mono" style={{fontSize:8,color:'var(--text-3)',opacity:0.7}}>saved on complete</div>
            </div>
            <div className="col g4">
              <div className="mono t9 c3">Label</div>
              <div className="field">
                <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Label this session…"/>
              </div>
              <div className="row g6 wrap" style={{marginTop:2}}>
                {['Work','Study','Workout','Break','Read'].map(t => (
                  <span key={t} className="tag" style={{cursor:'pointer'}} onClick={() => setLabel(t)}>{t}</span>
                ))}
              </div>
            </div>
            <div className="col g4">
              <div className="mono t9 c3">Attached task</div>
              <div className="field">
                <input value={attachedTask} placeholder="Link to a task…" list="timer-task-sugg"
                  onChange={e => setAttachedTask(e.target.value)}
                  onBlur={e => { if (e.target.value.trim()) playSound('toggle_on'); }}/>
              </div>
              <datalist id="timer-task-sugg">{(taskTitles||[]).map((t,i) => <option key={i} value={t}/>)}</datalist>
            </div>
            {mode==='stopwatch' && elapsed > 0 && (
              <button className="btn sm primary" onClick={logStopwatch}>+ Log session</button>
            )}
          </div>

          {sessions.length > 0 && (
            <div className="panel p16 col g0 of-a" style={{maxHeight:240}}>
              <div className="mono t9 c3 uc ls-wide" style={{marginBottom:8}}>Session log</div>
              {[...sessions].reverse().slice(0,12).map(s => (
                <div key={s.id} className="row jb as" style={{padding:'6px 0',borderBottom:'1px solid var(--border)',gap:8}}>
                  <div className="col g2 flex1" style={{minWidth:0}}>
                    <div className="row ac g6">
                      <div style={{width:5,height:5,borderRadius:'50%',background:'rgba(192,57,43,0.7)',flexShrink:0}}/>
                      <span className="t11 c2" style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.label}</span>
                    </div>
                    {s.attachedTask && <span className="mono t9 c3" style={{paddingLeft:11,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.attachedTask}</span>}
                  </div>
                  <div className="col ae g2" style={{flexShrink:0}}>
                    <div className="row ac g4">
                      <span className="mono t9 c3">{fmtMin(s.durationSecs||s.duration||0)}</span>
                      <button className="btn ghost" style={{padding:'0 4px',height:16,fontSize:9,lineHeight:1,opacity:0.6}}
                        title="Post as accomplishment"
                        onClick={() => onPostAccomplishment({title:s.label||'Timer Session',notes:'',timeSecs:s.durationSecs||0,breaks:0,linkedTask:s.attachedTask||'',label:''})}>↗</button>
                    </div>
                    <span className="mono t9 c3">{fmtTs(s.at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// TASKS
// ═════════════════════════════════════════════════════════
const INIT_COLS = {
  burner:    [
    { id:1, title:'Clear email backlog',        label:'Admin',    est:'20m', priority:'high' },
    { id:2, title:'Reply to messages',          label:'Admin',    est:'15m', priority:'med'  },
  ],
  active:    [
    { id:3, title:'Deep work · project draft',  label:'Work',     est:'2h',  priority:'high' },
    { id:4, title:'Review study notes',          label:'Learning', est:'60m', priority:'high' },
  ],
  completed: [
    { id:5, title:'Morning journal',             label:'Personal', est:'15m', priority:'low'  },
    { id:6, title:'Plan this week',              label:'Planning', est:'20m', priority:'med'  },
  ],
};

const COL_KEYS = ['burner', 'active', 'completed'];
const COL_META = {
  burner:    { label:'Burner',    desc:'Urgent · must-do', accent:'var(--red-2)'  },
  active:    { label:'Active',    desc:'In progress',      accent:'var(--text-2)' },
  completed: { label:'Completed', desc:'Done',             accent:'var(--text-3)' },
};
const PRIO_STYLE = {
  high: { bg:'rgba(192,57,43,0.12)', bd:'rgba(192,57,43,0.38)', c:'#e8a0a0' },
  med:  { bg:'rgba(255,255,255,0.06)', bd:'rgba(255,255,255,0.16)', c:'var(--text-2)' },
  low:  { bg:'rgba(255,255,255,0.03)', bd:'rgba(255,255,255,0.1)',  c:'var(--text-3)' },
};

function TaskModal({ mode, initial, onSave, onCancel }) {
  const [title,    setTitle]    = useState(initial?.title    || '');
  const [col,      setCol]      = useState(initial?.col      || 'burner');
  const [label,    setLabel]    = useState(initial?.label    || '');
  const [est,      setEst]      = useState(initial?.est      || '');
  const [priority, setPriority] = useState(initial?.priority || 'med');
  const isEdit = mode === 'edit';

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onCancel]);

  const handleSave = () => { if (!title.trim()) return; onSave({title:title.trim(),col,label,est,priority}); };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{isEdit?'Edit Task':'New Task'}</span>
          <button className="btn ghost sm" style={{width:28,height:28,padding:0,fontSize:16,lineHeight:1}} onClick={onCancel}>×</button>
        </div>
        <div className="modal-body">
          <div className="col g5">
            <div className="mono t9 c3 uc">Task title</div>
            <div className="field"><input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => { if(e.key==='Enter') handleSave(); }} placeholder="What needs to be done?" autoFocus/></div>
          </div>
          <div className="col g5">
            <div className="mono t9 c3 uc">Column</div>
            <div className="seg">{COL_KEYS.map(k => (<button key={k} className={`btn sm ${col===k?('active'+(k==='burner'?' red':'')):''}`} onClick={() => setCol(k)}>{COL_META[k].label}</button>))}</div>
          </div>
          <div className="row g12">
            <div className="col g5 flex1">
              <div className="mono t9 c3 uc">Label / category</div>
              <div className="field"><input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Work, Personal…"/></div>
            </div>
            <div className="col g5" style={{width:108,flexShrink:0}}>
              <div className="mono t9 c3 uc">Est. time</div>
              <div className="field"><input value={est} onChange={e => setEst(e.target.value)} placeholder="30m, 1h…"/></div>
            </div>
          </div>
          <div className="col g5">
            <div className="mono t9 c3 uc">Priority</div>
            <div className="seg">{[['low','Low'],['med','Medium'],['high','High']].map(([v,l]) => (<button key={v} className={`btn sm ${priority===v?('active'+(v==='high'?' red':'')):''}`} onClick={() => setPriority(v)}>{l}</button>))}</div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button className="btn primary" onClick={handleSave} disabled={!title.trim()}>{isEdit?'Save Changes':'Save Task'}</button>
        </div>
      </div>
    </div>
  );
}

function Tasks({ cols, setCols, focusData, accomplishmentMap }) {
  const [modal,    setModal]    = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const openAddModal  = () => { playSound('button'); setModal({mode:'add'}); };
  const openEditModal = (col, task) => { playSound('button'); setModal({mode:'edit',col,task}); };
  const closeModal    = () => { playSound('button'); setModal(null); };

  const saveTask = ({title,col:tc,label,est,priority}) => {
    if (modal.mode==='add') {
      setCols(c => ({...c,[tc]:[{id:Date.now(),title,label,est,priority},...c[tc]]}));
      playSound('button');
    } else {
      const {col:fc,task} = modal;
      const updated = {...task,title,label,est,priority};
      if (fc!==tc) { playSound('toggle_on'); setCols(c => ({...c,[fc]:c[fc].filter(t=>t.id!==task.id),[tc]:[updated,...c[tc]]})); }
      else { playSound('button'); setCols(c => ({...c,[fc]:c[fc].map(t=>t.id===task.id?updated:t)})); }
    }
    setModal(null);
  };

  const moveTask = (fc,id,tc) => {
    if (fc===tc) return;
    playSound('toggle_on');
    const task = cols[fc].find(t=>t.id===id);
    setCols(c => ({...c,[fc]:c[fc].filter(t=>t.id!==id),[tc]:[task,...c[tc]]}));
  };
  const deleteTask = (col,id) => { playSound('button'); setCols(c => ({...c,[col]:c[col].filter(t=>t.id!==id)})); };

  const handleDragStart = (e,col,id) => {
    setDragging({col,id}); e.dataTransfer.effectAllowed='move';
    const el=e.currentTarget, rect=el.getBoundingClientRect();
    const ghost=el.cloneNode(true);
    Object.assign(ghost.style,{position:'fixed',top:'-9999px',left:'-9999px',width:`${rect.width}px`,transform:'rotate(3deg) scale(1.04)',opacity:'0.92',pointerEvents:'none',background:'rgba(12,12,12,0.96)',border:'1px solid rgba(192,57,43,0.4)',borderRadius:'8px',padding:'12px 14px'});
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost,rect.width/2,30);
    requestAnimationFrame(() => ghost.parentNode && document.body.removeChild(ghost));
  };
  const handleDragEnd   = () => { setDragging(null); setDragOver(null); };
  const handleDragOver  = (e,col) => { e.preventDefault(); e.dataTransfer.dropEffect='move'; setDragOver(col); };
  const handleDragLeave = e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null); };
  const handleDrop      = (e,tc) => { e.preventDefault(); if (dragging) moveTask(dragging.col,dragging.id,tc); setDragging(null); setDragOver(null); };

  const openCount = cols.burner.length + cols.active.length;

  return (
    <div className="screen">
      <Header eyebrow={`${openCount} open · ${cols.completed.length} done`} title="Tasks"
        actions={<button className="btn primary" onClick={openAddModal}>+ New Task</button>}/>
      <div className="row g12 flex1" style={{minHeight:0}}>
        {COL_KEYS.map((col,ci) => {
          const {label,desc,accent} = COL_META[col];
          const tasks=cols[col], isTarget=dragOver===col, isDimmed=col==='completed';
          return (
            <div key={col} className={`task-col panel flex1 p16 col g10 of-a${isTarget?' drop-target':''}`}
              onDragOver={e => handleDragOver(e,col)} onDragLeave={handleDragLeave} onDrop={e => handleDrop(e,col)}>
              <div style={{flexShrink:0}}>
                <div className="row jb ac">
                  <div className="mono t9 uc ls-wide" style={{color:accent}}>{label}</div>
                  <div className="mono t9 c3">{tasks.length}</div>
                </div>
                <div className="mono t9 c3" style={{marginTop:2}}>{desc}</div>
              </div>
              <div className="divider" style={{flexShrink:0}}/>
              {tasks.length===0 && <div className="mono t10 c3 tc" style={{padding:'12px 0',opacity:0.45}}>{isTarget?'↓ drop here':'—'}</div>}
              {tasks.map(task => {
                const ps=PRIO_STYLE[task.priority]||PRIO_STYLE.med, isDrag=dragging?.id===task.id;
                const focusKey=task.title.toLowerCase().trim();
                const focus=focusData?.[focusKey], acc=accomplishmentMap?.[focusKey];
                return (
                  <div key={task.id} className={`task-card${isDrag?' is-dragging':''}${isDimmed?' dimmed':''}`}
                    draggable onDragStart={e => handleDragStart(e,col,task.id)} onDragEnd={handleDragEnd}>
                    <div style={{fontSize:13,fontWeight:500,lineHeight:1.4,color:isDimmed?'rgba(255,255,255,0.42)':'var(--text)',textDecoration:isDimmed?'line-through':'none'}}>{task.title}</div>
                    <div className="row ac g5 wrap" style={{marginTop:8}}>
                      {task.label && <span className="tag">{task.label}</span>}
                      {task.est && <span className="mono t9 c2">⏱ {task.est}</span>}
                      <span className="tag" style={{background:ps.bg,borderColor:ps.bd,color:ps.c}}>{task.priority}</span>
                    </div>
                    {focus && <div className="row ac g5" style={{marginTop:5}}><span style={{fontSize:8,color:'rgba(192,57,43,0.6)',lineHeight:1}}>◎</span><span className="mono t9 c3">{focus.count} session{focus.count!==1?'s':''} · {fmtMin(focus.totalSecs)}</span></div>}
                    {acc && <div className="row ac g5" style={{marginTop:3}}><span style={{fontSize:8,color:'rgba(74,200,128,0.55)',lineHeight:1}}>✓</span><span className="mono t9 c3">{acc.count} done{acc.totalSecs>0?` · ${fmtMin(acc.totalSecs)}`:''}</span></div>}
                    <div className="row ac g4" style={{marginTop:10}}>
                      {ci>0 && <button className="btn sm ghost" style={{padding:'0 7px'}} onClick={() => moveTask(col,task.id,COL_KEYS[ci-1])}>←</button>}
                      {ci<2 && <button className="btn sm ghost" style={{padding:'0 7px'}} onClick={() => moveTask(col,task.id,COL_KEYS[ci+1])}>→</button>}
                      <span style={{flex:1}}/>
                      <button className="btn sm ghost" style={{padding:'0 8px',fontSize:13,color:'var(--text-3)'}} title="Edit" onClick={() => openEditModal(col,task)}>✎</button>
                      <button className="btn sm ghost" style={{padding:'0 7px',color:'var(--text-3)'}} onClick={() => deleteTask(col,task.id)}>×</button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      {modal && <TaskModal mode={modal.mode} initial={modal.task?{...modal.task,col:modal.col}:null} onSave={saveTask} onCancel={closeModal}/>}
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// ACCOMPLISHMENTS
// ═════════════════════════════════════════════════════════

function AccomplishmentModal({ mode, initial, taskTitles, taskCols, onSave, onCancel }) {
  const isEdit = mode === 'edit';
  const initSecs = initial?.timeSecs || 0;

  const [title,         setTitle]         = useState(initial?.title      || '');
  const [notes,         setNotes]         = useState(initial?.notes      || '');
  const [hours,         setHours]         = useState(Math.floor(initSecs / 3600));
  const [mins,          setMins]          = useState(Math.floor((initSecs % 3600) / 60));
  const [breaks,        setBreaks]        = useState(initial?.breaks     ?? 0);
  const [linkedTask,    setLinkedTask]    = useState(initial?.linkedTask || '');
  const [label,         setLabel]         = useState(initial?.label      || '');
  const [completedAt,   setCompletedAt]   = useState(() => {
    const ts = initial?.completedAt || Date.now();
    const d = new Date(ts); d.setSeconds(0,0);
    return d.toISOString().slice(0,16);
  });
  const [attachments,   setAttachments]   = useState(initial?.attachments || []);
  const [moveToComp,    setMoveToComp]    = useState(false);
  const [fileKey,       setFileKey]       = useState(0);

  const taskInNonDone = taskCols
    ? [...(taskCols.burner||[]), ...(taskCols.active||[])].some(t => t.title.toLowerCase() === linkedTask.toLowerCase().trim())
    : false;

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onCancel]);

  const handleFileChange = async e => {
    const file = e.target.files[0];
    if (!file || attachments.length >= 5) return;
    const kind = file.type.startsWith('image/') ? 'image' : file.type==='application/pdf' ? 'pdf' : 'other';
    let dataUrl = null;
    try { if (kind==='image') dataUrl = await readFileAsDataURL(file); } catch(_) {}
    const objUrl = URL.createObjectURL(file);
    setAttachments(prev => [...prev, { id:Date.now(), name:file.name, mimeType:file.type, kind, dataUrl, objUrl }]);
    setFileKey(k => k+1);
  };

  const removeAttachment = id => {
    setAttachments(prev => {
      const a = prev.find(x => x.id===id);
      if (a?.objUrl) URL.revokeObjectURL(a.objUrl);
      return prev.filter(x => x.id!==id);
    });
  };

  const handleSave = () => {
    if (!title.trim()) return;
    const timeSecs = (parseInt(hours)||0)*3600 + (parseInt(mins)||0)*60;
    onSave({
      title:title.trim(), notes:notes.trim(), timeSecs,
      breaks:parseInt(breaks)||0, linkedTask:linkedTask.trim(),
      label:label.trim(), completedAt:new Date(completedAt).getTime()||Date.now(),
      attachments,
    }, moveToComp && taskInNonDone);
  };

  const taStyle = { background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', color:'var(--text)', fontSize:12.5, fontFamily:'inherit', padding:'8px 12px', resize:'vertical', minHeight:56, outline:'none', lineHeight:1.5, width:'100%', transition:'border-color 0.18s' };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-box" style={{width:'min(560px,95vw)'}} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{isEdit?'Edit Accomplishment':'New Accomplishment'}</span>
          <button className="btn ghost sm" style={{width:28,height:28,padding:0,fontSize:16,lineHeight:1}} onClick={onCancel}>×</button>
        </div>

        <div className="modal-body" style={{maxHeight:'calc(80vh - 120px)',overflowY:'auto',gap:14}}>
          <div className="col g5">
            <div className="mono t9 c3 uc">What was completed</div>
            <div className="field"><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Finished Physics Homework" autoFocus/></div>
          </div>

          <div className="col g5">
            <div className="mono t9 c3 uc">Notes</div>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Optional notes…" style={taStyle}
              onFocus={e=>e.target.style.borderColor='var(--border-2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/>
          </div>

          <div className="row g12">
            <div className="col g5 flex1">
              <div className="mono t9 c3 uc">Time spent</div>
              <div className="row ac g6">
                <div className="field" style={{width:62,flexShrink:0}}>
                  <input type="number" min="0" max="99" value={hours} onChange={e=>setHours(Math.max(0,parseInt(e.target.value)||0))} style={{width:'100%',textAlign:'center'}} className="mono t13"/>
                </div>
                <span className="mono t9 c3">h</span>
                <div className="field" style={{width:62,flexShrink:0}}>
                  <input type="number" min="0" max="59" value={mins} onChange={e=>setMins(Math.max(0,Math.min(59,parseInt(e.target.value)||0)))} style={{width:'100%',textAlign:'center'}} className="mono t13"/>
                </div>
                <span className="mono t9 c3">m</span>
              </div>
            </div>
            <div className="col g5" style={{width:90,flexShrink:0}}>
              <div className="mono t9 c3 uc">Breaks</div>
              <div className="field">
                <input type="number" min="0" max="99" value={breaks} onChange={e=>setBreaks(Math.max(0,parseInt(e.target.value)||0))} style={{width:'100%',textAlign:'center'}} className="mono t13"/>
              </div>
            </div>
          </div>

          <div className="row g12">
            <div className="col g5 flex1">
              <div className="mono t9 c3 uc">Label</div>
              <div className="field"><input value={label} onChange={e=>setLabel(e.target.value)} placeholder="e.g. Work, Study…"/></div>
            </div>
            <div className="col g5 flex1">
              <div className="mono t9 c3 uc">Linked task</div>
              <div className="field"><input value={linkedTask} onChange={e=>setLinkedTask(e.target.value)} list="acc-task-sugg" placeholder="Task name…"/></div>
              <datalist id="acc-task-sugg">{(taskTitles||[]).map((t,i) => <option key={i} value={t}/>)}</datalist>
            </div>
          </div>

          {linkedTask.trim() && taskInNonDone && (
            <label className="row ac g8" style={{cursor:'pointer'}}>
              <input type="checkbox" checked={moveToComp} onChange={e=>setMoveToComp(e.target.checked)} style={{accentColor:'var(--red-2)'}}/>
              <span className="mono t10 c2">Move "{linkedTask}" to Completed</span>
            </label>
          )}

          <div className="col g5">
            <div className="mono t9 c3 uc">Completed at</div>
            <div className="field"><input type="datetime-local" value={completedAt} onChange={e=>setCompletedAt(e.target.value)} style={{colorScheme:'dark'}}/></div>
          </div>

          <div className="col g8">
            <div className="row jb ac">
              <div className="mono t9 c3 uc">Proof of work</div>
              {attachments.length < 5 && (
                <>
                  <label htmlFor="acc-file-input" className="btn sm ghost" style={{cursor:'pointer'}}>+ Attach</label>
                  <input key={fileKey} id="acc-file-input" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" style={{display:'none'}} onChange={handleFileChange}/>
                </>
              )}
            </div>
            {attachments.length === 0
              ? <div className="mono t9 c3" style={{opacity:0.5}}>Screenshots, PDFs, or images as proof of work. Up to 5 files.</div>
              : <div className="col g6">
                  {attachments.map(att => (
                    <div key={att.id} className="row ac g8 jb" style={{background:'rgba(255,255,255,0.03)',border:'1px solid var(--border)',borderRadius:6,padding:'7px 10px'}}>
                      <div className="row ac g8 flex1" style={{minWidth:0}}>
                        {att.kind==='image' && att.dataUrl
                          ? <img src={att.dataUrl} alt="" style={{width:36,height:28,objectFit:'cover',borderRadius:3,flexShrink:0}}/>
                          : <div style={{width:36,height:28,borderRadius:3,background:'rgba(192,57,43,0.1)',border:'1px solid rgba(192,57,43,0.25)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                              <span className="mono" style={{fontSize:7,color:'#e8a0a0'}}>{att.kind==='pdf'?'PDF':att.name.split('.').pop().toUpperCase()}</span>
                            </div>
                        }
                        <div className="col g1 flex1" style={{minWidth:0}}>
                          <span className="t11 c2" style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{att.name}</span>
                          <span className="mono t9 c3">{att.kind}</span>
                        </div>
                      </div>
                      <button className="btn sm ghost" style={{padding:'0 6px',color:'var(--text-3)',flexShrink:0}} onClick={() => removeAttachment(att.id)}>×</button>
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button className="btn primary" onClick={handleSave} disabled={!title.trim()}>
            {isEdit ? 'Save Changes' : 'Log Accomplishment'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AccomplishmentCard({ acc, onEdit, onDelete }) {
  const [preview, setPreview] = useState(null);
  const d = new Date(acc.completedAt||Date.now());
  const dateStr = d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});

  return (
    <div className="panel p16 col g10">
      <div className="row jb as" style={{gap:12}}>
        <div className="col g3 flex1" style={{minWidth:0}}>
          <div style={{fontSize:14,fontWeight:500,color:'var(--text)',lineHeight:1.4}}>{acc.title}</div>
          {acc.notes && <div className="t12 c2" style={{lineHeight:1.55,marginTop:3}}>{acc.notes}</div>}
        </div>
        <div className="row ac g5" style={{flexShrink:0}}>
          <button className="btn sm ghost" style={{padding:'0 8px',fontSize:13}} onClick={onEdit} title="Edit">✎</button>
          <button className="btn sm ghost" style={{padding:'0 7px',color:'var(--text-3)'}} onClick={onDelete} title="Delete">×</button>
        </div>
      </div>

      <div className="row ac g5 wrap">
        {acc.label && <span className="tag">{acc.label}</span>}
        {(acc.timeSecs||0) > 0 && (
          <span className="tag" style={{background:'rgba(56,180,248,0.08)',borderColor:'rgba(56,180,248,0.22)',color:'#8bd'}}>⏱ {fmtMin(acc.timeSecs)}</span>
        )}
        <span className="tag">{(acc.breaks||0) === 1 ? '1 break' : `${acc.breaks||0} breaks`}</span>
        {acc.linkedTask && (
          <span className="tag" style={{background:'rgba(192,57,43,0.08)',borderColor:'rgba(192,57,43,0.25)',color:'rgba(224,80,80,0.85)'}}>↗ {acc.linkedTask}</span>
        )}
      </div>

      {acc.attachments && acc.attachments.length > 0 && (
        <div className="row ac g8 wrap">
          {acc.attachments.map(att => (
            <div key={att.id} title={att.name}
              onClick={() => {
                if (att.kind==='image' && att.dataUrl) setPreview(att);
                else if (att.objUrl) window.open(att.objUrl,'_blank');
              }}
              style={{width:52,height:38,borderRadius:5,overflow:'hidden',border:'1px solid var(--border)',cursor:'pointer',flexShrink:0,background:att.kind==='image'&&att.dataUrl?'transparent':'rgba(192,57,43,0.08)',display:'flex',alignItems:'center',justifyContent:'center',transition:'border-color 0.15s'}}
              onMouseEnter={e=>e.currentTarget.style.borderColor='var(--border-2)'}
              onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
              {att.kind==='image' && att.dataUrl
                ? <img src={att.dataUrl} alt={att.name} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
                : <span className="mono" style={{fontSize:7,color:'#e8a0a0'}}>{att.kind==='pdf'?'PDF':att.name.split('.').pop().toUpperCase()}</span>
              }
            </div>
          ))}
          <span className="mono t9 c3">{acc.attachments.length} attachment{acc.attachments.length!==1?'s':''}</span>
        </div>
      )}

      <div className="mono t9 c3">{dateStr} · {fmtTs(acc.completedAt||Date.now())}</div>

      {preview && (
        <div className="modal-backdrop" style={{zIndex:2000}} onClick={() => setPreview(null)}>
          <div style={{position:'relative'}} onClick={e => e.stopPropagation()}>
            <img src={preview.dataUrl} alt={preview.name}
              style={{maxWidth:'min(900px,90vw)',maxHeight:'85vh',objectFit:'contain',display:'block',borderRadius:8}}/>
            <button className="btn ghost" style={{position:'absolute',top:8,right:8,width:32,height:32,padding:0,fontSize:18,background:'rgba(0,0,0,0.6)'}} onClick={() => setPreview(null)}>×</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Accomplishments({ accomplishments, setAccomplishments, onOpenModal }) {
  const totalTime   = accomplishments.reduce((s,a) => s+(a.timeSecs||0), 0);
  const totalBreaks = accomplishments.reduce((s,a) => s+(a.breaks||0), 0);

  const handleDelete = id => {
    playSound('button');
    setAccomplishments(prev => prev.filter(a => a.id!==id));
  };

  return (
    <div className="screen">
      <Header
        eyebrow="Completed work, logged clearly"
        title="Accomplishments"
        actions={<button className="btn primary" onClick={() => onOpenModal(null)}>+ New</button>}
      />

      {accomplishments.length > 0 && (
        <div className="row g10" style={{flexShrink:0}}>
          {[
            {k:'Logged',  v: accomplishments.length},
            {k:'Time',    v: totalTime>0?fmtMin(totalTime):'—'},
            {k:'Breaks',  v: totalBreaks},
          ].map(({k,v}) => (
            <div key={k} className="panel p14 flex1 col ac" style={{textAlign:'center'}}>
              <div className="mono t9 c3 uc" style={{marginBottom:5}}>{k}</div>
              <div className="disp fw5" style={{fontSize:22,color:'var(--text)',lineHeight:1}}>{v}</div>
            </div>
          ))}
        </div>
      )}

      <div className="col g10 of-a flex1">
        {accomplishments.length === 0
          ? <div className="panel p24 col ac jc flex1" style={{textAlign:'center',minHeight:120}}>
              <div className="mono t9 c3 uc ls-wide" style={{marginBottom:8}}>Nothing logged yet</div>
              <div className="t12 c3">Use "+ New" to record what you completed.</div>
            </div>
          : [...accomplishments].reverse().map(a => (
              <AccomplishmentCard key={a.id} acc={a}
                onEdit={() => onOpenModal(a)}
                onDelete={() => handleDelete(a.id)}/>
            ))
        }
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// CALENDAR — Event Modal
// ═════════════════════════════════════════════════════════
function EventModal({ mode, initial, onSave, onDelete, onCancel }) {
  const isEdit = mode === 'edit';
  const [title,      setTitle]      = useState(initial?.title      || '');
  const [date,       setDate]       = useState(initial?.date        || calDateStr(new Date()));
  const [startTime,  setStartTime]  = useState(initial?.startTime   || '09:00');
  const [endTime,    setEndTime]    = useState(initial?.endTime     || '10:00');
  const [color,      setColor]      = useState(initial?.color       || 'crimson');
  const [tag,        setTag]        = useState(initial?.tag         || '');
  const [notes,      setNotes]      = useState(initial?.notes       || '');
  const [recurrence, setRecurrence] = useState(initial?.recurrence  || 'none');

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onCancel]);

  const handleSave = () => {
    if (!title.trim()) return;
    playSound('button');
    onSave({ id: initial?.id || Date.now(), title: title.trim(), date, startTime, endTime, color, tag: tag.trim(), notes: notes.trim(), recurrence });
  };

  const taStyle = { background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', color:'var(--text)', fontSize:12.5, fontFamily:'inherit', padding:'8px 12px', resize:'vertical', minHeight:52, outline:'none', lineHeight:1.5, width:'100%', transition:'border-color 0.18s' };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{isEdit ? 'Edit Event' : 'New Event'}</span>
          <button className="btn ghost sm" style={{width:28,height:28,padding:0,fontSize:16,lineHeight:1}} onClick={onCancel}>×</button>
        </div>

        <div className="modal-body" style={{maxHeight:'calc(80vh - 120px)',overflowY:'auto'}}>
          {/* Title */}
          <div className="col g5">
            <div className="mono t9 c3 uc">Title</div>
            <div className="field">
              <input value={title} onChange={e => setTitle(e.target.value)}
                onKeyDown={e => { if (e.key==='Enter' && title.trim()) handleSave(); }}
                placeholder="Event title…" autoFocus/>
            </div>
          </div>

          {/* Date · Start · End */}
          <div className="row g10 wrap">
            <div className="col g5 flex1" style={{minWidth:120}}>
              <div className="mono t9 c3 uc">Date</div>
              <div className="field">
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{colorScheme:'dark',width:'100%'}}/>
              </div>
            </div>
            <div className="col g5" style={{width:88,flexShrink:0}}>
              <div className="mono t9 c3 uc">Start</div>
              <div className="field">
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{colorScheme:'dark',width:'100%'}}/>
              </div>
            </div>
            <div className="col g5" style={{width:88,flexShrink:0}}>
              <div className="mono t9 c3 uc">End</div>
              <div className="field">
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{colorScheme:'dark',width:'100%'}}/>
              </div>
            </div>
          </div>

          {/* Color */}
          <div className="col g6">
            <div className="mono t9 c3 uc">Color</div>
            <div className="cal-color-strip">
              {CAL_COLORS.map(c => (
                <div key={c.id} className={`cal-swatch ${color===c.id?'sel':''}`}
                  title={c.label} style={{background:c.hex}} onClick={() => setColor(c.id)}/>
              ))}
            </div>
          </div>

          {/* Tag */}
          <div className="col g5">
            <div className="mono t9 c3 uc">Tag / category</div>
            <div className="field">
              <input value={tag} onChange={e => setTag(e.target.value)} placeholder="Work, Personal…"/>
            </div>
          </div>

          {/* Recurrence */}
          <div className="col g5">
            <div className="mono t9 c3 uc">Recurrence</div>
            <div className="seg" style={{width:'100%'}}>
              {CAL_RECUR.map(r => (
                <button key={r.id} className={`btn sm flex1 ${recurrence===r.id?'active':''}`}
                  onClick={() => setRecurrence(r.id)}>{r.label}</button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="col g5">
            <div className="mono t9 c3 uc">Notes</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes…" style={taStyle}
              onFocus={e=>e.target.style.borderColor='var(--border-2)'}
              onBlur={e=>e.target.style.borderColor='var(--border)'}/>
          </div>
        </div>

        <div className="modal-footer">
          {isEdit
            ? <button className="btn ghost sm"
                style={{color:'var(--red-2)',borderColor:'rgba(192,57,43,0.3)'}}
                onClick={() => { playSound('button'); onDelete(); }}>Delete</button>
            : <span/>
          }
          <div className="row g8">
            <button className="btn ghost" onClick={onCancel}>Cancel</button>
            <button className="btn primary" onClick={handleSave} disabled={!title.trim()}>
              {isEdit ? 'Save Changes' : 'Save Event'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar Import Modal ────────────────────────────────
function ImportCalModal({ onImport, onCancel }) {
  const [parsed,   setParsed]   = useState(null);
  const [errors,   setErrors]   = useState([]);
  const [mode,     setMode]     = useState('add');
  const [showHelp, setShowHelp] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onCancel]);

  const processText = text => {
    let raw;
    try { raw = JSON.parse(text); }
    catch(e) {
      try { raw = parseImportCSV(text); }
      catch(e2) { setErrors(['Could not parse file — check format.']); return; }
    }
    if (!Array.isArray(raw) || raw.length === 0) { setErrors(['Expected a non-empty array of events.']); return; }
    const valid = [], errs = [];
    const now = Date.now();
    raw.forEach((r,i) => {
      if (!r.title || !r.date || !r.startTime || !r.endTime) {
        errs.push(`Row ${i+1}: title, date, startTime, endTime are required.`);
      } else {
        valid.push({
          id:         now + i,
          title:      String(r.title).trim(),
          date:       String(r.date).trim(),
          startTime:  String(r.startTime).trim(),
          endTime:    String(r.endTime).trim(),
          color:      String(r.color || 'crimson').trim(),
          tag:        String(r.tag || '').trim(),
          notes:      String(r.notes || '').trim(),
          recurrence: ['none','daily','weekly','weekdays'].includes(r.recurrence) ? r.recurrence : 'none',
          createdAt:  now, updatedAt: now,
        });
      }
    });
    setErrors(errs);
    setParsed(valid.length > 0 ? valid : null);
  };

  const loadFile = f => { if (!f) return; const r=new FileReader(); r.onload=e=>processText(e.target.result); r.readAsText(f); };

  return (
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onCancel()}>
      <div className="modal-box" style={{width:'min(540px,94vw)'}}>
        <div className="modal-header">
          <div className="modal-title">Import Calendar Events</div>
          <button className="btn ghost sm" style={{width:26,height:26,padding:0,fontSize:16,lineHeight:1}} onClick={onCancel}>×</button>
        </div>
        <div className="modal-body" style={{maxHeight:'70vh',overflowY:'auto',gap:16}}>

          <div className="import-drop-zone"
            onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();loadFile(e.dataTransfer.files[0]);}}
            onClick={()=>fileRef.current?.click()}>
            <input ref={fileRef} type="file" accept=".json,.csv,.txt" style={{display:'none'}} onChange={e=>loadFile(e.target.files[0])}/>
            <div className="mono t10 c3" style={{marginBottom:4}}>Drop a .json or .csv file here</div>
            <div className="mono t9 c3">or click to browse</div>
          </div>

          {errors.length > 0 && (
            <div className="col g4" style={{padding:'10px 12px',background:'rgba(192,57,43,0.08)',border:'1px solid rgba(192,57,43,0.3)',borderRadius:'var(--radius-sm)'}}>
              {errors.map((e,i) => <div key={i} className="mono t10" style={{color:'var(--red-2)'}}>{e}</div>)}
            </div>
          )}

          {parsed && (
            <div className="col g10">
              <div className="mono t9 c3 uc ls-wide">{parsed.length} event{parsed.length!==1?'s':''} ready to import</div>
              <div className="col g4" style={{maxHeight:180,overflowY:'auto'}}>
                {parsed.map((ev,i) => (
                  <div key={i} className="row ac g10" style={{padding:'6px 10px',background:'var(--surface)',borderRadius:6,border:'1px solid var(--border)'}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:calColorHex(ev.color),flexShrink:0}}/>
                    <div className="col flex1 g1">
                      <div className="t11 fw5">{ev.title}</div>
                      <div className="mono t9 c3">{ev.date} · {ev.startTime}–{ev.endTime}{ev.tag?` · ${ev.tag}`:''}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="col g6">
                <div className="mono t9 c3 uc ls-wide">Import mode</div>
                <div className="seg">
                  <button className={`btn sm ${mode==='add'?'active':''}`} onClick={()=>setMode('add')}>Add to existing</button>
                  <button className={`btn sm ${mode==='replace'?'active':''}`} onClick={()=>setMode('replace')}>Replace all</button>
                </div>
                {mode==='replace' && <div className="mono t9" style={{color:'var(--red-2)'}}>⚠ Deletes all existing events.</div>}
              </div>
            </div>
          )}

          <div className="col g6">
            <button className="btn ghost sm" style={{alignSelf:'flex-start'}} onClick={()=>setShowHelp(v=>!v)}>
              {showHelp?'▾':'▸'} Format Help
            </button>
            {showHelp && (
              <div className="col g10" style={{padding:'10px 12px',background:'var(--surface)',borderRadius:'var(--radius-sm)',border:'1px solid var(--border)'}}>
                <div className="mono t9 c3 uc">JSON format</div>
                <pre className="mono t9 c2" style={{whiteSpace:'pre-wrap',lineHeight:1.6}}>{`[
  {
    "title": "Physics Lecture",
    "date": "2026-04-27",
    "startTime": "09:00",
    "endTime": "10:15",
    "color": "crimson",
    "tag": "School",
    "notes": "Room 204",
    "recurrence": "none"
  }
]`}</pre>
                <div className="mono t9 c3 uc" style={{marginTop:4}}>CSV headers</div>
                <pre className="mono t9 c2">title,date,startTime,endTime,color,tag,notes,recurrence</pre>
                <div className="t10 c3" style={{lineHeight:1.6,marginTop:4}}>
                  Ask ChatGPT or Gemini to create a schedule in this JSON format.
                  recurrence: none · daily · weekly · weekdays.
                  color: crimson · cobalt · teal · amber · sage · violet · or any hex (#c0392b).
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button className="btn primary lg" disabled={!parsed} onClick={()=>{playSound('button');onImport(parsed,mode);}}>
            Import {parsed?`${parsed.length} Event${parsed.length!==1?'s':''}`:' Events'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Habit Import Modal ───────────────────────────────────
function ImportHabitModal({ onImport, onCancel }) {
  const [parsed,   setParsed]   = useState(null);
  const [errors,   setErrors]   = useState([]);
  const [mode,     setMode]     = useState('add');
  const [showHelp, setShowHelp] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onCancel]);

  const processText = text => {
    let raw;
    try { raw = JSON.parse(text); }
    catch(e) {
      try { raw = parseImportCSV(text); }
      catch(e2) { setErrors(['Could not parse file.']); return; }
    }
    if (!Array.isArray(raw) || raw.length === 0) { setErrors(['Expected a non-empty array of habits.']); return; }
    const valid = [], errs = [];
    const now = Date.now();
    raw.forEach((r,i) => {
      if (!r.name || !String(r.name).trim()) { errs.push(`Row ${i+1}: name is required.`); return; }
      const freq = ['daily','weekdays','specific','weekly'].includes(r.frequency) ? r.frequency : 'daily';
      const type = ['binary','quantity','duration','abstinence'].includes(r.type) ? r.type : 'binary';
      valid.push({
        id: now+i, name: String(r.name).trim(), description: String(r.description||'').trim(),
        type, frequency: freq, specificDays: [], weeklyCount: r.weeklyCount ? Number(r.weeklyCount) : 3,
        targetValue: r.targetValue ? Number(r.targetValue) : 0,
        unit: String(r.unit||'').trim(),
        targetMinutes: r.targetMinutes ? Number(r.targetMinutes) : 0,
        category: String(r.category||'').trim(),
        color: String(r.color||'crimson').trim(),
        reminderTime: '', notesTemplate: '', archived: false, lastOccurrence: null,
        createdAt: now, updatedAt: now,
      });
    });
    setErrors(errs);
    setParsed(valid.length > 0 ? valid : null);
  };

  const loadFile = f => { if (!f) return; const r=new FileReader(); r.onload=e=>processText(e.target.result); r.readAsText(f); };

  return (
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onCancel()}>
      <div className="modal-box" style={{width:'min(540px,94vw)'}}>
        <div className="modal-header">
          <div className="modal-title">Import Habits</div>
          <button className="btn ghost sm" style={{width:26,height:26,padding:0,fontSize:16,lineHeight:1}} onClick={onCancel}>×</button>
        </div>
        <div className="modal-body" style={{maxHeight:'70vh',overflowY:'auto',gap:16}}>

          <div className="import-drop-zone"
            onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();loadFile(e.dataTransfer.files[0]);}}
            onClick={()=>fileRef.current?.click()}>
            <input ref={fileRef} type="file" accept=".json,.csv,.txt" style={{display:'none'}} onChange={e=>loadFile(e.target.files[0])}/>
            <div className="mono t10 c3" style={{marginBottom:4}}>Drop a .json or .csv file</div>
            <div className="mono t9 c3">or click to browse</div>
          </div>

          {errors.length > 0 && (
            <div className="col g4" style={{padding:'10px 12px',background:'rgba(192,57,43,0.08)',border:'1px solid rgba(192,57,43,0.3)',borderRadius:'var(--radius-sm)'}}>
              {errors.map((e,i) => <div key={i} className="mono t10" style={{color:'var(--red-2)'}}>{e}</div>)}
            </div>
          )}

          {parsed && (
            <div className="col g10">
              <div className="mono t9 c3 uc ls-wide">{parsed.length} habit{parsed.length!==1?'s':''} ready</div>
              <div className="col g4" style={{maxHeight:180,overflowY:'auto'}}>
                {parsed.map((h,i) => (
                  <div key={i} className="row ac g10" style={{padding:'6px 10px',background:'var(--surface)',borderRadius:6,border:'1px solid var(--border)'}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:habitColorHex(h.color),flexShrink:0}}/>
                    <div className="col flex1 g1">
                      <div className="t11 fw5">{h.name}</div>
                      <div className="mono t9 c3">{(HABIT_TYPES.find(t=>t.id===h.type)||HABIT_TYPES[0]).label} · {(HABIT_FREQ.find(f=>f.id===h.frequency)||HABIT_FREQ[0]).label}{h.category?` · ${h.category}`:''}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="col g6">
                <div className="mono t9 c3 uc ls-wide">Import mode</div>
                <div className="seg">
                  <button className={`btn sm ${mode==='add'?'active':''}`} onClick={()=>setMode('add')}>Add to existing</button>
                  <button className={`btn sm ${mode==='replace'?'active':''}`} onClick={()=>setMode('replace')}>Replace all</button>
                </div>
                {mode==='replace' && <div className="mono t9" style={{color:'var(--red-2)'}}>⚠ Deletes all existing habits and logs.</div>}
              </div>
            </div>
          )}

          <div className="col g6">
            <button className="btn ghost sm" style={{alignSelf:'flex-start'}} onClick={()=>setShowHelp(v=>!v)}>
              {showHelp?'▾':'▸'} Format Help
            </button>
            {showHelp && (
              <div className="col g10" style={{padding:'10px 12px',background:'var(--surface)',borderRadius:'var(--radius-sm)',border:'1px solid var(--border)'}}>
                <div className="mono t9 c3 uc">JSON format</div>
                <pre className="mono t9 c2" style={{whiteSpace:'pre-wrap',lineHeight:1.6}}>{`[
  {
    "name": "Drink Water",
    "description": "Stay hydrated",
    "type": "quantity",
    "targetValue": 80,
    "unit": "oz",
    "frequency": "daily",
    "category": "Health",
    "color": "#2471a3"
  },
  {
    "name": "No Soda",
    "type": "abstinence",
    "frequency": "daily"
  }
]`}</pre>
                <div className="mono t9 c3 uc" style={{marginTop:4}}>CSV headers</div>
                <pre className="mono t9 c2">name,description,type,targetValue,unit,frequency,category,color</pre>
                <div className="t10 c3" style={{lineHeight:1.6,marginTop:4}}>
                  Types: binary · quantity · duration · abstinence.
                  Frequencies: daily · weekdays · specific · weekly.
                  Ask ChatGPT or Gemini to generate this file.
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button className="btn primary lg" disabled={!parsed} onClick={()=>{playSound('button');onImport(parsed,mode);}}>
            Import {parsed?`${parsed.length} Habit${parsed.length!==1?'s':''}`:' Habits'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// CALENDAR — Week View Screen
// ═════════════════════════════════════════════════════════
function CalendarScreen({ events, onSaveEvent, onDeleteEvent, onImportCal }) {
  const [weekStart,    setWeekStart]    = useState(() => calWeekStart(new Date()));
  const [modal,        setModal]        = useState(null);
  const [nowMins,      setNowMins]      = useState(calNowMins);
  const [importOpen,   setImportOpen]   = useState(false);
  const bodyRef = useRef(null);

  // Tick the now-line every minute
  useEffect(() => {
    const id = setInterval(() => setNowMins(calNowMins()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Scroll to ~current time on first mount
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = Math.max(0, (nowMins/60 - 1.5) * HOUR_H);
    }
  }, []); // eslint-disable-line

  const prevWeek = () => { playSound('button'); setWeekStart(d => calAddDays(d,-7)); };
  const nextWeek = () => { playSound('button'); setWeekStart(d => calAddDays(d, 7)); };
  const goToday  = () => { playSound('button'); setWeekStart(calWeekStart(new Date())); };

  const weekDays   = Array.from({length:7}, (_,i) => calAddDays(weekStart,i));
  const todayStr   = calDateStr(new Date());
  const todayDate  = new Date(); todayDate.setHours(0,0,0,0);
  const isThisWeek = todayDate >= weekStart && todayDate < calAddDays(weekStart,7);
  const expanded   = calExpandRecurring(events, weekStart);
  const byDay      = weekDays.map(d => expanded.filter(ev => ev._idate === calDateStr(d)));

  // Month label
  const ws = weekStart, we = calAddDays(weekStart,6);
  const mlabel = ws.getMonth()===we.getMonth()
    ? `${CAL_MONTH[ws.getMonth()]} ${ws.getFullYear()}`
    : `${CAL_MONTH[ws.getMonth()]} – ${CAL_MONTH[we.getMonth()]} ${we.getFullYear()}`;

  const openSlot = (day, hour) => {
    playSound('button');
    setModal({ mode:'add', initial:{ date:calDateStr(day), startTime:calFromMins(hour*60), endTime:calFromMins(Math.min(hour*60+60, 23*60+30)) } });
  };
  const openNew  = () => { playSound('button'); setModal({ mode:'add', initial:{ date:todayStr } }); };
  const openEdit = (ev, e) => { e.stopPropagation(); playSound('button'); setModal({ mode:'edit', initial:ev }); };

  const handleSave = ev => { onSaveEvent(ev); setModal(null); };
  const handleDel  = id => { onDeleteEvent(id); setModal(null); };

  return (
    <div className="screen" style={{padding:0,gap:0,overflow:'hidden'}}>

      {/* Screen header */}
      <div style={{padding:'28px 44px 16px',flexShrink:0,display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16}}>
        <div>
          <div className="screen-eyebrow">Week view · {mlabel}</div>
          <div className="screen-title">Calendar</div>
        </div>
        <div className="row ac g6">
          <button className="btn ghost sm" onClick={prevWeek} title="Previous week">←</button>
          <button className="btn ghost sm" onClick={goToday} style={{minWidth:52}}>Today</button>
          <button className="btn ghost sm" onClick={nextWeek} title="Next week">→</button>
          <button className="btn ghost sm" onClick={()=>{playSound('button');setImportOpen(true);}} style={{marginLeft:4}}>Import</button>
          <button className="btn primary sm" onClick={openNew}>+ Event</button>
        </div>
      </div>

      {/* Calendar panel */}
      <div className="panel cal-panel" style={{margin:'0 44px 28px'}}>

        {/* Day column headers */}
        <div className="cal-col-header">
          <div className="cal-gutter"/>
          {weekDays.map((day,di) => {
            const isToday = calDateStr(day) === todayStr;
            return (
              <div key={di} className={`cal-day-head ${isToday?'is-today':''}`}>
                <div className="cal-day-name">{CAL_DAYS[day.getDay()]}</div>
                <div className="cal-day-num">{day.getDate()}</div>
              </div>
            );
          })}
        </div>

        {/* Scrollable time-grid body */}
        <div className="cal-body" ref={bodyRef}>

          {/* Time axis labels */}
          <div className="cal-time-gutter">
            {CAL_HOURS.map(h => (
              <div key={h} className="cal-time-label">
                {h > 0 ? `${String(h).padStart(2,'0')}:00` : ''}
              </div>
            ))}
          </div>

          {/* Grid of day columns */}
          <div className="cal-grid" style={{height: 24*HOUR_H}}>

            {/* Current time bar — spans all columns */}
            {isThisWeek && (
              <div className="cal-now-line" style={{top: nowMins/60*HOUR_H}}>
                <div className="cal-now-dot"/>
              </div>
            )}

            {weekDays.map((day, di) => {
              const isToday = calDateStr(day) === todayStr;
              const laid    = calLayoutDay(byDay[di]);
              return (
                <div key={di}
                  className={`cal-day-col ${isToday?'is-today':''}`}
                  onClick={e => {
                    const r = e.currentTarget.getBoundingClientRect();
                    openSlot(day, Math.min(23, Math.floor((e.clientY-r.top)/HOUR_H)));
                  }}>

                  {/* Hour background cells */}
                  {CAL_HOURS.map(h => <div key={h} className="cal-hour-cell"/>)}

                  {/* Event blocks */}
                  {laid.map(({ev, ci, n}) => {
                    const sm  = calToMins(ev.startTime);
                    const em  = calToMins(ev.endTime);
                    const top = sm/60*HOUR_H;
                    const h   = Math.max(18, (Math.max(em, sm+15)-sm)/60*HOUR_H);
                    const hex = calColorHex(ev.color);
                    const w   = 100/n;
                    const l   = ci*w;
                    const isCrimson = ev.color === 'crimson';
                    return (
                      <div key={ev.id+'_'+ev._idate}
                        className="cal-event-block"
                        style={{
                          top, height:h,
                          left:  `calc(${l}% + 2px)`,
                          width: `calc(${w}% - 4px)`,
                          background: hex+'26',
                          borderLeftColor: hex,
                        }}
                        onClick={e => openEdit(ev, e)}>
                        <div className="cal-event-title"
                          style={{color: isCrimson ? '#e8a0a0' : '#ddd'}}>{ev.title}</div>
                        {h > 30 && <div className="cal-event-time">{ev.startTime}–{ev.endTime}</div>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {modal && (
        <EventModal
          mode={modal.mode}
          initial={modal.initial}
          onSave={handleSave}
          onDelete={modal.mode==='edit' ? () => handleDel(modal.initial.id) : null}
          onCancel={() => { playSound('button'); setModal(null); }}
        />
      )}
      {importOpen && (
        <ImportCalModal
          onImport={(evs, mode) => {
            onImportCal(evs, mode);
            setImportOpen(false);
          }}
          onCancel={() => { playSound('button'); setImportOpen(false); }}
        />
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// PROFILE MODAL
// ═════════════════════════════════════════════════════════
const LS_KEYS = [
  'ra_profile','ra_tasks','ra_accomplishments',
  'ra_pom_settings','ra_pom_sessions','ra_pom_daily',
  'ra_timer_sessions','ra_bg','ra_filter','ra_sound_muted',
  'ra_calendar_events','ra_habits','ra_habit_logs',
  'ra_daily_reviews','ra_weekly_reviews','ra_theme',
];

function ProfileModal({ profile, isFirstRun, onSave, onCancel, theme, onSetTheme }) {
  const [name,         setName]         = useState(profile.name     || '');
  const [initials,     setInitials]     = useState(profile.initials || '');
  const [confirmReset, setConfirmReset] = useState(false);
  const tz = DEFAULT_PROFILE.timezone;

  // Auto-derive initials from name when the user hasn't typed custom ones
  const autoInitials = name.trim()
    .split(/\s+/).filter(Boolean)
    .map(w => w[0].toUpperCase())
    .slice(0, 2).join('');
  const displayInitials = (initials.trim() || autoInitials || '?');

  // Only allow Escape in edit mode
  useEffect(() => {
    if (isFirstRun) return;
    const h = e => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isFirstRun, onCancel]);

  const handleSave = () => {
    if (!name.trim()) return;
    playSound('button');
    onSave({ ...profile, name: name.trim(), initials: initials.trim() || autoInitials });
  };

  const handleReset = () => {
    LS_KEYS.forEach(k => { try { localStorage.removeItem(k); } catch(e) {} });
    window.location.reload();
  };

  return (
    <div className="modal-backdrop"
      style={isFirstRun ? {cursor:'default'} : undefined}
      onClick={isFirstRun ? undefined : onCancel}>
      <div className="modal-box" style={{width:'min(440px,92vw)'}} onClick={e => e.stopPropagation()}>

        <div className="modal-header" style={{paddingBottom: isFirstRun ? 10 : 14}}>
          <span className="modal-title">
            {isFirstRun ? "Set Up Roberto's Aid" : 'Profile & Settings'}
          </span>
          {!isFirstRun && (
            <button className="btn ghost sm"
              style={{width:28,height:28,padding:0,fontSize:16,lineHeight:1}}
              onClick={onCancel}>×</button>
          )}
        </div>

        <div className="modal-body" style={{gap:16}}>

          {isFirstRun && (
            <div className="t12 c2" style={{lineHeight:1.7, marginTop:-4}}>
              Create a local profile for this browser.{' '}
              <span className="c3">Your data is saved on this device.</span>
            </div>
          )}

          {/* Avatar + name row */}
          <div className="row ac g14">
            <div style={{
              width:54, height:54, borderRadius:'50%', flexShrink:0,
              border:'1.5px solid rgba(192,57,43,0.42)',
              background:'linear-gradient(135deg,rgba(192,57,43,0.12),rgba(192,57,43,0.05))',
              boxShadow:'0 0 20px rgba(192,57,43,0.12)',
              display:'grid', placeItems:'center',
            }}>
              <span style={{fontFamily:'var(--font-mono)',fontSize:18,fontWeight:500,color:'#e8a0a0',letterSpacing:'0.06em'}}>
                {displayInitials}
              </span>
            </div>
            <div className="col g5 flex1">
              <div className="mono t9 c3 uc">Display name</div>
              <div className="field">
                <input value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && name.trim()) handleSave(); }}
                  placeholder="Your name…" autoFocus/>
              </div>
            </div>
          </div>

          {/* Initials override */}
          <div className="row ac g12">
            <div className="col g5" style={{width:88,flexShrink:0}}>
              <div className="mono t9 c3 uc">Initials</div>
              <div className="field">
                <input value={initials}
                  onChange={e => setInitials(e.target.value.toUpperCase().slice(0,3))}
                  placeholder={autoInitials || '—'}
                  style={{textAlign:'center',letterSpacing:'0.12em'}}
                  className="mono t13"/>
              </div>
            </div>
            <div className="mono t9 c3" style={{paddingTop:18,lineHeight:1.55}}>
              Auto-computed from name.<br/>Override if needed.
            </div>
          </div>

          {tz && (
            <div className="col g5">
              <div className="mono t9 c3 uc">Timezone</div>
              <div className="mono t11 c2" style={{padding:'0 2px'}}>{tz}</div>
            </div>
          )}

          {!isFirstRun && onSetTheme && (
            <div className="col g8">
              <div className="mono t9 c3 uc">Theme</div>
              <div className="seg">
                {THEMES.map(t => (
                  <button key={t.id} className={`btn sm ${theme===t.id?'active':''}`}
                    onClick={() => { playSound('toggle_on'); onSetTheme(t.id); }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="divider"/>

          {isFirstRun ? (
            <div className="t11 c3" style={{lineHeight:1.65}}>
              Everything stays on this device. Nothing is sent to a server.
            </div>
          ) : (
            <div className="col g8">
              <div className="mono t9 c3 uc">Local data</div>
              <div className="t11 c3" style={{lineHeight:1.6}}>
                All data — tasks, sessions, and accomplishments — is saved to this browser only.
              </div>
              {!confirmReset ? (
                <button className="btn ghost sm"
                  style={{alignSelf:'flex-start',color:'var(--red-2)',borderColor:'rgba(192,57,43,0.3)',marginTop:2}}
                  onClick={() => setConfirmReset(true)}>
                  Reset Local Data…
                </button>
              ) : (
                <div className="col g8" style={{marginTop:2}}>
                  <div className="mono t10" style={{color:'var(--red-2)'}}>
                    Erase all saved data? This cannot be undone.
                  </div>
                  <div className="row g6">
                    <button className="btn sm primary" onClick={handleReset}>Yes, erase everything</button>
                    <button className="btn sm ghost" onClick={() => setConfirmReset(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        <div className="modal-footer">
          {isFirstRun
            ? <span className="mono t9 c3" style={{flex:1}}>Saved to this browser only · no account needed</span>
            : <button className="btn ghost" onClick={onCancel}>Cancel</button>
          }
          <button className="btn primary lg" onClick={handleSave} disabled={!name.trim()}>
            {isFirstRun ? 'Start' : 'Save Changes'}
          </button>
        </div>

      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// HABITS
// ═════════════════════════════════════════════════════════

function HabitModal({ initial, onSave, onCancel }) {
  const isEdit = !!initial;
  const [name,          setName]          = useState(initial?.name          || '');
  const [description,   setDescription]   = useState(initial?.description   || '');
  const [type,          setType]          = useState(initial?.type          || 'binary');
  const [frequency,     setFrequency]     = useState(initial?.frequency     || 'daily');
  const [specificDays,  setSpecificDays]  = useState(initial?.specificDays  || []);
  const [weeklyCount,   setWeeklyCount]   = useState(initial?.weeklyCount   || 3);
  const [targetValue,   setTargetValue]   = useState(initial?.targetValue   || '');
  const [unit,          setUnit]          = useState(initial?.unit          || '');
  const [targetMinutes, setTargetMinutes] = useState(initial?.targetMinutes || '');
  const [category,      setCategory]      = useState(initial?.category      || '');
  const [color,         setColor]         = useState(initial?.color         || 'crimson');
  const [reminderTime,  setReminderTime]  = useState(initial?.reminderTime  || '');
  const [notesTemplate, setNotesTemplate] = useState(initial?.notesTemplate || '');

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onCancel]);

  const toggleDay = dow =>
    setSpecificDays(prev => prev.includes(dow) ? prev.filter(d=>d!==dow) : [...prev, dow]);

  const handleSave = () => {
    if (!name.trim()) return;
    playSound('button');
    const now = Date.now();
    onSave({
      name:          name.trim(),
      description:   description.trim(),
      type,
      frequency,
      specificDays,
      weeklyCount,
      targetValue:   type==='quantity'   ? (parseFloat(targetValue)||0)  : 0,
      unit:          type==='quantity'   ? unit.trim()                   : '',
      targetMinutes: type==='duration'   ? (parseInt(targetMinutes)||0)  : 0,
      category:      category.trim(),
      color,
      reminderTime,
      notesTemplate: notesTemplate.trim(),
      updatedAt:     now,
      ...(isEdit ? {} : { id: now, createdAt: now, archived: false, lastOccurrence: null }),
    });
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target===e.currentTarget && onCancel()}>
      <div className="modal-box" style={{width:'min(520px,94vw)'}}>
        <div className="modal-header">
          <div className="modal-title">{isEdit ? 'Edit Habit' : 'New Habit'}</div>
          <button className="btn ghost sm" style={{width:26,height:26,padding:0,fontSize:16,lineHeight:1}}
            onClick={onCancel}>×</button>
        </div>
        <div className="modal-body" style={{maxHeight:'70vh',overflowY:'auto',gap:16}}>

          <div className="col g5">
            <label className="mono t9 c3 uc ls-wide">Habit Name *</label>
            <div className="field">
              <input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Morning reading"/>
            </div>
          </div>

          {/* Type selector */}
          <div className="col g8">
            <label className="mono t9 c3 uc ls-wide">Type</label>
            <div className="row g5 wrap">
              {HABIT_TYPES.map(t => (
                <button key={t.id} className={`btn sm ${type===t.id?'primary':'ghost'}`}
                  onClick={() => { playSound('toggle_on'); setType(t.id); }}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="mono t9 c3">{HABIT_TYPES.find(t=>t.id===type)?.desc}</div>
          </div>

          {/* Type-specific fields */}
          {type === 'quantity' && (
            <div className="row g12">
              <div className="col g5 flex1">
                <label className="mono t9 c3 uc ls-wide">Target amount</label>
                <div className="field">
                  <input type="number" min="0" value={targetValue} onChange={e=>setTargetValue(e.target.value)}
                    className="mono" style={{width:'100%',textAlign:'right'}} placeholder="80"/>
                </div>
              </div>
              <div className="col g5" style={{width:110}}>
                <label className="mono t9 c3 uc ls-wide">Unit</label>
                <div className="field">
                  <input value={unit} onChange={e=>setUnit(e.target.value)} placeholder="oz, g, pages…"
                    list="hab-units-list" style={{width:'100%'}}/>
                </div>
                <datalist id="hab-units-list">{HABIT_UNITS.map(u=><option key={u} value={u}/>)}</datalist>
              </div>
            </div>
          )}
          {type === 'duration' && (
            <div className="col g5" style={{maxWidth:180}}>
              <label className="mono t9 c3 uc ls-wide">Target (minutes)</label>
              <div className="field">
                <input type="number" min="1" value={targetMinutes} onChange={e=>setTargetMinutes(e.target.value)}
                  className="mono" style={{width:'100%',textAlign:'right'}} placeholder="60"/>
              </div>
            </div>
          )}
          {type === 'abstinence' && (
            <div className="mono t10 c3" style={{padding:'7px 10px',background:'var(--surface)',borderRadius:'var(--radius-sm)',border:'1px solid var(--border)'}}>
              Tracks your streak of staying free. "I Slipped" resets the clock from now.
            </div>
          )}

          <div className="col g5">
            <label className="mono t9 c3 uc ls-wide">Why it matters</label>
            <textarea className="hab-ta" style={{height:60}}
              value={description} onChange={e=>setDescription(e.target.value)}
              placeholder="Why does this habit matter to you?"/>
          </div>

          <div className="col g8">
            <label className="mono t9 c3 uc ls-wide">Frequency</label>
            <div className="seg">
              {HABIT_FREQ.map(f => (
                <button key={f.id} className={`btn sm ${frequency===f.id?'active':''}`}
                  onClick={() => { playSound('toggle_on'); setFrequency(f.id); }}>
                  {f.label}
                </button>
              ))}
            </div>
            {frequency === 'specific' && (
              <div className="row g5 wrap" style={{marginTop:2}}>
                {HAB_WEEK_LONG.map((d,i) => (
                  <button key={i} className={`btn sm ${specificDays.includes(i)?'primary':'ghost'}`}
                    onClick={() => { playSound('toggle_on'); toggleDay(i); }}>
                    {d}
                  </button>
                ))}
              </div>
            )}
            {frequency === 'weekly' && (
              <div className="row ac g8" style={{marginTop:2}}>
                <span className="mono t10 c2">Target:</span>
                <div className="field" style={{width:58}}>
                  <input type="number" min="1" max="7" value={weeklyCount}
                    onChange={e=>setWeeklyCount(Math.max(1,Math.min(7,parseInt(e.target.value)||1)))}
                    className="mono t12" style={{textAlign:'center',width:'100%'}}/>
                </div>
                <span className="mono t10 c3">times / week</span>
              </div>
            )}
          </div>

          <div className="row g12">
            <div className="col g5 flex1">
              <label className="mono t9 c3 uc ls-wide">Category / Tag</label>
              <div className="field">
                <input value={category} onChange={e=>setCategory(e.target.value)} placeholder="Health, Mind, Work…"/>
              </div>
            </div>
            <div className="col g5" style={{width:120}}>
              <label className="mono t9 c3 uc ls-wide">Reminder</label>
              <div className="field">
                <input type="time" value={reminderTime} onChange={e=>setReminderTime(e.target.value)}
                  style={{colorScheme:'dark',width:'100%'}}/>
              </div>
            </div>
          </div>

          <div className="col g8">
            <label className="mono t9 c3 uc ls-wide">Color</label>
            <div className="row g8 wrap">
              {HABIT_COLORS.map(c => (
                <button key={c.id}
                  style={{width:24,height:24,borderRadius:'50%',background:c.hex,cursor:'pointer',
                    border:`2px solid ${color===c.id?'rgba(255,255,255,0.75)':'transparent'}`,
                    transform:color===c.id?'scale(1.2)':'scale(1)',
                    transition:'transform 0.12s,border-color 0.12s'}}
                  onClick={() => setColor(c.id)}/>
              ))}
            </div>
          </div>

          <div className="col g5">
            <label className="mono t9 c3 uc ls-wide">Notes Prompt</label>
            <div className="field">
              <input value={notesTemplate} onChange={e=>setNotesTemplate(e.target.value)}
                placeholder="Completion note prompt… (e.g. How did it go?)"/>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button className="btn primary lg" onClick={handleSave} disabled={!name.trim()}>
            {isEdit ? 'Save Changes' : 'Create Habit'}
          </button>
        </div>
      </div>
    </div>
  );
}

function HabitCompleteModal({ habit, existingLog, onSave, onCancel, onSlip }) {
  const now = new Date();
  const defTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const htype = habit.type || 'binary';
  const [completedAt, setCompletedAt] = useState(existingLog?.completedAt || defTime);
  const [note,        setNote]        = useState(existingLog?.note        || '');
  const [rating,      setRating]      = useState(existingLog?.rating      || 0);
  const [mood,        setMood]        = useState(existingLog?.mood        || '');
  const [difficulty,  setDifficulty]  = useState(existingLog?.difficulty  || '');
  const [amount,      setAmount]      = useState(existingLog?.amount !== undefined ? String(existingLog.amount) : '');
  const [minutes,     setMinutes]     = useState(existingLog?.minutes !== undefined ? String(existingLog.minutes) : '');
  const [slipMode,    setSlipMode]    = useState(false);
  const [slipNote,    setSlipNote]    = useState('');
  const hex    = habitColorHex(habit.color);
  const streak = abstinenceStreak(habit);

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') { if (slipMode) setSlipMode(false); else onCancel(); }};
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onCancel, slipMode]);

  const ts = () => Date.now();
  const base = existingLog ? {} : { id: ts(), habitId: habit.id, date: todayHabitStr(), createdAt: ts() };

  const handleSave = () => {
    playSound('toggle_on');
    const u = Date.now();
    if (htype === 'binary')
      onSave({ ...base, completedAt, note: note.trim(), rating, mood, difficulty, updatedAt: u });
    else if (htype === 'quantity')
      onSave({ ...base, completedAt: defTime, amount: parseFloat(amount)||0, note: note.trim(), updatedAt: u });
    else if (htype === 'duration')
      onSave({ ...base, completedAt: defTime, minutes: parseInt(minutes)||0, note: note.trim(), updatedAt: u });
    else // abstinence — log clean affirm
      onSave({ ...base, completedAt: defTime, note: note.trim(), updatedAt: u });
  };

  const handleSlipConfirm = () => { if (onSlip) onSlip(habit.id, slipNote.trim()); onCancel(); };

  // Abstinence slip mode
  if (htype === 'abstinence' && slipMode) return (
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onCancel()}>
      <div className="modal-box" style={{width:'min(400px,94vw)'}}>
        <div className="modal-header">
          <div className="row ac g10"><div style={{width:8,height:8,borderRadius:'50%',background:hex}}/><div className="modal-title">Record Slip · {habit.name}</div></div>
          <button className="btn ghost sm" style={{width:26,height:26,padding:0,fontSize:16,lineHeight:1}} onClick={()=>setSlipMode(false)}>←</button>
        </div>
        <div className="modal-body" style={{gap:14}}>
          <div className="t12 c2" style={{lineHeight:1.65}}>Resets the streak clock to now. Current streak: <strong>{streak} day{streak!==1?'s':''}</strong>.</div>
          <div className="col g5">
            <label className="mono t9 c3 uc ls-wide">Note (optional)</label>
            <textarea className="hab-ta" style={{height:64}} value={slipNote} onChange={e=>setSlipNote(e.target.value)} placeholder="What happened? What to adjust?"/>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn ghost" onClick={()=>setSlipMode(false)}>Back</button>
          <button className="btn sm" style={{borderColor:'var(--red)',color:'var(--red-2)',background:'rgba(192,57,43,0.08)'}} onClick={handleSlipConfirm}>Reset Streak</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="modal-backdrop" onClick={e => e.target===e.currentTarget && onCancel()}>
      <div className="modal-box" style={{width:'min(440px,94vw)'}}>
        <div className="modal-header">
          <div className="row ac g10">
            <div style={{width:8,height:8,borderRadius:'50%',background:hex,flexShrink:0}}/>
            <div className="modal-title">
              {htype==='abstinence' ? 'Log Clean Day' : existingLog ? 'Edit' : 'Complete'} · {habit.name}
            </div>
          </div>
          <button className="btn ghost sm" style={{width:26,height:26,padding:0,fontSize:16,lineHeight:1}} onClick={onCancel}>×</button>
        </div>
        <div className="modal-body" style={{gap:16}}>

          {htype === 'binary' && (<>
            <div className="row ac g12">
              <div className="col g5">
                <label className="mono t9 c3 uc ls-wide">Completed at</label>
                <div className="field" style={{width:110}}><input type="time" value={completedAt} onChange={e=>setCompletedAt(e.target.value)} style={{colorScheme:'dark',width:'100%'}}/></div>
              </div>
            </div>
            <div className="col g5">
              <label className="mono t9 c3 uc ls-wide">{habit.notesTemplate||'How did it go?'}</label>
              <textarea className="hab-ta" style={{height:64}} value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a note…"/>
            </div>
            <div className="col g8">
              <label className="mono t9 c3 uc ls-wide">Mood</label>
              <div className="row g6">{HAB_MOODS.map(m=>(
                <button key={m} onClick={()=>{playSound('toggle_on');setMood(mood===m?'':m);}}
                  style={{width:36,height:36,borderRadius:8,fontSize:18,cursor:'pointer',border:`1px solid ${mood===m?'rgba(255,255,255,0.35)':'var(--border)'}`,background:mood===m?'var(--surface-2)':'transparent',transition:'border-color 0.15s,background 0.15s'}}>{m}</button>
              ))}</div>
            </div>
            <div className="row g16">
              <div className="col g8 flex1">
                <label className="mono t9 c3 uc ls-wide">Quality{rating>0?` · ${rating}/5`:''}</label>
                <div className="row g4">{[1,2,3,4,5].map(n=>(
                  <button key={n} onClick={()=>{playSound('toggle_on');setRating(rating===n?0:n);}}
                    style={{width:28,height:28,borderRadius:6,border:'1px solid var(--border)',background:'transparent',cursor:'pointer',fontSize:16,color:n<=rating?'#e8c070':'var(--text-3)',transition:'color 0.1s'}}>★</button>
                ))}</div>
              </div>
              <div className="col g8">
                <label className="mono t9 c3 uc ls-wide">Difficulty</label>
                <div className="seg">{HAB_DIFFS.map(d=>(
                  <button key={d} className={`btn sm ${difficulty===d?'active':''}`} onClick={()=>{playSound('toggle_on');setDifficulty(difficulty===d?'':d);}}>{d}</button>
                ))}</div>
              </div>
            </div>
          </>)}

          {htype === 'quantity' && (<>
            <div className="col g5">
              <label className="mono t9 c3 uc ls-wide">Amount{habit.unit?` (${habit.unit})`:''}{habit.targetValue?` · target: ${habit.targetValue}`:''}</label>
              <div className="field" style={{width:150}}><input type="number" min="0" step="any" value={amount} onChange={e=>setAmount(e.target.value)} className="mono t16" style={{width:'100%',textAlign:'center'}} placeholder="0" autoFocus/></div>
              {habit.targetValue > 0 && amount && (
                <div className="progress-track thick" style={{marginTop:4}}><div className="progress-fill" style={{width:`${Math.min(100,(parseFloat(amount)||0)/habit.targetValue*100)}%`}}/></div>
              )}
            </div>
            <div className="col g5">
              <label className="mono t9 c3 uc ls-wide">Note</label>
              <textarea className="hab-ta" style={{height:52}} value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional…"/>
            </div>
          </>)}

          {htype === 'duration' && (<>
            <div className="col g5">
              <label className="mono t9 c3 uc ls-wide">Minutes{habit.targetMinutes?` · target: ${habit.targetMinutes}`:''}</label>
              <div className="field" style={{width:150}}><input type="number" min="0" value={minutes} onChange={e=>setMinutes(e.target.value)} className="mono t16" style={{width:'100%',textAlign:'center'}} placeholder="0" autoFocus/></div>
              {habit.targetMinutes > 0 && minutes && (
                <div className="progress-track thick" style={{marginTop:4}}><div className="progress-fill" style={{width:`${Math.min(100,(parseInt(minutes)||0)/habit.targetMinutes*100)}%`}}/></div>
              )}
            </div>
            <div className="col g5">
              <label className="mono t9 c3 uc ls-wide">Note</label>
              <textarea className="hab-ta" style={{height:52}} value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional…"/>
            </div>
          </>)}

          {htype === 'abstinence' && (
            <div className="col g12">
              <div style={{padding:'16px',background:'var(--surface)',borderRadius:'var(--radius-sm)',border:'1px solid var(--border)',textAlign:'center'}}>
                <div className="disp t32 fw3" style={{color:hex}}>{streak}</div>
                <div className="mono t10 c3">clean day{streak!==1?'s':''}</div>
              </div>
              <div className="col g5">
                <label className="mono t9 c3 uc ls-wide">Affirm note (optional)</label>
                <textarea className="hab-ta" style={{height:52}} value={note} onChange={e=>setNote(e.target.value)} placeholder="How are you feeling?"/>
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          {htype === 'abstinence' ? (<>
            <button className="btn ghost sm" style={{color:'var(--text-3)'}} onClick={()=>setSlipMode(true)}>I Slipped…</button>
            <button className="btn primary lg" onClick={handleSave}>Log Clean Day</button>
          </>) : (<>
            <button className="btn ghost" onClick={onCancel}>Cancel</button>
            <button className="btn primary lg" onClick={handleSave}>{existingLog ? 'Update' : 'Mark Complete'}</button>
          </>)}
        </div>
      </div>
    </div>
  );
}

function HabitsScreen({ habits, habitLogs, dailyReviews, weeklyReviews, onSaveHabit, onDeleteHabit, onArchiveHabit, onSaveLog, onDeleteLog, onSaveDailyReview, onSaveWeeklyReview, onSlipHabit, onImportHabits }) {
  const [view,          setView]          = useState('today');
  const [habitModal,    setHabitModal]    = useState(null);
  const [completeModal, setCompleteModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [importOpen,    setImportOpen]    = useState(false);
  const [reviewMode,    setReviewMode]    = useState('daily'); // 'daily' | 'weekly'
  const [reviewDate,    setReviewDate]    = useState(todayHabitStr());
  const [reviewDraft,   setReviewDraft]   = useState({ howItWent:'', whatHelped:'', blockers:'', tomorrowAdjustment:'' });
  const [weekReviewDraft, setWeekReviewDraft] = useState({ whatWentWell:'', struggles:'', habitsImproved:'', habitsFellOff:'', nextWeekFocus:'', weekRating:0 });

  const today     = todayHabitStr();
  const weekDates = getHabitWeekDates();
  const active    = habits.filter(h => !h.archived);
  const archived  = habits.filter(h =>  h.archived);
  const todayDue  = active.filter(h => isHabitDue(h, today));
  const todayDone = todayDue.filter(h => {
    const htype = h.type || 'binary';
    if (htype === 'abstinence') return habitLogs.some(l => l.habitId===h.id && l.date===today && !l.isSlip);
    return habitLogs.some(l => l.habitId===h.id && l.date===today);
  });

  const weekStart = weekDates[0];

  // Sync daily review draft
  useEffect(() => {
    const r = dailyReviews.find(r => r.date === reviewDate) || {};
    setReviewDraft({ howItWent:r.howItWent||'', whatHelped:r.whatHelped||'', blockers:r.blockers||'', tomorrowAdjustment:r.tomorrowAdjustment||'' });
  }, [reviewDate, dailyReviews]);

  // Sync weekly review draft
  useEffect(() => {
    const r = (weeklyReviews||[]).find(r => r.weekStart === weekStart) || {};
    setWeekReviewDraft({ whatWentWell:r.whatWentWell||'', struggles:r.struggles||'', habitsImproved:r.habitsImproved||'', habitsFellOff:r.habitsFellOff||'', nextWeekFocus:r.nextWeekFocus||'', weekRating:r.weekRating||0 });
  }, [weekStart, weeklyReviews]);

  const saveDailyReview = () => { playSound('button'); onSaveDailyReview({ date:reviewDate, ...reviewDraft, updatedAt:Date.now() }); };
  const saveWeeklyReview = () => { playSound('button'); if(onSaveWeeklyReview) onSaveWeeklyReview({ weekStart, ...weekReviewDraft, updatedAt:Date.now() }); };

  const openComplete = habit => {
    const existing = habitLogs.find(l => l.habitId===habit.id && l.date===today && !l.isSlip) || null;
    playSound('button');
    setCompleteModal({ habit, existingLog: existing });
  };

  const unmark = habit => {
    const log = habitLogs.find(l => l.habitId===habit.id && l.date===today && !l.isSlip);
    if (log) { playSound('toggle_on'); onDeleteLog(log.id); }
  };

  const handleSaveComplete = data => {
    onSaveLog(completeModal.existingLog ? { ...completeModal.existingLog, ...data } : data);
    if (!completeModal.existingLog) playSound('notification');
    setCompleteModal(null);
  };

  // ── Today view ────────────────────────────────────────────
  const renderToday = () => (
    <div className="col g16" style={{flex:1,minHeight:0,overflow:'auto'}}>
      <div className="panel p16">
        <div className="mono t9 c3 uc ls-wide" style={{marginBottom:10}}>This Week</div>
        <div className="hab-week-grid">
          {weekDates.map((ds,i) => {
            const isToday = ds===today;
            const date    = new Date(ds+'T00:00:00');
            const due     = active.filter(h=>isHabitDue(h,ds));
            const done    = due.filter(h=>habitLogs.some(l=>l.habitId===h.id&&l.date===ds&&!l.isSlip));
            const pct     = due.length>0 ? done.length/due.length : 0;
            return (
              <div key={ds} className={`hab-week-day${isToday?' is-today':''}`}>
                <div className="mono" style={{fontSize:8,color:'var(--text-3)',marginBottom:3}}>{HAB_WEEK_SHORT[i]}</div>
                <div className="mono t11" style={{color:isToday?'var(--text)':'var(--text-2)',marginBottom:5,fontWeight:isToday?600:400}}>{date.getDate()}</div>
                <div style={{width:'100%',height:3,borderRadius:2,background:'var(--surface-2)',overflow:'hidden',marginBottom:3}}>
                  <div style={{height:'100%',width:`${pct*100}%`,borderRadius:2,background:pct===1?'var(--red-2)':pct>0?'rgba(192,57,43,0.55)':'transparent',transition:'width 0.4s'}}/>
                </div>
                <div className="mono" style={{fontSize:8,color:'var(--text-3)'}}>{due.length>0?`${done.length}/${due.length}`:'·'}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel p16 col g10" style={{flex:1,minHeight:0}}>
        <div className="row jb ac" style={{marginBottom:4}}>
          <div className="mono t9 c3 uc ls-wide">Today's Habits</div>
          <div className="mono t9 c3">{todayDone.length}/{todayDue.length} done</div>
        </div>
        <div className="col g6 of-a flex1">
          {active.length===0 && <div className="mono t11 c3 tc" style={{padding:'32px 0'}}>No habits yet — go to Manage to add one.</div>}

          {todayDue.map(habit => {
            const htype  = habit.type || 'binary';
            const log    = habitLogs.find(l=>l.habitId===habit.id&&l.date===today&&!l.isSlip);
            const done   = !!log;
            const streak = htype==='abstinence' ? abstinenceStreak(habit) : habitStreak(habit, habitLogs);

            // Sub-label for type
            let subLabel = null;
            if (htype==='quantity' && habit.targetValue>0) {
              const amt = log?.amount||0;
              subLabel = <div className="row ac g6" style={{marginTop:2}}>
                <div className="progress-track" style={{width:80}}><div className="progress-fill" style={{width:`${Math.min(100,amt/habit.targetValue*100)}%`}}/></div>
                <span className="mono t9 c3">{amt}/{habit.targetValue} {habit.unit}</span>
              </div>;
            } else if (htype==='duration' && habit.targetMinutes>0) {
              const mins = log?.minutes||0;
              subLabel = <div className="row ac g6" style={{marginTop:2}}>
                <div className="progress-track" style={{width:80}}><div className="progress-fill" style={{width:`${Math.min(100,mins/habit.targetMinutes*100)}%`}}/></div>
                <span className="mono t9 c3">{mins}/{habit.targetMinutes} min</span>
              </div>;
            } else if (htype==='abstinence') {
              subLabel = <span className="mono t9 c2" style={{marginTop:2}}>{streak} clean day{streak!==1?'s':''}</span>;
            }

            return (
              <div key={habit.id} className={`hab-card${done&&htype!=='abstinence'?' done':''}`}>
                <div style={{width:3,alignSelf:'stretch',borderRadius:2,background:habitColorHex(habit.color),flexShrink:0}}/>
                <div className="col flex1 g3">
                  <div className="row ac g8 jb">
                    <div className="row ac g8">
                      <span className="t13 fw5" style={{color:(done&&htype!=='abstinence')?'var(--text-3)':'var(--text)',textDecoration:(done&&htype!=='abstinence')?'line-through':'none'}}>{habit.name}</span>
                      {habit.category && <span className="tag" style={{fontSize:8}}>{habit.category}</span>}
                      {htype !== 'abstinence' && <span className="mono t9 c3">{(HABIT_TYPES.find(t=>t.id===htype)||HABIT_TYPES[0]).label}</span>}
                    </div>
                    {htype!=='abstinence' && streak>1 && <span className="mono t9" style={{color:'var(--red-2)',flexShrink:0}}>🔥{streak}</span>}
                  </div>
                  {subLabel}
                  {done && log?.note && htype!=='abstinence' && <div className="mono t10 c3" style={{fontStyle:'italic',marginTop:2}}>{log.note}</div>}
                  {done && log && htype==='binary' && (log.rating>0||log.mood) && (
                    <div className="row ac g8 t10 c3">
                      {log.mood&&<span>{log.mood}</span>}
                      {log.rating>0&&<span className="mono" style={{color:'#c0a040'}}>{'★'.repeat(log.rating)}</span>}
                    </div>
                  )}
                </div>
                <div className="row ac g5" style={{flexShrink:0}}>
                  {htype==='abstinence' ? (<>
                    <button className="btn sm" style={{borderColor:'rgba(192,57,43,0.45)',color:'var(--text-2)',fontSize:11}} onClick={()=>openComplete(habit)}>✓ Clean</button>
                  </>) : done ? (<>
                    <button className="btn sm ghost" style={{fontSize:10}} onClick={()=>openComplete(habit)}>Edit</button>
                    <button className="btn sm ghost" style={{fontSize:10,color:'var(--text-3)'}} onClick={()=>unmark(habit)}>Undo</button>
                  </>) : (
                    <button className="btn sm" style={{borderColor:'rgba(192,57,43,0.45)',color:'var(--text-2)',fontSize:11}} onClick={()=>openComplete(habit)}>
                      {htype==='quantity'?'Log Amount':htype==='duration'?'Log Time':'Complete'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {active.filter(h=>!isHabitDue(h,today)).length>0 && (<>
            <div className="mono t9 c3 uc ls-wide" style={{marginTop:8,paddingTop:8,borderTop:'1px solid var(--border)'}}>Not scheduled today</div>
            {active.filter(h=>!isHabitDue(h,today)).map(habit=>(
              <div key={habit.id} className="hab-card" style={{opacity:0.35}}>
                <div style={{width:3,alignSelf:'stretch',borderRadius:2,background:habitColorHex(habit.color),flexShrink:0}}/>
                <span className="t12 c3">{habit.name}</span>
                {habit.category&&<span className="tag" style={{fontSize:8}}>{habit.category}</span>}
              </div>
            ))}
          </>)}
        </div>
      </div>
    </div>
  );

  // ── Manage view ───────────────────────────────────────────
  const renderManage = () => (
    <div className="col g16" style={{flex:1,minHeight:0,overflow:'auto'}}>
      <div className="panel p16 col g0">
        <div className="mono t9 c3 uc ls-wide" style={{marginBottom:12}}>Active Habits ({active.length})</div>
        {active.length===0 && <div className="mono t11 c3 tc" style={{padding:'24px 0'}}>No habits yet. Hit + New Habit above.</div>}
        {active.map((habit,idx) => {
          const htype     = habit.type || 'binary';
          const streak    = htype==='abstinence' ? abstinenceStreak(habit) : habitStreak(habit, habitLogs);
          const weekDone  = weekDates.filter(ds=>habitLogs.some(l=>l.habitId===habit.id&&l.date===ds&&!l.isSlip)).length;
          const freqLabel = (HABIT_FREQ.find(f=>f.id===habit.frequency)||HABIT_FREQ[0]).label;
          const typeLabel = (HABIT_TYPES.find(t=>t.id===htype)||HABIT_TYPES[0]).label;
          return (
            <div key={habit.id} className="hab-manage-row" style={{borderTop:idx===0?'none':'1px solid var(--border)'}}>
              <div style={{width:3,alignSelf:'stretch',borderRadius:2,background:habitColorHex(habit.color),flexShrink:0}}/>
              <div className="col flex1 g3">
                <div className="row ac g8">
                  <span className="t13 fw5">{habit.name}</span>
                  {habit.category&&<span className="tag" style={{fontSize:8}}>{habit.category}</span>}
                  <span className="mono t9 c3">{typeLabel}</span>
                  {streak>1&&<span className="mono t9" style={{color:'var(--red-2)'}}>🔥{streak}</span>}
                </div>
                {habit.description&&<div className="mono t9 c3" style={{lineHeight:1.4}}>{habit.description}</div>}
                <div className="row ac g8">
                  <span className="mono t9 c3">{freqLabel}</span>
                  <span className="mono t9 c3">·</span>
                  <span className="mono t9 c3">{htype==='abstinence'?`${streak}d clean`:`${weekDone}/${weekDates.length} this week`}</span>
                </div>
                {htype!=='abstinence' && (
                  <div className="row ac g4" style={{marginTop:2}}>
                    {weekDates.map((ds,i)=>{
                      const done=habitLogs.some(l=>l.habitId===habit.id&&l.date===ds&&!l.isSlip);
                      const due=isHabitDue(habit,ds);
                      return <div key={ds} title={HAB_WEEK_LONG[i]}
                        style={{width:14,height:14,borderRadius:3,
                          background:done?habitColorHex(habit.color):due?'var(--surface-2)':'transparent',
                          border:`1px solid ${done?habitColorHex(habit.color):due?'var(--border)':'transparent'}`,
                          opacity:ds===today?1:0.75,transition:'background 0.2s'}}/>;
                    })}
                  </div>
                )}
              </div>
              <div className="row ac g5" style={{flexShrink:0}}>
                <button className="btn sm ghost" onClick={()=>{playSound('button');setHabitModal({mode:'edit',habit});}}>Edit</button>
                <button className="btn sm ghost" onClick={()=>{playSound('toggle_on');onArchiveHabit(habit.id,true);}}>Archive</button>
                {deleteConfirm===habit.id ? (<>
                  <button className="btn sm" style={{borderColor:'var(--red)',color:'var(--red-2)',background:'rgba(192,57,43,0.08)'}}
                    onClick={()=>{playSound('button');onDeleteHabit(habit.id);setDeleteConfirm(null);}}>Confirm</button>
                  <button className="btn sm ghost" onClick={()=>setDeleteConfirm(null)}>×</button>
                </>) : (
                  <button className="btn sm ghost" style={{color:'var(--text-3)'}} onClick={()=>setDeleteConfirm(habit.id)}>Delete</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {archived.length>0&&(
        <div className="panel p16 col g0">
          <div className="mono t9 c3 uc ls-wide" style={{marginBottom:12}}>Archived ({archived.length})</div>
          {archived.map((habit,idx)=>(
            <div key={habit.id} className="hab-manage-row" style={{opacity:0.48,borderTop:idx===0?'none':'1px solid var(--border)'}}>
              <div style={{width:3,alignSelf:'stretch',borderRadius:2,background:habitColorHex(habit.color),flexShrink:0}}/>
              <span className="t12 c3 flex1">{habit.name}</span>
              <button className="btn sm ghost" onClick={()=>{playSound('toggle_on');onArchiveHabit(habit.id,false);}}>Restore</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── Review view ───────────────────────────────────────────
  const renderReview = () => {
    const savedDaily  = dailyReviews.find(r=>r.date===reviewDate);
    const savedWeekly = (weeklyReviews||[]).find(r=>r.weekStart===weekStart);
    // Week label
    const ws = new Date(weekStart+'T00:00:00'), we = new Date(weekDates[6]+'T00:00:00');
    const wLabel = `${ws.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${we.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`;
    return (
      <div className="col g16" style={{flex:1,minHeight:0,overflow:'auto'}}>
        <div className="row ac g0" style={{flexShrink:0}}>
          <div className="seg">
            <button className={`btn sm ${reviewMode==='daily'?'active':''}`} onClick={()=>{playSound('toggle_on');setReviewMode('daily');}}>Daily</button>
            <button className={`btn sm ${reviewMode==='weekly'?'active':''}`} onClick={()=>{playSound('toggle_on');setReviewMode('weekly');}}>Weekly</button>
          </div>
        </div>

        {reviewMode==='daily' && (
          <div className="panel p20 col g16">
            <div className="row jb ac">
              <div className="mono t9 c3 uc ls-wide">Daily Review</div>
              <div className="field" style={{width:150}}><input type="date" value={reviewDate} onChange={e=>setReviewDate(e.target.value)} style={{colorScheme:'dark',width:'100%',fontSize:12}}/></div>
            </div>
            {[
              {key:'howItWent',          label:'How did today go?',              placeholder:'Overall, how was the day…'},
              {key:'whatHelped',         label:'What helped?',                   placeholder:'What made things easier…'},
              {key:'blockers',           label:'What got in the way?',           placeholder:'Obstacles, distractions…'},
              {key:'tomorrowAdjustment', label:'What should I adjust tomorrow?', placeholder:'One thing to do differently…'},
            ].map(({key,label,placeholder})=>(
              <div key={key} className="col g6">
                <label className="mono t9 c3 uc ls-wide">{label}</label>
                <textarea className="hab-ta" style={{height:64}} value={reviewDraft[key]} onChange={e=>setReviewDraft(p=>({...p,[key]:e.target.value}))} placeholder={placeholder}/>
              </div>
            ))}
            <div className="row jb ac">
              <span className="mono t9 c3">{savedDaily?.updatedAt?`Saved ${new Date(savedDaily.updatedAt).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}`:'Not saved yet'}</span>
              <button className="btn primary" onClick={saveDailyReview}>Save Review</button>
            </div>
          </div>
        )}

        {reviewMode==='weekly' && (
          <div className="col g16">
            <div className="panel p20 col g16">
              <div className="row jb ac">
                <div>
                  <div className="mono t9 c3 uc ls-wide">Weekly Review</div>
                  <div className="mono t11 c2" style={{marginTop:3}}>{wLabel}</div>
                </div>
                {savedWeekly?.updatedAt && <div className="mono t9 c3">Saved {new Date(savedWeekly.updatedAt).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</div>}
              </div>

              {/* Habit summary for the week */}
              <div className="col g6">
                <div className="mono t9 c3 uc ls-wide" style={{marginBottom:4}}>Habit Summary</div>
                {active.map(h=>{
                  const htype=h.type||'binary';
                  const due=weekDates.filter(ds=>isHabitDue(h,ds));
                  const done=weekDates.filter(ds=>habitLogs.some(l=>l.habitId===h.id&&l.date===ds&&!l.isSlip));
                  const pct=due.length>0?done.length/due.length:0;
                  if(htype==='abstinence') {
                    const s=abstinenceStreak(h);
                    return <div key={h.id} className="row ac g8" style={{padding:'4px 0'}}>
                      <div style={{width:6,height:6,borderRadius:'50%',background:habitColorHex(h.color),flexShrink:0}}/>
                      <span className="t11 flex1">{h.name}</span>
                      <span className="mono t9 c3">{s}d clean</span>
                    </div>;
                  }
                  return <div key={h.id} className="row ac g8" style={{padding:'4px 0'}}>
                    <div style={{width:6,height:6,borderRadius:'50%',background:habitColorHex(h.color),flexShrink:0}}/>
                    <span className="t11 flex1">{h.name}</span>
                    <div className="progress-track" style={{width:60}}><div className="progress-fill" style={{width:`${pct*100}%`}}/></div>
                    <span className="mono t9 c3">{done.length}/{due.length}</span>
                  </div>;
                })}
              </div>

              {[
                {key:'whatWentWell',    label:'What went well this week?',  placeholder:'Wins, progress, habits that clicked…'},
                {key:'struggles',       label:'What did I struggle with?',  placeholder:'Challenges, missed habits…'},
                {key:'habitsImproved',  label:'Which habits improved?',     placeholder:'Consistency gains…'},
                {key:'habitsFellOff',   label:'Which habits fell off?',     placeholder:'Habits that slipped…'},
                {key:'nextWeekFocus',   label:'Focus for next week',        placeholder:'What to prioritize…'},
              ].map(({key,label,placeholder})=>(
                <div key={key} className="col g6">
                  <label className="mono t9 c3 uc ls-wide">{label}</label>
                  <textarea className="hab-ta" style={{height:60}} value={weekReviewDraft[key]} onChange={e=>setWeekReviewDraft(p=>({...p,[key]:e.target.value}))} placeholder={placeholder}/>
                </div>
              ))}

              <div className="col g6">
                <label className="mono t9 c3 uc ls-wide">Week rating{weekReviewDraft.weekRating>0?` · ${weekReviewDraft.weekRating}/5`:''}</label>
                <div className="row g4">{[1,2,3,4,5].map(n=>(
                  <button key={n} onClick={()=>{playSound('toggle_on');setWeekReviewDraft(p=>({...p,weekRating:p.weekRating===n?0:n}));}}
                    style={{width:32,height:32,borderRadius:7,border:'1px solid var(--border)',background:'transparent',cursor:'pointer',fontSize:18,color:n<=weekReviewDraft.weekRating?'#e8c070':'var(--text-3)',transition:'color 0.1s'}}>★</button>
                ))}</div>
              </div>

              <div className="row jb ac">
                <span/>
                <button className="btn primary" onClick={saveWeeklyReview}>Save Weekly Review</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="screen">
      <Header
        eyebrow={`${active.length} habits · ${todayDone.length}/${todayDue.length} done today`}
        title="Habits"
        actions={
          <div className="row ac g8">
            {view==='manage' && (<>
              <button className="btn ghost sm" onClick={()=>{playSound('button');setImportOpen(true);}}>Import</button>
              <button className="btn primary" onClick={()=>{playSound('button');setHabitModal({mode:'add'});}}>+ New Habit</button>
            </>)}
            <div className="seg">
              {[['today','Today'],['manage','Manage'],['review','Review']].map(([v,l])=>(
                <button key={v} className={`btn sm ${view===v?'active':''}`} onClick={()=>{playSound('toggle_on');setView(v);}}>{l}</button>
              ))}
            </div>
          </div>
        }
      />

      {view==='today'  && renderToday()}
      {view==='manage' && renderManage()}
      {view==='review' && renderReview()}

      {habitModal && (
        <HabitModal
          initial={habitModal.mode==='edit'?habitModal.habit:null}
          onSave={data=>{onSaveHabit(habitModal.mode==='edit'?{...habitModal.habit,...data}:data);setHabitModal(null);}}
          onCancel={()=>{playSound('button');setHabitModal(null);}}
        />
      )}
      {completeModal && (
        <HabitCompleteModal
          habit={completeModal.habit}
          existingLog={completeModal.existingLog}
          onSave={handleSaveComplete}
          onCancel={()=>{playSound('button');setCompleteModal(null);}}
          onSlip={onSlipHabit}
        />
      )}
      {importOpen && (
        <ImportHabitModal
          onImport={(imported,mode)=>{if(onImportHabits)onImportHabits(imported,mode);setImportOpen(false);}}
          onCancel={()=>{playSound('button');setImportOpen(false);}}
        />
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// APP ROOT
// ═════════════════════════════════════════════════════════
const INIT_POM = {
  workDur:25, breakDur:5, longBreakDur:15, roundsBeforeLong:4,
  phase:'work', round:1, timeLeft:25*60, running:false,
  completedToday:0, sessionLabel:'', attachedTask:'', sessions:[],
};

function App() {
  const [screen, setScreen] = useState('landing');

  // ── State — initialized from localStorage ──────────────
  const [pom, setPom] = useState(() => {
    const settings = loadState('ra_pom_settings', {});
    const sessions  = loadState('ra_pom_sessions',  []);
    const daily     = loadState('ra_pom_daily',     {});
    const today     = new Date().toDateString();
    const workDur   = settings.workDur          ?? INIT_POM.workDur;
    return {
      ...INIT_POM,
      workDur,
      breakDur:         settings.breakDur         ?? INIT_POM.breakDur,
      longBreakDur:     settings.longBreakDur     ?? INIT_POM.longBreakDur,
      roundsBeforeLong: settings.roundsBeforeLong ?? INIT_POM.roundsBeforeLong,
      timeLeft:         workDur * 60,
      sessions,
      completedToday: daily.date === today ? (daily.completedToday || 0) : 0,
    };
  });

  const [taskCols,      setTaskCols]  = useState(() => loadState('ra_tasks',          INIT_COLS));
  const [timerSessions, setTimerSess] = useState(() => loadState('ra_timer_sessions', []));
  const [accomplishments, setAccomplishments] = useState(() => loadState('ra_accomplishments', []));
  const [calEvents,     setCalEvents] = useState(() => loadState('ra_calendar_events', []));
  const [habits,        setHabits]        = useState(() => loadState('ra_habits',         []));
  const [habitLogs,     setHabitLogs]     = useState(() => loadState('ra_habit_logs',     []));
  const [dailyReviews,  setDailyReviews]  = useState(() => loadState('ra_daily_reviews',  []));
  const [weeklyReviews, setWeeklyReviews] = useState(() => loadState('ra_weekly_reviews', []));
  const [theme,         setThemeState]    = useState(() => loadState('ra_theme', 'dark'));
  const [bgChoice,    setBgChoice]    = useState(() => loadState('ra_bg',      'hall'));
  const [bgFilter,    setBgFilter]    = useState(() => loadState('ra_filter',  'clean'));
  const [profile,     setProfile]     = useState(() => loadState('ra_profile', DEFAULT_PROFILE));
  const [soundMuted,  _setSoundMuted] = useState(() => soundCtrl.muted);
  const [acModal,     setAcModal]     = useState(null);
  // Auto-open on first visit (when no name is saved yet)
  const [profileOpen, setProfileOpen] = useState(() => !loadState('ra_profile', DEFAULT_PROFILE).name.trim());

  // ── Persistence useEffects ─────────────────────────────
  useEffect(() => {
    saveState('ra_pom_settings', {
      workDur:          pom.workDur,
      breakDur:         pom.breakDur,
      longBreakDur:     pom.longBreakDur,
      roundsBeforeLong: pom.roundsBeforeLong,
    });
  }, [pom.workDur, pom.breakDur, pom.longBreakDur, pom.roundsBeforeLong]);

  useEffect(() => {
    saveState('ra_pom_sessions', pom.sessions.slice(-200));
  }, [pom.sessions]);

  useEffect(() => {
    saveState('ra_pom_daily', { date: new Date().toDateString(), completedToday: pom.completedToday });
  }, [pom.completedToday]);

  useEffect(() => { saveState('ra_tasks',           taskCols);                          }, [taskCols]);
  useEffect(() => { saveState('ra_timer_sessions',  timerSessions.slice(-200));         }, [timerSessions]);
  useEffect(() => { saveState('ra_accomplishments', accomplishments.map(serializeAcc)); }, [accomplishments]);
  useEffect(() => { saveState('ra_profile',         profile);                           }, [profile]);
  useEffect(() => { saveState('ra_calendar_events', calEvents);                         }, [calEvents]);
  useEffect(() => { saveState('ra_habits',          habits);                            }, [habits]);
  useEffect(() => { saveState('ra_habit_logs',      habitLogs.slice(-2000));            }, [habitLogs]);
  useEffect(() => { saveState('ra_daily_reviews',   dailyReviews.slice(-365));          }, [dailyReviews]);
  useEffect(() => { saveState('ra_weekly_reviews',  weeklyReviews.slice(-104));         }, [weeklyReviews]);
  useEffect(() => {
    saveState('ra_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Apply saved theme immediately on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, []); // eslint-disable-line

  // ── Sound ──────────────────────────────────────────────
  const toggleSound = () => {
    const next = !soundCtrl.muted;
    soundCtrl.muted = next;
    _setSoundMuted(next);
    safeLS.set('ra_sound_muted', String(next));
    if (!next) playSound('button');
  };

  // ── Pomodoro tick ──────────────────────────────────────
  const pomRef = useRef(pom);
  pomRef.current = pom;

  useEffect(() => {
    if (!pom.running) return;
    const id = setInterval(() => {
      const p = pomRef.current;
      if (!p.running) return;
      if (p.timeLeft <= 0) {
        playSound('notification');
        setPom({ ...advancePhase(p), running: true });
      } else {
        setPom(s => ({ ...s, timeLeft: s.timeLeft - 1 }));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [pom.running]);

  // ── Computed ───────────────────────────────────────────
  const allSessions   = [...pom.sessions, ...timerSessions];
  const taskFocusMap  = computeTaskFocus(allSessions);
  const accomplishMap = computeTaskAccomplishments(accomplishments);
  const taskTitles    = [...taskCols.burner,...taskCols.active,...taskCols.completed].map(t => t.title);

  // ── Handlers ───────────────────────────────────────────
  const handleSetBgChoice = v => { setBgChoice(v); saveState('ra_bg', v);     playSound('button');    };
  const handleSetBgFilter = v => { setBgFilter(v); saveState('ra_filter', v); playSound('toggle_on'); };

  const handleOpenAccModal    = accOrNull => { playSound('button'); setAcModal(accOrNull ? {mode:'edit', acc:accOrNull} : {mode:'add', prefill:null}); };
  const handlePostFromSession = prefill   => { playSound('button'); setAcModal({mode:'add', prefill}); };

  const handleSaveAccomplishment = (data, moveLinkedToCompleted) => {
    setAccomplishments(prev =>
      acModal.mode==='add'
        ? [...prev, {id:Date.now(),...data}]
        : prev.map(a => a.id===acModal.acc.id ? {...acModal.acc,...data} : a)
    );
    if (moveLinkedToCompleted && data.linkedTask) {
      const key = data.linkedTask.toLowerCase().trim();
      let found=null, fromCol=null;
      for (const col of ['burner','active']) {
        const t = taskCols[col].find(t => t.title.toLowerCase()===key);
        if (t) { found=t; fromCol=col; break; }
      }
      if (found && fromCol) {
        playSound('toggle_on');
        setTaskCols(c => ({...c,[fromCol]:c[fromCol].filter(t=>t.id!==found.id),completed:[found,...c.completed]}));
      }
    }
    playSound(acModal.mode==='add' ? 'notification' : 'button');
    setAcModal(null);
  };

  const handleSaveCalEvent = ev => {
    setCalEvents(prev => prev.some(e => e.id===ev.id) ? prev.map(e => e.id===ev.id ? ev : e) : [...prev, ev]);
  };
  const handleDeleteCalEvent = id => { setCalEvents(prev => prev.filter(e => e.id!==id)); };

  const handleSetTheme = t => { setThemeState(t); };

  const handleImportCal = (events, mode) => {
    if (mode === 'replace') setCalEvents(events);
    else setCalEvents(prev => [...prev, ...events]);
    playSound('notification');
  };

  const handleImportHabits = (imported, mode) => {
    if (mode === 'replace') { setHabits(imported); setHabitLogs([]); }
    else setHabits(prev => [...prev, ...imported]);
    playSound('notification');
  };

  const handleSaveWeeklyReview = review => {
    setWeeklyReviews(prev => prev.some(r=>r.weekStart===review.weekStart) ? prev.map(r=>r.weekStart===review.weekStart?review:r) : [...prev, review]);
  };

  const handleSlipHabit = (id, note) => {
    const now = Date.now();
    setHabits(prev => prev.map(h => h.id===id ? {...h, lastOccurrence:now, updatedAt:now} : h));
    const slipLog = { id: now, habitId: id, date: todayHabitStr(), completedAt: null, note, isSlip: true, createdAt: now, updatedAt: now };
    setHabitLogs(prev => [...prev, slipLog]);
    playSound('toggle_on');
  };

  const handleSaveHabit = habit => {
    setHabits(prev => prev.some(h => h.id===habit.id) ? prev.map(h=>h.id===habit.id?habit:h) : [...prev, habit]);
    playSound('button');
  };
  const handleDeleteHabit = id => {
    setHabits(prev => prev.filter(h => h.id!==id));
    setHabitLogs(prev => prev.filter(l => l.habitId!==id));
    playSound('button');
  };
  const handleArchiveHabit = (id, archived=true) => {
    setHabits(prev => prev.map(h => h.id===id ? {...h, archived, updatedAt:Date.now()} : h));
    playSound('toggle_on');
  };
  const handleSaveLog = log => {
    setHabitLogs(prev => prev.some(l=>l.id===log.id) ? prev.map(l=>l.id===log.id?log:l) : [...prev, log]);
  };
  const handleDeleteLog = id => { setHabitLogs(prev => prev.filter(l => l.id!==id)); };
  const handleSaveDailyReview = review => {
    setDailyReviews(prev => prev.some(r=>r.date===review.date) ? prev.map(r=>r.date===review.date?review:r) : [...prev, review]);
  };

  const handleSaveProfile = updated => {
    setProfile(updated);
    playSound('button');
    setProfileOpen(false);
  };

  const profileSetupDone = !!profile.name.trim();

  const profileModalNode = profileOpen && (
    <ProfileModal
      profile={profile}
      isFirstRun={!profileSetupDone}
      onSave={handleSaveProfile}
      onCancel={profileSetupDone ? () => { playSound('button'); setProfileOpen(false); } : () => {}}
      theme={theme}
      onSetTheme={handleSetTheme}
    />
  );

  // ── Render ─────────────────────────────────────────────
  if (screen === 'landing') return (
    <>
      <Landing onNavigate={setScreen}/>
      {acModal && <AccomplishmentModal mode={acModal.mode} initial={acModal.mode==='edit'?acModal.acc:acModal.prefill} taskTitles={taskTitles} taskCols={taskCols} onSave={handleSaveAccomplishment} onCancel={() => { playSound('button'); setAcModal(null); }}/>}
      {profileModalNode}
    </>
  );

  return (
    <>
      <AppShell screen={screen} onNavigate={setScreen}
        bgChoice={bgChoice} bgFilter={bgFilter}
        onSetBgChoice={handleSetBgChoice} onSetBgFilter={handleSetBgFilter}
        soundMuted={soundMuted} onToggleSound={toggleSound}
        onOpenProfile={() => { playSound('button'); setProfileOpen(true); }}>
        {screen==='pomodoro' && <Pomodoro pomState={pom} setPomState={setPom} taskTitles={taskTitles} onPostAccomplishment={handlePostFromSession}/>}
        {screen==='timer'    && <TimerScreen sessions={timerSessions} onAddSession={s=>setTimerSess(prev=>[...prev,s])} taskTitles={taskTitles} onPostAccomplishment={handlePostFromSession}/>}
        {screen==='tasks'    && <Tasks cols={taskCols} setCols={setTaskCols} focusData={taskFocusMap} accomplishmentMap={accomplishMap}/>}
        {screen==='accomplishments' && <Accomplishments accomplishments={accomplishments} setAccomplishments={setAccomplishments} onOpenModal={handleOpenAccModal}/>}
        {screen==='calendar'       && <CalendarScreen events={calEvents} onSaveEvent={handleSaveCalEvent} onDeleteEvent={handleDeleteCalEvent} onImportCal={handleImportCal}/>}
        {screen==='habits'         && <HabitsScreen habits={habits} habitLogs={habitLogs} dailyReviews={dailyReviews} weeklyReviews={weeklyReviews} onSaveHabit={handleSaveHabit} onDeleteHabit={handleDeleteHabit} onArchiveHabit={handleArchiveHabit} onSaveLog={handleSaveLog} onDeleteLog={handleDeleteLog} onSaveDailyReview={handleSaveDailyReview} onSaveWeeklyReview={handleSaveWeeklyReview} onSlipHabit={handleSlipHabit} onImportHabits={handleImportHabits}/>}
      </AppShell>
      {acModal && (
        <AccomplishmentModal
          mode={acModal.mode}
          initial={acModal.mode==='edit' ? acModal.acc : acModal.prefill}
          taskTitles={taskTitles}
          taskCols={taskCols}
          onSave={handleSaveAccomplishment}
          onCancel={() => { playSound('button'); setAcModal(null); }}
        />
      )}
      {profileModalNode}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
