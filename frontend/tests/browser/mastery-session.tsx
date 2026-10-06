// Isolated local browser fixture. No production route or cloud persistence.
import { StrictMode,useEffect,useRef } from "react";
import { createRoot } from "react-dom/client";
import { Link,MemoryRouter,Route,Routes } from "react-router-dom";
import { LearningProvider,useLearningData } from "../../src/data/LearningContext";
import { LessonCatalogProvider } from "../../src/features/lessons/LessonCatalogContext";
import Practice from "../../src/features/practice/Practice";
import Test from "../../src/features/tests/Test";
import { createTypingEngine } from "../../src/engine/typing";
import { getLearningService } from "../../src/features/learning/service";
import { useLearningProfile,useLearningScope } from "../../src/features/learning/useLearningProfile";
import "../../src/index.css";
function Fixture() {
  const {signIn,learner,results}=useLearningData();const scope=useLearningScope();const {profile,mastery}=useLearningProfile(scope);const sequence=useRef(0);
  const initialized=useRef(false);
  useEffect(()=>{if(!initialized.current){initialized.current=true;signIn({name:"Slice 7 browser fixture",email:"slice7-fixture@example.com"});}},[signIn]);
  const seed=(unit:string)=> {
    const engine=createTypingEngine({targetText:unit.repeat(24),completionPolicy:"target-covered",sourceIdentity:{type:"corpus",id:"browser-seed",version:"1"}});
    engine.dispatch({type:"INSERT_TEXT",text:"txws"+unit.repeat(20),atMs:0});
    getLearningService().complete(scope,crypto.randomUUID(),engine.getResult(),Date.now());
  };
  const ordinary=(mode:"fixed-text"|"timed"|"word-count",bad=false)=>{
    const common={targetText:"r".repeat(20),sourceIdentity:{type:"corpus" as const,id:"synthetic-ordinary-fixture",version:"1"}};
    const engine=createTypingEngine(mode==="timed" ? {...common,mode,durationMs:2000,textPolicy:"repeat-corpus"} : mode==="word-count" ? {...common,mode,wordLimit:1} : {...common,mode,completionPolicy:"target-covered"});
    engine.dispatch({type:"INSERT_TEXT",text:bad ? "txws" : "r",atMs:0});
    engine.dispatch({type:"INSERT_TEXT",text:"r".repeat(bad ? 16 : 19),atMs:1999});
    if(mode==="timed")engine.dispatch({type:"TICK",atMs:2000});
    getLearningService().complete(scope,crypto.randomUUID(),engine.getResult(),Date.now());
  };
  const compose=()=> {
    const input=document.querySelector<HTMLTextAreaElement>("textarea")!;input.focus();
    input.dispatchEvent(new CompositionEvent("compositionstart",{bubbles:true}));input.value="e";
    input.dispatchEvent(new InputEvent("input",{inputType:"insertCompositionText",data:"e",isComposing:true,bubbles:true}));
    input.dispatchEvent(new CompositionEvent("compositionend",{data:"é",bubbles:true}));
    input.dispatchEvent(new InputEvent("beforeinput",{inputType:"insertText",data:"é",bubbles:true,cancelable:true}));input.dispatchEvent(new InputEvent("input",{inputType:"insertText",data:"é",bubbles:true}));
  };
  return <div className="mx-auto max-w-6xl p-4">
    <header className="rounded-lg bg-slate-100 p-3 text-sm">
      <p>Slice 7 isolated verification fixture · {learner?.name}</p>
      <nav className="my-2 flex gap-4"><Link to="/practice">Practice route</Link><Link to="/test">Test route</Link></nav>
      <div className="flex flex-wrap gap-4"><button onClick={()=>seed("r")}>Seed weak r evidence</button><button onClick={()=>seed("é")}>Seed Unicode evidence</button><button onClick={compose}>Synthetic composition é</button></div>
      <div className="my-2 flex flex-wrap gap-4">
        <button onClick={()=>ordinary("fixed-text")}>Seed ordinary Practice success</button>
        <button onClick={()=>ordinary("timed")}>Seed timed Test success</button>
        <button onClick={()=>ordinary("word-count")}>Seed word Test success</button>
        <button onClick={()=>ordinary("fixed-text",true)}>Seed severe ordinary regression</button>
        <button onClick={()=>signIn({name:"Learner A",email:"slice7-fixture@example.com"})}>Switch to learner A</button>
        <button onClick={()=>signIn({name:"Learner B",email:"slice7-other@example.com"})}>Switch to learner B</button>
      </div>
      <p>Transfer/regression controls inject synthetic completed engine results for verification; these are not human ordinary typing.</p>
      <p aria-label="Mastery diagnostics">Scope: {scope}; {mastery.records.map(r=>`${r.identity.kind}:${r.identity.items.join("→")} ${r.state}; training=${r.training.length}; transfer=${r.transfer.length}`).join(" | ")}</p>
      <output aria-label="Learning diagnostics">Learning sessions: {profile.sessionCount}; legacy saved: {results.length}; latest source: {profile.recent.at(-1)?.sourceIdentity?.type??"none"}; latest mode: {profile.recent.at(-1)?.mode??"none"}; active ms: {profile.recent.at(-1)?.activeElapsedMs??0}; last attempts: {profile.recent.at(-1)?.totalAttempts??0}; corrected: {profile.recent.at(-1)?.correctedErrors??0}</output>
    </header>
    <Routes><Route path="/practice" element={<Practice/>}/><Route path="/test" element={<Test/>}/></Routes>
  </div>;
}
const root=createRoot(document.getElementById("root")!);
if(import.meta.hot)import.meta.hot.dispose(()=>root.unmount());
root.render(<StrictMode><LearningProvider><LessonCatalogProvider><MemoryRouter initialEntries={["/practice"]}><Fixture/></MemoryRouter></LessonCatalogProvider></LearningProvider></StrictMode>);
