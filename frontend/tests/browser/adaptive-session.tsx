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
  const {signIn,learner,results}=useLearningData();const scope=useLearningScope();const {profile}=useLearningProfile(scope);const sequence=useRef(0);
  const initialized=useRef(false);
  useEffect(()=>{if(!initialized.current){initialized.current=true;signIn({name:"Slice 6 browser fixture",email:"slice6-fixture@example.com"});}},[signIn]);
  const seed=(unit:string)=> {
    const engine=createTypingEngine({targetText:unit.repeat(24),completionPolicy:"target-covered",sourceIdentity:{type:"corpus",id:"browser-seed",version:"1"}});
    engine.dispatch({type:"INSERT_TEXT",text:"txws"+unit.repeat(20),atMs:0});
    getLearningService().complete(scope,`browser-seed-${unit}-${++sequence.current}`,engine.getResult(),Date.now());
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
      <p>Slice 6 isolated verification fixture · {learner?.name}</p>
      <nav className="my-2 flex gap-4"><Link to="/practice">Practice route</Link><Link to="/test">Test route</Link></nav>
      <div className="flex flex-wrap gap-4"><button onClick={()=>seed("r")}>Seed weak r evidence</button><button onClick={()=>seed("é")}>Seed Unicode evidence</button><button onClick={compose}>Synthetic composition é</button></div>
      <output aria-label="Learning diagnostics">Learning sessions: {profile.sessionCount}; legacy saved: {results.length}; latest source: {profile.recent.at(-1)?.sourceIdentity?.type??"none"}; latest mode: {profile.recent.at(-1)?.mode??"none"}; active ms: {profile.recent.at(-1)?.activeElapsedMs??0}; last attempts: {profile.recent.at(-1)?.totalAttempts??0}; corrected: {profile.recent.at(-1)?.correctedErrors??0}</output>
    </header>
    <Routes><Route path="/practice" element={<Practice/>}/><Route path="/test" element={<Test/>}/></Routes>
  </div>;
}
const root=createRoot(document.getElementById("root")!);
if(import.meta.hot)import.meta.hot.dispose(()=>root.unmount());
root.render(<StrictMode><LearningProvider><LessonCatalogProvider><MemoryRouter initialEntries={["/practice"]}><Fixture/></MemoryRouter></LessonCatalogProvider></LearningProvider></StrictMode>);
