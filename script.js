// Roberto's Aid — Minimal Cinematic Command Center

const { useState, useEffect, useRef, useCallback } = React;

// ─── Utilities ───────────────────────────────────────────
const pad   = n  => String(Math.floor(n)).padStart(2, '0');
const fmt2  = s  => `${pad(s / 60)}:${pad(s % 60)}`;
const fmtH  = s  => s >= 3600 ? `${pad(s/3600)}:${pad((s%3600)/60)}:${pad(s%60)}` : fmt2(s);
const fmtTs = ts => new Date(ts).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:false });

// ─── Icons ────────────────────────────────────────────────
const SvgIcon = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none"
    stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

const Icons = {
  pomodoro: <SvgIcon d={<><circle cx="10" cy="10" r="7.5" strokeDasharray="24 23" strokeDashoffset="6"/><circle cx="10" cy="10" r="2.5" fill="currentColor" stroke="none"/></>}/>,
  timer:    <SvgIcon d={<><circle cx="10" cy="11" r="6.5"/><line x1="10" y1="11" x2="10" y2="7"/><line x1="10" y1="11" x2="13" y2="13"/><line x1="7" y1="3" x2="13" y2="3"/></>}/>,
  tasks:    <SvgIcon d={<><line x1="7" y1="6" x2="16" y2="6"/><line x1="7" y1="10" x2="16" y2="10"/><line x1="7" y1="14" x2="13" y2="14"/><circle cx="4" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="4" cy="10" r="1.2" fill="currentColor" stroke="none"/><circle cx="4" cy="14" r="1.2" fill="currentColor" stroke="none"/></>}/>,
};

const NAV = [
  { id: 'pomodoro', label: 'Pomodoro' },
  { id: 'timer',    label: 'Timer'    },
  { id: 'tasks',    label: 'Tasks'    },
];

// ─── Landing: vertical wheel selector ─────────────────────
function Landing({ onNavigate }) {
  const [sel, setSel] = useState(0);
  const landingRef    = useRef(null);
  const selRef        = useRef(sel);
  selRef.current      = sel;

  const go   = useCallback(dir => setSel(i => Math.max(0, Math.min(NAV.length - 1, i + dir))), []);
  const open = useCallback(() => onNavigate(NAV[selRef.current].id), [onNavigate]);

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
        <source src="looping space.mp4" type="video/mp4"/>
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
                onClick={() => isSel ? open() : setSel(i)}>
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
function Sidebar({ screen, onNavigate }) {
  return (
    <nav className="sidebar">
      <button className="sidebar-logo" onClick={() => onNavigate('landing')} title="Home">
        <span className="sidebar-logo-text">R·A</span>
      </button>
      <div className="sidebar-nav">
        {NAV.map(({ id, label }) => (
          <button key={id}
            className={`sidebar-btn ${screen === id ? 'active' : ''}`}
            onClick={() => onNavigate(id)} data-tip={label}>
            {Icons[id]}
          </button>
        ))}
      </div>
    </nav>
  );
}

function AppShell({ screen, onNavigate, children }) {
  return (
    <div className="app-shell">
      <div className="app-bg">
        <img src="genricparticle.png" className="app-bg-img" alt=""/>
        <div className="app-bg-overlay"/>
      </div>
      <Sidebar screen={screen} onNavigate={onNavigate}/>
      <div className="main fade-in">{children}</div>
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
// POMODORO — custom cycle builder
// ═════════════════════════════════════════════════════════

// Duration picker used in the Pomodoro config panel
function DurInput({ label, value, onChange, chips }) {
  const [local, setLocal] = useState(String(value));
  useEffect(() => setLocal(String(value)), [value]);
  const commit = () => {
    const n = Math.max(1, parseInt(local) || 1);
    onChange(n);
    setLocal(String(n));
  };
  return (
    <div className="col g5">
      <div className="mono t9 c3 uc">{label}</div>
      <div className="row ac g6">
        <div className="field" style={{width:58,flexShrink:0}}>
          <input type="number" min="1" max="480" value={local}
            onChange={e => setLocal(e.target.value)}
            onBlur={commit}
            onKeyDown={e => e.key === 'Enter' && commit()}
            style={{width:'100%',textAlign:'center'}} className="mono t13"/>
        </div>
        <span className="mono t9 c3" style={{flexShrink:0}}>min</span>
      </div>
      <div className="row g4 wrap">
        {chips.map(m => (
          <button key={m} className={`btn sm ${value === m ? 'primary' : 'ghost'}`}
            onClick={() => onChange(m)}>{m}m</button>
        ))}
      </div>
    </div>
  );
}

// Compute next phase when the current one ends or is skipped.
// Does NOT set running — caller decides that.
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
    ? { id: Date.now(), label: p.sessionLabel || 'Work', duration: p.workDur, at: Date.now() }
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

function Pomodoro({ pomState: p, setPomState }) {
  const {
    workDur, breakDur, longBreakDur, roundsBeforeLong,
    phase, round, timeLeft, running, completedToday,
    sessionLabel, attachedTask, sessions,
  } = p;

  const totalSecs = phase === 'work' ? workDur * 60 : phase === 'longBreak' ? longBreakDur * 60 : breakDur * 60;
  const pct       = Math.max(0, Math.min(1, 1 - timeLeft / totalSecs));
  const R = 120, C = 2 * Math.PI * R;
  const ringAngle = pct * 360 - 90; // degrees, for the head dot

  const phaseLabel = { work: 'Work', break: 'Break', longBreak: 'Long Break' }[phase];

  const toggle  = () => setPomState(s => ({ ...s, running: !s.running }));
  const reset   = () => setPomState(s => ({ ...s, running: false, phase: 'work', round: 1, timeLeft: s.workDur * 60 }));
  const skip    = () => setPomState(s => advancePhase(s)); // preserves running state

  const setDur  = (key, mins) => setPomState(s => {
    const out = { ...s, [key]: mins };
    if (!s.running) {
      if (key === 'workDur'      && s.phase === 'work')      out.timeLeft = mins * 60;
      if (key === 'breakDur'     && s.phase === 'break')     out.timeLeft = mins * 60;
      if (key === 'longBreakDur' && s.phase === 'longBreak') out.timeLeft = mins * 60;
    }
    return out;
  });

  const numDots = Math.min(roundsBeforeLong > 0 ? roundsBeforeLong : 4, 8);

  const tOpts = running ? 'stroke-dashoffset 1.05s linear' : 'none';

  return (
    <div className="screen">
      <Header
        eyebrow={`Round ${round} · ${phaseLabel} · ${completedToday} completed today`}
        title="Pomodoro"
      />

      <div className="row g20 flex1" style={{minHeight:0}}>
        {/* ── Left: ring ───────────────────────────────── */}
        <div className="panel flex1 col ac jc red-rim of-h rel">
          <div className="abs" style={{inset:0,background:'radial-gradient(circle at center,rgba(192,57,43,0.06),transparent 60%)',pointerEvents:'none'}}/>
          <div className="mono t10 c3 uc ls-wide" style={{position:'absolute',top:24,left:0,right:0,textAlign:'center'}}>
            {phaseLabel} · {fmt2(timeLeft)} remaining
          </div>

          <svg width="340" height="340" viewBox="0 0 360 360">
            <defs>
              <filter id="pomo-glow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="4"/>
              </filter>
            </defs>
            {/* Decorative outer ring */}
            <circle cx="180" cy="180" r="155" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="2 5"/>
            {/* Tick marks */}
            {Array.from({length:60},(_,i)=>{
              const a  = (i/60)*Math.PI*2 - Math.PI/2;
              const r1 = R+14, r2 = i%5===0 ? R+24 : R+19;
              return <line key={i}
                x1={180+Math.cos(a)*r1} y1={180+Math.sin(a)*r1}
                x2={180+Math.cos(a)*r2} y2={180+Math.sin(a)*r2}
                stroke={i%5===0?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.07)'} strokeWidth="1"/>;
            })}
            {/* Track */}
            <circle cx="180" cy="180" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10"/>
            {/* Progress glow — smooth via CSS transition */}
            <circle cx="180" cy="180" r={R} fill="none"
              stroke="rgba(192,57,43,0.35)" strokeWidth="14"
              strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C*(1-pct)}
              transform="rotate(-90 180 180)" filter="url(#pomo-glow)"
              style={{transition:tOpts}}/>
            {/* Progress crisp */}
            <circle cx="180" cy="180" r={R} fill="none"
              stroke="#c0392b" strokeWidth="4"
              strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C*(1-pct)}
              transform="rotate(-90 180 180)"
              style={{transition:tOpts}}/>
            {/* Head dot — CSS rotation for smooth movement */}
            {pct > 0.005 && (
              <g style={{
                transformOrigin:'180px 180px',
                transform:`rotate(${ringAngle}deg)`,
                transition: running ? 'transform 1.05s linear' : 'none',
              }}>
                <circle cx={180+R} cy={180} r="10" fill="rgba(192,57,43,0.4)" filter="url(#pomo-glow)"/>
                <circle cx={180+R} cy={180} r="5"  fill="#e05050"/>
                <circle cx={180+R} cy={180} r="2.5" fill="#fff"/>
              </g>
            )}
            {/* Center text */}
            <text x="180" y="168" textAnchor="middle"
              fontFamily="'JetBrains Mono',monospace" fontSize="11" fill="#484848" letterSpacing="3">
              {phaseLabel.toUpperCase()}
            </text>
            <text x="180" y="210" textAnchor="middle"
              fontFamily="'Space Grotesk',sans-serif" fontSize="56" fontWeight="300" fill="#e8e8e8">
              {fmt2(timeLeft)}
            </text>
            <text x="180" y="232" textAnchor="middle"
              fontFamily="'JetBrains Mono',monospace" fontSize="9" fill="#444" letterSpacing="2">
              {Math.round(pct*100)}% COMPLETE
            </text>
          </svg>

          {/* Controls */}
          <div className="row g12 ac" style={{marginTop:-4,zIndex:1}}>
            <button className="btn ghost" style={{width:40,height:40,borderRadius:'50%'}} onClick={reset} title="Reset">↺</button>
            <button className="btn primary" style={{width:64,height:52,borderRadius:14,fontSize:20}} onClick={toggle}>
              {running ? '❚❚' : '▶'}
            </button>
            <button className="btn ghost" style={{width:40,height:40,borderRadius:'50%'}} onClick={skip} title="Skip phase">⏭</button>
          </div>

          {/* Round progress dots */}
          <div className="row g6" style={{marginTop:18}}>
            {Array.from({length:numDots},(_,i) => {
              const done = (i+1) < round;
              const cur  = (i+1) === round && phase === 'work';
              return <div key={i} style={{
                width:18, height:4, borderRadius:2,
                background: done ? '#c0392b' : cur ? 'rgba(192,57,43,0.45)' : 'rgba(255,255,255,0.08)',
                boxShadow: done ? '0 0 6px rgba(192,57,43,0.4)' : 'none',
              }}/>;
            })}
          </div>
        </div>

        {/* ── Right: config + history ───────────────────── */}
        <div className="col g12 of-a" style={{width:292,flexShrink:0}}>

          {/* Cycle builder */}
          <div className="panel p16 col g14">
            <div className="mono t9 c3 uc ls-wide">Work / break cycle</div>
            <DurInput label="Work" value={workDur}
              onChange={v => setDur('workDur', v)} chips={[25,45,60,90]}/>
            <DurInput label="Break" value={breakDur}
              onChange={v => setDur('breakDur', v)} chips={[5,10,15]}/>
            <DurInput label="Long break" value={longBreakDur}
              onChange={v => setDur('longBreakDur', v)} chips={[15,30]}/>

            <div className="col g5">
              <div className="mono t9 c3 uc">Rounds before long break <span className="c3" style={{fontWeight:400}}>(0 = off)</span></div>
              <div className="row ac g6">
                <div className="field" style={{width:58,flexShrink:0}}>
                  <input type="number" min="0" max="20" value={roundsBeforeLong}
                    onChange={e => setPomState(s => ({ ...s, roundsBeforeLong: Math.max(0, parseInt(e.target.value)||0) }))}
                    style={{width:'100%',textAlign:'center'}} className="mono t13"/>
                </div>
                <span className="mono t9 c3">rounds</span>
                <div className="row g4">
                  {[2,3,4].map(n => (
                    <button key={n} className={`btn sm ${roundsBeforeLong===n?'primary':'ghost'}`}
                      onClick={() => setPomState(s=>({...s,roundsBeforeLong:n}))}>{n}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Session info */}
          <div className="panel p16 col g10">
            <div className="mono t9 c3 uc ls-wide">Session</div>
            <div className="col g4">
              <div className="mono t9 c3">Label</div>
              <div className="field">
                <input value={sessionLabel} placeholder="e.g. Physics Homework"
                  onChange={e => setPomState(s => ({ ...s, sessionLabel: e.target.value }))}/>
              </div>
            </div>
            <div className="col g4">
              <div className="mono t9 c3">Attached task</div>
              <div className="field">
                <input value={attachedTask} placeholder="Task name…"
                  onChange={e => setPomState(s => ({ ...s, attachedTask: e.target.value }))}/>
              </div>
            </div>
          </div>

          {/* Today summary */}
          <div className="panel p14 row jb ac">
            <div className="mono t9 c3">Today</div>
            <div className="mono t11">{completedToday} sessions · {completedToday * workDur}m focused</div>
          </div>

          {/* Session log */}
          {sessions.length > 0 && (
            <div className="panel p16 col g6 of-a" style={{maxHeight:170}}>
              <div className="mono t9 c3 uc ls-wide" style={{marginBottom:4}}>Session log</div>
              {[...sessions].reverse().slice(0,12).map(s => (
                <div key={s.id} className="row jb ac" style={{padding:'5px 0',borderBottom:'1px solid var(--border)'}}>
                  <div className="row ac g8">
                    <div style={{width:5,height:5,borderRadius:'50%',background:'var(--red-2)',flexShrink:0}}/>
                    <span className="t11 c2">{s.label}</span>
                  </div>
                  <div className="row ac g10">
                    <span className="mono t9 c3">{s.duration}m</span>
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
function TimerScreen() {
  const [mode,     setMode]   = useState('countdown');
  const [secs,     setSecs]   = useState(25*60);
  const [elapsed,  setEl]     = useState(0);
  const [running,  setRun]    = useState(false);
  const [preset,   setPre]    = useState(3);
  const [label,    setLabel]  = useState('');
  const [sessions, setSess]   = useState([]);
  const iRef      = useRef(null);
  const labelRef  = useRef(label);
  const presetRef = useRef(preset);
  labelRef.current  = label;
  presetRef.current = preset;

  const PRESETS = [
    {d:'5m',s:300},{d:'10m',s:600},{d:'15m',s:900},{d:'25m',s:1500},
    {d:'45m',s:2700},{d:'1h',s:3600},{d:'2h',s:7200},
  ];

  useEffect(() => {
    if (!running) { clearInterval(iRef.current); return; }
    iRef.current = setInterval(() => {
      if (mode === 'countdown') {
        setSecs(t => {
          if (t <= 0) {
            setRun(false);
            const lbl = labelRef.current.trim();
            if (lbl) setSess(s => [...s, { id: Date.now(), label: lbl, duration: PRESETS[presetRef.current].s, at: Date.now() }]);
            return 0;
          }
          return t - 1;
        });
      } else {
        setEl(e => e + 1);
      }
    }, 1000);
    return () => clearInterval(iRef.current);
  }, [running, mode]);

  const applyPreset = i => { setPre(i); setSecs(PRESETS[i].s); setRun(false); };
  const reset = () => {
    setRun(false);
    if (mode === 'countdown') setSecs(PRESETS[preset].s);
    else setEl(0);
  };
  const logStopwatch = () => {
    const lbl = label.trim();
    if (!lbl || elapsed === 0) return;
    setSess(s => [...s, { id: Date.now(), label: lbl, duration: elapsed, at: Date.now() }]);
  };

  const display = mode === 'countdown' ? secs : elapsed;

  return (
    <div className="screen">
      <Header
        eyebrow={mode === 'countdown' ? 'Countdown timer' : 'Stopwatch · manual pause'}
        title="Timer"
        actions={
          <div className="seg">
            <button className={`btn sm ${mode==='countdown'?'active red':''}`}
              onClick={() => { setMode('countdown'); setRun(false); }}>Timer</button>
            <button className={`btn sm ${mode==='stopwatch'?'active red':''}`}
              onClick={() => { setMode('stopwatch'); setRun(false); setEl(0); }}>Stopwatch</button>
          </div>
        }
      />

      <div className="row g24 flex1" style={{minHeight:0}}>
        {/* Main display */}
        <div className="panel flex1 col ac jc of-h rel">
          <div className="abs" style={{inset:0,background:'radial-gradient(circle at center,rgba(192,57,43,0.04),transparent 55%)',pointerEvents:'none'}}/>
          <div className="mono t10 c3 uc ls-wide" style={{marginBottom:24}}>
            {mode==='countdown' ? '◷ Countdown' : '⏱ Stopwatch'}
          </div>
          <div className="disp fw3" style={{fontSize:80,lineHeight:1,letterSpacing:'-0.02em',color:'#e8e8e8'}}>
            {fmtH(display)}
          </div>
          {mode==='countdown' && (
            <div className="row g6 ac" style={{marginTop:28,flexWrap:'wrap',justifyContent:'center'}}>
              {PRESETS.map((p,i) => (
                <button key={p.d} className={`btn sm ${i===preset?'primary':''}`}
                  onClick={() => applyPreset(i)}>{p.d}</button>
              ))}
            </div>
          )}
          <div className="row g12 ac" style={{marginTop:32}}>
            <button className="btn ghost" style={{width:42,height:42,borderRadius:'50%'}} onClick={reset}>↺</button>
            <button className="btn primary" style={{width:64,height:52,borderRadius:14,fontSize:20}}
              onClick={() => setRun(r => !r)}>
              {running ? '❚❚' : '▶'}
            </button>
          </div>
          <div className="mono t10 c3 uc" style={{marginTop:28,letterSpacing:'0.18em'}}>
            {running ? '● RUNNING' : '● STANDING BY'}
          </div>
        </div>

        {/* Right panel */}
        <div className="col g12" style={{width:220,flexShrink:0}}>
          <div className="panel p20 col g12">
            <div className="mono t9 c3 uc ls-wide">Session label</div>
            <div className="field">
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Label this session…"/>
            </div>
            <div className="row g6 wrap">
              {['Work','Study','Workout','Break','Read'].map(t => (
                <span key={t} className="tag" style={{cursor:'pointer'}} onClick={() => setLabel(t)}>{t}</span>
              ))}
            </div>
            {mode === 'stopwatch' && elapsed > 0 && label.trim() && (
              <button className="btn sm primary" style={{marginTop:4}} onClick={logStopwatch}>+ Log session</button>
            )}
          </div>

          {sessions.length > 0 && (
            <div className="panel p16 col g6 of-a" style={{maxHeight:240}}>
              <div className="mono t9 c3 uc ls-wide" style={{marginBottom:4}}>Session log</div>
              {[...sessions].reverse().slice(0,12).map(s => (
                <div key={s.id} className="row jb ac" style={{padding:'5px 0',borderBottom:'1px solid var(--border)'}}>
                  <div className="row ac g8">
                    <div style={{width:5,height:5,borderRadius:'50%',background:'rgba(192,57,43,0.7)',flexShrink:0}}/>
                    <span className="t11 c2">{s.label}</span>
                  </div>
                  <div className="row ac g8">
                    <span className="mono t9 c3">{fmtH(s.duration)}</span>
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
// TASKS — sprint board with drag and drop
// ═════════════════════════════════════════════════════════
const INIT_COLS = {
  burner: [
    { id:1, title:'Clear email backlog',        label:'Admin',    est:'20m', priority:'high' },
    { id:2, title:'Reply to messages',          label:'Admin',    est:'15m', priority:'med'  },
  ],
  active: [
    { id:3, title:'Deep work · project draft', label:'Work',     est:'2h',  priority:'high' },
    { id:4, title:'Review study notes',         label:'Learning', est:'60m', priority:'high' },
  ],
  completed: [
    { id:5, title:'Morning journal',            label:'Personal', est:'15m', priority:'low'  },
    { id:6, title:'Plan this week',             label:'Planning', est:'20m', priority:'med'  },
  ],
};

const COL_KEYS = ['burner', 'active', 'completed'];
const COL_META = {
  burner:    { label:'Burner',    desc:'Urgent · must-do', accent:'var(--red-2)'  },
  active:    { label:'Active',    desc:'In progress',      accent:'var(--text-2)' },
  completed: { label:'Completed', desc:'Done',             accent:'var(--text-3)' },
};

const PRIO_STYLE = {
  high: { bg:'rgba(192,57,43,0.1)', bd:'rgba(192,57,43,0.3)', c:'#d88' },
  med:  { bg:'rgba(255,255,255,0.04)', bd:'rgba(255,255,255,0.1)', c:'var(--text-3)' },
  low:  { bg:'rgba(255,255,255,0.02)', bd:'rgba(255,255,255,0.06)', c:'var(--text-3)' },
};

// Quick-add parses: "Title · Label · 30m · high"
function parseQuickAdd(str) {
  const parts = str.split('·').map(s => s.trim());
  const title = parts[0] || '';
  const label = parts[1] || '';
  const est   = (parts.find(p => /^\d+[mh]$/i.test(p)) || '');
  const priority = parts.find(p => /^(high|med|low)$/i.test(p))?.toLowerCase() || 'med';
  return { id: Date.now(), title, label, est, priority };
}

function Tasks() {
  const [cols,     setCols]    = useState(INIT_COLS);
  const [input,    setInput]   = useState('');
  const [dragging, setDragging] = useState(null); // { col, id }
  const [dragOver, setDragOver] = useState(null); // col name

  const addTask = () => {
    if (!input.trim()) return;
    const task = parseQuickAdd(input.trim());
    setCols(c => ({ ...c, burner: [task, ...c.burner] }));
    setInput('');
  };

  const moveTask = (fromCol, id, toCol) => {
    if (fromCol === toCol) return;
    const task = cols[fromCol].find(t => t.id === id);
    setCols(c => ({
      ...c,
      [fromCol]: c[fromCol].filter(t => t.id !== id),
      [toCol]:   [task, ...c[toCol]],
    }));
  };

  const deleteTask = (col, id) => setCols(c => ({ ...c, [col]: c[col].filter(t => t.id !== id) }));

  // ── Drag handlers ───────────────────────────────────────
  const handleDragStart = (e, col, id) => {
    setDragging({ col, id });
    e.dataTransfer.effectAllowed = 'move';

    // Tilted ghost image
    const el   = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const ghost = el.cloneNode(true);
    Object.assign(ghost.style, {
      position:      'fixed',
      top:           '-9999px',
      left:          '-9999px',
      width:         `${rect.width}px`,
      transform:     'rotate(3deg) scale(1.04)',
      opacity:       '0.92',
      pointerEvents: 'none',
      background:    'rgba(18,18,18,0.95)',
      border:        '1px solid rgba(192,57,43,0.4)',
      borderRadius:  '8px',
      padding:       '12px 14px',
    });
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, rect.width / 2, 30);
    requestAnimationFrame(() => ghost.parentNode && document.body.removeChild(ghost));
  };

  const handleDragEnd = () => { setDragging(null); setDragOver(null); };

  const handleDragOver = (e, col) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(col);
  };

  const handleDragLeave = (e) => {
    // Only clear when truly leaving the column (not moving into a child)
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null);
  };

  const handleDrop = (e, toCol) => {
    e.preventDefault();
    if (dragging) moveTask(dragging.col, dragging.id, toCol);
    setDragging(null);
    setDragOver(null);
  };

  const openCount = cols.burner.length + cols.active.length;

  return (
    <div className="screen">
      <Header eyebrow={`${openCount} open · ${cols.completed.length} done`} title="Tasks"/>

      <div className="field" style={{flexShrink:0}}>
        <span className="c3 t14">+</span>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTask()}
          placeholder='Add to Burner — "Title · Label · 30m · high"  (Enter)'
        />
      </div>

      <div className="row g12 flex1" style={{minHeight:0}}>
        {COL_KEYS.map((col, ci) => {
          const { label, desc, accent } = COL_META[col];
          const tasks    = cols[col];
          const isTarget = dragOver === col;
          const isDimmed = col === 'completed';

          return (
            <div key={col}
              className={`task-col panel flex1 p16 col g10 of-a${isTarget ? ' drop-target' : ''}`}
              onDragOver={e => handleDragOver(e, col)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, col)}>

              {/* Column header */}
              <div style={{flexShrink:0}}>
                <div className="row jb ac">
                  <div className="mono t9 uc ls-wide" style={{color:accent}}>{label}</div>
                  <div className="mono t9 c3">{tasks.length}</div>
                </div>
                <div className="mono t9 c3" style={{marginTop:2}}>{desc}</div>
              </div>
              <div className="divider" style={{flexShrink:0}}/>

              {tasks.length === 0 && (
                <div className="mono t10 c3 tc" style={{padding:'12px 0',opacity:0.35}}>
                  {isTarget ? '↓ drop here' : '—'}
                </div>
              )}

              {tasks.map(task => {
                const ps      = PRIO_STYLE[task.priority] || PRIO_STYLE.med;
                const isDrag  = dragging?.id === task.id;

                return (
                  <div key={task.id}
                    className={`task-card${isDrag ? ' is-dragging' : ''}${isDimmed ? ' dimmed' : ''}`}
                    draggable
                    onDragStart={e => handleDragStart(e, col, task.id)}
                    onDragEnd={handleDragEnd}>

                    <div className="t13 fw4" style={{lineHeight:1.4,opacity:isDimmed?0.6:1,textDecoration:isDimmed?'line-through':'none'}}>
                      {task.title}
                    </div>

                    <div className="row ac g6 wrap" style={{marginTop:8}}>
                      {task.label && (
                        <span className="tag">{task.label}</span>
                      )}
                      {task.est && (
                        <span className="mono t9 c3">{task.est}</span>
                      )}
                      {task.priority && task.priority !== 'med' && (
                        <span className="tag" style={{background:ps.bg,borderColor:ps.bd,color:ps.c}}>
                          {task.priority}
                        </span>
                      )}
                    </div>

                    {/* Move arrows + delete */}
                    <div className="row ac g4" style={{marginTop:10}}>
                      {ci > 0 && (
                        <button className="btn sm ghost" style={{padding:'0 7px'}}
                          onClick={() => moveTask(col, task.id, COL_KEYS[ci-1])}>←</button>
                      )}
                      {ci < 2 && (
                        <button className="btn sm ghost" style={{padding:'0 7px'}}
                          onClick={() => moveTask(col, task.id, COL_KEYS[ci+1])}>→</button>
                      )}
                      <button className="btn sm ghost"
                        style={{padding:'0 7px',marginLeft:'auto',color:'var(--text-3)'}}
                        onClick={() => deleteTask(col, task.id)}>×</button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// APP ROOT
// ═════════════════════════════════════════════════════════
const INIT_POM = {
  workDur:          25,
  breakDur:          5,
  longBreakDur:     15,
  roundsBeforeLong:  4,
  phase:         'work',
  round:             1,
  timeLeft:      25*60,
  running:       false,
  completedToday:    0,
  sessionLabel:     '',
  attachedTask:     '',
  sessions:          [],
};

function App() {
  const [screen, setScreen] = useState('landing');
  const [pom,    setPom]    = useState(INIT_POM);
  const pomRef              = useRef(pom);
  pomRef.current = pom;

  // Global tick — survives screen navigation
  useEffect(() => {
    if (!pom.running) return;
    const id = setInterval(() => {
      const p = pomRef.current;
      if (!p.running) return;
      if (p.timeLeft <= 0) {
        setPom({ ...advancePhase(p), running: true });
      } else {
        setPom(s => ({ ...s, timeLeft: s.timeLeft - 1 }));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [pom.running]);

  if (screen === 'landing') return <Landing onNavigate={setScreen}/>;

  const screens = {
    pomodoro: <Pomodoro   pomState={pom} setPomState={setPom}/>,
    timer:    <TimerScreen/>,
    tasks:    <Tasks/>,
  };

  return (
    <AppShell screen={screen} onNavigate={setScreen}>
      {screens[screen] || screens.pomodoro}
    </AppShell>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
