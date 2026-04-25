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

const safeLS = {
  get: (k, def) => { try { return localStorage.getItem(k) || def; } catch(e) { return def; } },
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
};

const NAV = [
  { id: 'pomodoro',        label: 'Pomodoro'        },
  { id: 'timer',           label: 'Timer'           },
  { id: 'tasks',           label: 'Tasks'           },
  { id: 'accomplishments', label: 'Accomplishments' },
];

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
function Sidebar({ screen, onNavigate, bgPanelOpen, onToggleBgPanel, soundMuted, onToggleSound }) {
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
function AppShell({ screen, onNavigate, bgChoice, bgFilter, onSetBgChoice, onSetBgFilter, soundMuted, onToggleSound, children }) {
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
    setAccomplishments(prev => {
      const next = prev.filter(a => a.id!==id);
      safeLS.set('ra_accomplishments', JSON.stringify(next.map(serializeAcc)));
      return next;
    });
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
// APP ROOT
// ═════════════════════════════════════════════════════════
const INIT_POM = {
  workDur:25, breakDur:5, longBreakDur:15, roundsBeforeLong:4,
  phase:'work', round:1, timeLeft:25*60, running:false,
  completedToday:0, sessionLabel:'', attachedTask:'', sessions:[],
};

function App() {
  const [screen,        setScreen]    = useState('landing');
  const [pom,           setPom]       = useState(INIT_POM);
  const [taskCols,      setTaskCols]  = useState(INIT_COLS);
  const [timerSessions, setTimerSess] = useState([]);
  const [accomplishments, setAccomplishments] = useState(() => {
    try { return JSON.parse(safeLS.get('ra_accomplishments','[]')); } catch(e) { return []; }
  });
  const [acModal,   setAcModal]   = useState(null);
  const [bgChoice,    setBgChoice]    = useState(() => safeLS.get('ra_bg',     'hall'));
  const [bgFilter,    setBgFilter]    = useState(() => safeLS.get('ra_filter', 'clean'));
  const [soundMuted,  _setSoundMuted] = useState(() => soundCtrl.muted);

  const toggleSound = () => {
    const next = !soundCtrl.muted;
    soundCtrl.muted = next;
    _setSoundMuted(next);
    safeLS.set('ra_sound_muted', String(next));
    if (!next) playSound('button');
  };

  const pomRef = useRef(pom);
  pomRef.current = pom;

  // Global Pomodoro tick
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

  // Computed
  const allSessions      = [...pom.sessions, ...timerSessions];
  const taskFocusMap     = computeTaskFocus(allSessions);
  const accomplishMap    = computeTaskAccomplishments(accomplishments);
  const taskTitles       = [...taskCols.burner,...taskCols.active,...taskCols.completed].map(t => t.title);

  const handleSetBgChoice = v => { setBgChoice(v); safeLS.set('ra_bg', v); playSound('button'); };
  const handleSetBgFilter = v => { setBgFilter(v); safeLS.set('ra_filter', v); playSound('toggle_on'); };

  const handleOpenAccModal = accOrNull => {
    playSound('button');
    setAcModal(accOrNull ? {mode:'edit', acc:accOrNull} : {mode:'add', prefill:null});
  };
  const handlePostFromSession = prefill => {
    playSound('button');
    setAcModal({mode:'add', prefill});
  };
  const handleSaveAccomplishment = (data, moveLinkedToCompleted) => {
    setAccomplishments(prev => {
      const next = acModal.mode==='add'
        ? [...prev, {id:Date.now(),...data}]
        : prev.map(a => a.id===acModal.acc.id ? {...acModal.acc,...data} : a);
      safeLS.set('ra_accomplishments', JSON.stringify(next.map(serializeAcc)));
      return next;
    });
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

  if (screen === 'landing') return (
    <>
      <Landing onNavigate={setScreen}/>
      {acModal && <AccomplishmentModal mode={acModal.mode} initial={acModal.mode==='edit'?acModal.acc:acModal.prefill} taskTitles={taskTitles} taskCols={taskCols} onSave={handleSaveAccomplishment} onCancel={() => { playSound('button'); setAcModal(null); }}/>}
    </>
  );

  return (
    <>
      <AppShell screen={screen} onNavigate={setScreen}
        bgChoice={bgChoice} bgFilter={bgFilter}
        onSetBgChoice={handleSetBgChoice} onSetBgFilter={handleSetBgFilter}
        soundMuted={soundMuted} onToggleSound={toggleSound}>
        {screen==='pomodoro' && <Pomodoro pomState={pom} setPomState={setPom} taskTitles={taskTitles} onPostAccomplishment={handlePostFromSession}/>}
        {screen==='timer'    && <TimerScreen sessions={timerSessions} onAddSession={s=>setTimerSess(prev=>[...prev,s])} taskTitles={taskTitles} onPostAccomplishment={handlePostFromSession}/>}
        {screen==='tasks'    && <Tasks cols={taskCols} setCols={setTaskCols} focusData={taskFocusMap} accomplishmentMap={accomplishMap}/>}
        {screen==='accomplishments' && <Accomplishments accomplishments={accomplishments} setAccomplishments={setAccomplishments} onOpenModal={handleOpenAccModal}/>}
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
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
