import { useEffect, useMemo, useRef, useState } from "react";

type IconName =
  | "home"
  | "practice"
  | "lessons"
  | "chart"
  | "award"
  | "users"
  | "settings"
  | "search"
  | "bell"
  | "bolt"
  | "clock"
  | "target"
  | "flame"
  | "play"
  | "arrow"
  | "lock"
  | "check"
  | "menu"
  | "close";

const paths: Record<IconName, React.ReactNode> = {
  home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
  practice: <><path d="M4 7h16v10H4z" /><path d="M7 11h.01M10 11h.01M13 11h.01M16 11h.01M8 14h8" /></>,
  lessons: <><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H20v17H7.5A3.5 3.5 0 0 0 4 22z" /><path d="M4 5.5v13M8 6h8M8 10h7" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  award: <><circle cx="12" cy="8" r="5" /><path d="m8.5 12-2 10 5.5-3 5.5 3-2-10" /></>,
  users: <><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0M16 4a4 4 0 0 1 0 8M17 15a6 6 0 0 1 5 6" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.08 14H3v-4h.08A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63 1.7 1.7 0 0 0 10 3.08V3h4v.08A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9 1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  bolt: <path d="m13 2-9 12h7l-1 8 9-12h-7z" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  flame: <path d="M13 2s1 4-2 7c-2-2-4-1-5 1-2 4 1 10 6 11 5-1 8-5 6-10-1-3-3-5-5-9Z" />,
  play: <path d="m9 7 8 5-8 5z" />,
  arrow: <><path d="M5 12h14M14 7l5 5-5 5" /></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
};

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const nav = [
  ["Dashboard", "home"], ["Practice", "practice"], ["Lessons", "lessons"],
  ["Progress", "chart"], ["Achievements", "award"], ["Leaderboard", "users"], ["Settings", "settings"],
] as const;

function Sidebar({ page, setPage, open, onClose }: { page: string; setPage: (p: string) => void; open: boolean; onClose: () => void }) {
  return <>
    {open && <button className="scrim" onClick={onClose} aria-label="Close navigation" />}
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <div className="logo"><span className="logo-mark"><Icon name="bolt" size={18} /></span><span>Type<span>Master</span></span></div>
      <button className="close-nav" onClick={onClose} aria-label="Close navigation"><Icon name="close" /></button>
      <nav aria-label="Main navigation">
        <p className="nav-label">LEARN</p>
        {nav.slice(0, 4).map(([label, icon]) => <button key={label} className={page === label ? "active" : ""} onClick={() => { setPage(label); onClose(); }}><Icon name={icon} /><span>{label}</span>{label === "Practice" && <span className="new-pill">NEW</span>}</button>)}
        <p className="nav-label community">COMMUNITY</p>
        {nav.slice(4, 6).map(([label, icon]) => <button key={label} className={page === label ? "active" : ""} onClick={() => { setPage(label); onClose(); }}><Icon name={icon} /><span>{label}</span></button>)}
      </nav>
      <div className="sidebar-bottom">
        <button className={page === "Settings" ? "active" : ""} onClick={() => { setPage("Settings"); onClose(); }}><Icon name="settings" /><span>Settings</span></button>
        <div className="upgrade">
          <span className="upgrade-icon"><Icon name="bolt" size={16} /></span>
          <strong>Unlock your potential</strong>
          <p>Get unlimited lessons and advanced insights.</p>
          <button>Upgrade to Pro</button>
        </div>
      </div>
    </aside>
  </>;
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  return <header className="topbar">
    <button className="menu-btn" onClick={onMenu} aria-label="Open navigation"><Icon name="menu" /></button>
    <label className="search"><Icon name="search" size={18} /><input aria-label="Search lessons" placeholder="Search lessons..." /><kbd>⌘ K</kbd></label>
    <div className="top-actions">
      <button className="icon-button" aria-label="Notifications"><Icon name="bell" /><span className="notification-dot" /></button>
      <span className="separator" />
      <button className="profile"><span className="avatar">AM</span><span className="profile-text"><strong>Alex Morgan</strong><small>Level 12</small></span><span className="chevron">⌄</span></button>
    </div>
  </header>;
}

const statData = [
  { label: "Current Speed", value: "72", unit: "WPM", change: "+8%", icon: "bolt" as IconName, color: "blue" },
  { label: "Accuracy", value: "98", unit: "%", change: "+2%", icon: "target" as IconName, color: "green" },
  { label: "Words Typed", value: "25.4", unit: "K", change: "+12%", icon: "practice" as IconName, color: "violet" },
  { label: "Practice Time", value: "25", unit: "HRS", change: "+5%", icon: "clock" as IconName, color: "orange" },
];

function MiniChart() {
  return <div className="chart-wrap">
    <div className="y-labels"><span>90</span><span>75</span><span>60</span><span>45</span><span>30</span></div>
    <svg className="line-chart" viewBox="0 0 700 190" preserveAspectRatio="none" aria-label="Typing speed chart">
      <defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3f6df6" stopOpacity=".22" /><stop offset="1" stopColor="#3f6df6" stopOpacity="0" /></linearGradient></defs>
      {[20, 57, 94, 131, 168].map(y => <line key={y} x1="0" y1={y} x2="700" y2={y} stroke="#e8edf5" strokeDasharray="3 5" />)}
      <path d="M0 146 C45 136 65 115 115 121 S185 100 230 108 S310 72 350 84 S420 51 470 63 S540 29 585 47 S655 18 700 26 L700 190 L0 190Z" fill="url(#chartFill)" />
      <path d="M0 146 C45 136 65 115 115 121 S185 100 230 108 S310 72 350 84 S420 51 470 63 S540 29 585 47 S655 18 700 26" fill="none" stroke="#3765ec" strokeWidth="3" strokeLinecap="round" />
      <circle cx="700" cy="26" r="5" fill="#3765ec" stroke="white" strokeWidth="3" />
    </svg>
    <div className="x-labels"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
  </div>;
}

function Dashboard({ goPractice }: { goPractice: () => void }) {
  return <div className="page dashboard">
    <section className="welcome-row">
      <div><p className="eyebrow">MONDAY, MAY 26</p><h1>Good morning, Alex</h1><p>Ready to beat your personal best today?</p></div>
      <button className="primary-btn" onClick={goPractice}><Icon name="play" size={18} /> Start practicing</button>
    </section>
    <section className="stats-grid">
      {statData.map(s => <article className="stat-card" key={s.label}><div className={`stat-icon ${s.color}`}><Icon name={s.icon} /></div><div><p>{s.label}</p><strong>{s.value}<small>{s.unit}</small></strong></div><span className="gain">↗ {s.change}</span></article>)}
    </section>
    <div className="dashboard-grid">
      <section className="card progress-card">
        <div className="section-head"><div><h2>Your progress</h2><p>Average typing speed this week</p></div><button>This week <span>⌄</span></button></div>
        <div className="chart-summary"><strong>72 <small>WPM</small></strong><span>↗ 14.3%</span><p>vs last week</p></div>
        <MiniChart />
      </section>
      <section className="card challenge-card">
        <div className="challenge-top"><span className="challenge-bolt"><Icon name="bolt" /></span><span className="difficulty">MEDIUM</span></div>
        <p className="eyebrow">TODAY'S CHALLENGE</p><h2>The Speed Sprint</h2><p>Type 500 words with at least 95% accuracy.</p>
        <div className="challenge-progress"><div><span>Progress</span><strong>320 / 500 words</strong></div><div className="progress-track"><span style={{ width: "64%" }} /></div><small>64% complete</small></div>
        <button className="challenge-btn" onClick={goPractice}>Continue challenge <Icon name="arrow" size={17} /></button>
        <div className="reward"><Icon name="award" size={18} /> <span><small>CHALLENGE REWARD</small><strong>+250 XP & “Speedster” badge</strong></span></div>
      </section>
    </div>
    <div className="lower-grid">
      <section className="card goal-card"><div className="section-head"><div><h2>Daily goal</h2><p>Keep your momentum going</p></div><span className="streak"><Icon name="flame" size={16} /> 12 day streak</span></div>
        <div className="goal-body"><div className="ring"><span><strong>18</strong><small>of 20 min</small></span></div><div className="week">{["M","T","W","T","F","S","S"].map((d,i)=><div key={i}><span className={i < 4 ? "done" : i === 4 ? "today" : ""}>{i < 4 ? <Icon name="check" size={14} /> : d}</span><small>{[22,23,24,25,26,27,28][i]}</small></div>)}</div></div>
      </section>
      <section className="card lesson-card"><div className="section-head"><div><h2>Continue learning</h2><p>Pick up where you left off</p></div><button className="text-btn">View all <Icon name="arrow" size={15} /></button></div>
        <div className="lesson-row"><div className="lesson-illustration"><span>F</span><span>J</span></div><div className="lesson-info"><span>LESSON 8 · BEGINNER</span><h3>Mastering the home row</h3><div className="lesson-progress"><span><i style={{width:"75%"}} /></span><small>75%</small></div></div><button onClick={goPractice}><Icon name="play" size={18} /></button></div>
      </section>
    </div>
  </div>;
}

const practiceTexts = [
  "The quick brown fox jumps over the lazy dog. Smooth and steady keystrokes build lasting speed.",
  "Great typing starts with accuracy. Keep your eyes on the screen and let your fingers find the keys.",
  "Small improvements become remarkable results when you practice with purpose every single day.",
];
const keyboardRows = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

function Practice() {
  const [sample, setSample] = useState(0);
  const [typed, setTyped] = useState("");
  const [activeKey, setActiveKey] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const text = practiceTexts[sample];
  useEffect(() => {
    if (!started) return;
    const timer = window.setInterval(() => setSeconds(s => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [started]);
  const errors = typed.split("").filter((c, i) => c !== text[i]).length;
  const accuracy = typed.length ? Math.max(0, Math.round(((typed.length - errors) / typed.length) * 100)) : 100;
  const wpm = seconds ? Math.round((typed.length / 5) / (seconds / 60)) : 0;
  function reset(next = sample) { setSample(next); setTyped(""); setSeconds(0); setStarted(false); inputRef.current?.focus(); }
  function onType(value: string) {
    if (!started && value.length) setStarted(true);
    setTyped(value.slice(0, text.length));
    if (value.length >= text.length) setStarted(false);
  }
  return <div className="page practice-page">
    <div className="page-title"><div><p className="eyebrow">FOCUSED PRACTICE</p><h1>Build your rhythm</h1><p>Accuracy first. Speed will follow.</p></div><div className="timer"><Icon name="clock" /><span>{String(Math.floor(seconds/60)).padStart(2,"0")}:{String(seconds%60).padStart(2,"0")}</span></div></div>
    <div className="practice-tabs">{["Words", "Sentences", "Paragraph", "Code"].map((t,i)=><button key={t} className={i===1 ? "selected" : ""}>{t}</button>)}</div>
    <section className="typing-card" onClick={() => inputRef.current?.focus()}>
      <div className="typing-top"><span>Everyday English</span><button onClick={(e) => { e.stopPropagation(); reset((sample + 1) % practiceTexts.length); }}>New text <span>↻</span></button></div>
      <div className="sample-text" aria-label={text}>{text.split("").map((char,i)=><span key={i} className={i < typed.length ? (typed[i] === char ? "correct-char" : "wrong-char") : i === typed.length ? "current-char" : ""}>{char}</span>)}</div>
      <textarea ref={inputRef} value={typed} onChange={e=>onType(e.target.value)} onKeyDown={e=>setActiveKey(e.key.toUpperCase())} onKeyUp={()=>setActiveKey("")} autoFocus aria-label="Type the displayed text here" placeholder="Click here and start typing..." />
    </section>
    <section className="live-stats">{[
      ["Speed", `${wpm}`, "WPM", "bolt"], ["Accuracy", `${accuracy}`, "%", "target"], ["Errors", `${errors}`, "", "close"], ["Characters", `${typed.length}`, ` / ${text.length}`, "practice"]
    ].map(([label,val,unit,icon])=><div key={label}><span className="live-icon"><Icon name={icon as IconName} /></span><p>{label}</p><strong>{val}<small>{unit}</small></strong></div>)}</section>
    <section className="keyboard card">
      <div className="keyboard-head"><div><h2>Virtual keyboard</h2><p>Follow the highlighted key</p></div><span>Next key: <kbd>{text[typed.length]?.toUpperCase() || "—"}</kbd></span></div>
      <div className="keys">{keyboardRows.map((row,ri)=><div className={`key-row row-${ri}`} key={row}>{row.split("").map(key=><span key={key} className={activeKey===key || text[typed.length]?.toUpperCase()===key ? "key-active" : ""}>{key}</span>)}</div>)}<div className="key-row"><span className="space-key">SPACE</span></div></div>
    </section>
  </div>;
}

const lessonItems = [
  ["Home row foundations", "Build muscle memory with A, S, D, F, J, K, L", "100%", "completed"],
  ["Mastering the home row", "Develop confident movement across the center row", "75%", "current"],
  ["Top row reach", "Add QWERTY keys without looking down", "0%", "open"],
  ["Full alphabet flow", "Connect every row with smooth transitions", "0%", "locked"],
];

function Lessons({ goPractice }: { goPractice: () => void }) {
  return <div className="page"><div className="page-title"><div><p className="eyebrow">LEARNING PATH</p><h1>Lessons</h1><p>Build strong fundamentals, one skill at a time.</p></div><span className="level-chip">Level 12 · 2,840 XP</span></div>
    <div className="filter-tabs">{["Beginner","Intermediate","Advanced","Programming"].map((x,i)=><button className={i===0?"selected":""} key={x}>{x}</button>)}</div>
    <div className="lessons-list">{lessonItems.map((l,i)=><article className={`card lesson-list-card ${l[3]}`} key={l[0]}><div className="lesson-number">{l[3]==="completed"?<Icon name="check"/>:l[3]==="locked"?<Icon name="lock"/>:String(i+1).padStart(2,"0")}</div><div><span>LESSON {i+1} · {i*5+10} MIN</span><h2>{l[0]}</h2><p>{l[1]}</p><div className="list-progress"><i style={{width:l[2]}} /></div></div><div className="lesson-action"><strong>{l[2]}</strong><button disabled={l[3]==="locked"} onClick={goPractice}>{l[3]==="completed"?"Review":l[3]==="current"?"Continue":l[3]==="locked"?"Locked":"Start"}</button></div></article>)}</div>
  </div>;
}

function Progress() {
  return <div className="page"><div className="page-title"><div><p className="eyebrow">YOUR ANALYTICS</p><h1>Progress</h1><p>See how consistency turns into speed.</p></div><button className="secondary-btn">Last 30 days ⌄</button></div>
    <section className="stats-grid progress-stats">{[["Best Speed","120","WPM","bolt"],["Average Speed","75","WPM","chart"],["Accuracy","98","%","target"],["Total Practice","50","HRS","clock"]].map(x=><article className="stat-card" key={x[0]}><div className="stat-icon blue"><Icon name={x[3] as IconName}/></div><div><p>{x[0]}</p><strong>{x[1]}<small>{x[2]}</small></strong></div></article>)}</section>
    <section className="card analytics-card"><div className="section-head"><div><h2>Speed improvement</h2><p>Your average WPM over the past month</p></div><span className="gain">↗ 18.4% improvement</span></div><div className="big-chart"><MiniChart/></div></section>
    <section className="card activity-card"><div className="section-head"><div><h2>Practice activity</h2><p>15 day current streak</p></div></div><div className="heatmap">{Array.from({length:84},(_,i)=><span key={i} className={i%9===0||i%13===0?"high":i%4===0||i%7===0?"mid":i<70?"low":""}/>)}</div><div className="heat-legend"><span>Less</span><i/><i className="low"/><i className="mid"/><i className="high"/><span>More</span></div></section>
  </div>;
}

function PlaceholderPage({ page }: { page: string }) {
  const configs: Record<string, [string,string,IconName]> = {
    Achievements: ["Milestones worth celebrating", "You have unlocked 12 of 30 achievements.", "award"],
    Leaderboard: ["Learn together. Rise together.", "See how your speed compares with this week's top typists.", "users"],
    Settings: ["Make TypeMaster yours", "Tune your goals, experience, and account preferences.", "settings"],
  };
  const [title, sub, icon] = configs[page];
  return <div className="page"><div className="page-title"><div><p className="eyebrow">{page.toUpperCase()}</p><h1>{title}</h1><p>{sub}</p></div></div><section className="card feature-panel"><div className="feature-icon"><Icon name={icon} size={30}/></div><h2>{page}</h2><p>Your personalized {page.toLowerCase()} experience is ready. Keep practicing to see your activity grow here.</p><button className="primary-btn">Explore {page}</button></section></div>;
}

export default function App() {
  const [page, setPage] = useState("Dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const content = useMemo(() => {
    if (page === "Dashboard") return <Dashboard goPractice={() => setPage("Practice")} />;
    if (page === "Practice") return <Practice />;
    if (page === "Lessons") return <Lessons goPractice={() => setPage("Practice")} />;
    if (page === "Progress") return <Progress />;
    return <PlaceholderPage page={page} />;
  }, [page]);
  return <div className="app-shell">
    <Sidebar page={page} setPage={setPage} open={mobileOpen} onClose={() => setMobileOpen(false)} />
    <main className="main-shell"><Topbar onMenu={() => setMobileOpen(true)} />{content}</main>
  </div>;
}
