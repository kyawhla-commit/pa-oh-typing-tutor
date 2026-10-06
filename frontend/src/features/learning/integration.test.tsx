// @vitest-environment jsdom
import { act,StrictMode } from "react";
import { createRoot,type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { beforeEach,afterEach,describe,expect,it,vi,type Mock } from "vitest";
import Practice from "../practice/Practice";
import Test from "../tests/Test";
import { createTypingSession,type TypingSession } from "../typing/useTypingSession";
import { createLearningService,type LearningService } from "./service";
import { useSessionLearning } from "./useLearningProfile";
import { profileStorageKey } from "./storage";
const control=vi.hoisted(()=>({service:null as LearningService|null,addResult:vi.fn(),completeLesson:vi.fn()}));
vi.mock("./service",async(importOriginal)=>({ ...await importOriginal<typeof import("./service")>(),getLearningService:()=>control.service! }));
vi.mock("../../data/LearningContext",()=>({useLearningData:()=>({learner:{name:"A",email:"a@example.com"},authenticatedUserId:"A",
  preferences:{difficulty:"Medium",targetWpm:100,keyboardLayout:"QWERTY"},addResult:control.addResult,completeLesson:control.completeLesson,syncStatus:"local",syncError:null})}));
vi.mock("../lessons/LessonCatalogContext",()=>({useLessonCatalog:()=>({catalog:[{id:1,status:"Published",content:"r".repeat(24)+"a"}]})}));
let host:HTMLDivElement,root:Root,clock:number,jobs:(()=>void)[],values:Map<string,string>,writes:Mock<(key:string,value:string)=>void>;
const button=(label:string)=>Array.from(host.querySelectorAll<HTMLButtonElement>("button")).find(b=>b.textContent?.trim()===label)!;
const click=(label:string)=>act(()=>button(label).click());
const input=()=>host.querySelector<HTMLTextAreaElement>("textarea")!;
const commit=(text:string)=>act(()=>{input().focus();input().dispatchEvent(new InputEvent("beforeinput",{inputType:"insertText",data:text,bubbles:true,cancelable:true}));});
const remove=()=>act(()=>input().dispatchEvent(new InputEvent("beforeinput",{inputType:"deleteContentBackward",bubbles:true,cancelable:true})));
const flush=()=>act(()=>{while(jobs.length)jobs.shift()!();});
const profile=(scope="user:A")=>control.service!.getSnapshot(scope).profile;
function mount(component:React.ReactNode,path="/test") { act(()=>root.render(<StrictMode><MemoryRouter initialEntries={[path]}>{component}</MemoryRouter></StrictMode>)); }
function Probe({session,scope,service}:{session:TypingSession;scope:string;service:LearningService}) {useSessionLearning(session,scope,service);return null;}
beforeEach(()=> {
  (globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true; vi.useFakeTimers(); clock=100;vi.spyOn(performance,"now").mockImplementation(()=>clock);
  jobs=[]; values=new Map(); writes=vi.fn((key:string,value:string)=>{values.set(key,value);});
  control.service=createLearningService({getItem:key=>values.get(key)??null,setItem:writes},job=>jobs.push(job));
  control.addResult.mockClear();control.completeLesson.mockClear();host=document.createElement("div");document.body.append(host);root=createRoot(host);
});
afterEach(()=>{act(()=>root.unmount());host.remove();vi.useRealTimers();vi.restoreAllMocks();});
describe("completion integration and learner ownership",()=> {
  it("completed Practice contributes once and recommendations update after deferred ingestion",()=> {
    mount(<Practice/>,"/practice?lesson=1");click("Hide keyboard");
    for(let i=0;i<4;i++){commit("X");remove();commit("r");} clock=2100;commit("r".repeat(20)+"a");
    expect(control.addResult).toHaveBeenCalledTimes(1);expect(control.completeLesson).not.toHaveBeenCalled();
    expect(writes).not.toHaveBeenCalled(); expect(profile().sessionCount).toBe(0);flush();
    expect(profile().sessionCount).toBe(1);expect(writes).toHaveBeenCalledTimes(3); expect(host.textContent).toContain('Distinguish "r" from "X"');
    expect(profile().recent[0]).toMatchObject({mode:"fixed-text",correctedErrors:4,sourceIdentity:{type:"lesson",id:"lesson-1"}});
    click("Retry lesson");clock=3000;commit("r".repeat(24));clock=5000;commit("a");flush();expect(profile().sessionCount).toBe(2);expect(control.completeLesson).toHaveBeenCalledExactlyOnceWith(1);
  });
  it("timed completion contributes once without manual saving",()=> {
    mount(<Test/>);click("15 secQuick warm-up");click("Start test");commit("G");clock=15310;act(()=>vi.advanceTimersByTime(250));
    expect(host.textContent).toContain("Test complete");expect(control.addResult).not.toHaveBeenCalled();expect(writes).not.toHaveBeenCalled();flush();
    expect(profile().sessionCount).toBe(1);expect(profile().recent[0]).toMatchObject({mode:"timed",activeElapsedMs:15000});
    click("Save result"); expect(control.addResult).toHaveBeenCalledTimes(1);flush();expect(profile().sessionCount).toBe(1);
  });
  it("word completion contributes once, manual save stays independent",()=> {
    mount(<Test/>);click("Words");click("10 words");click("Start test");commit("Good typing is less about ");clock=2100;commit("rushing and more about finding");
    expect(host.textContent).toContain("Test complete");expect(control.addResult).not.toHaveBeenCalled();expect(writes).not.toHaveBeenCalled();flush();
    expect(profile().sessionCount).toBe(1);expect(profile().recent[0].mode).toBe("word-count");
    click("Try another test");click("Start test");commit("Good typing is less about ");clock=4100;commit("rushing and more about finding");flush();expect(profile().sessionCount).toBe(2);
  });
  it("aborted sessions do not contribute",()=> {mount(<Test/>);click("Start test");commit("Good");click("End test");flush();expect(profile().sessionCount).toBe(0);expect(writes).not.toHaveBeenCalled();});
  it("StrictMode replay, remount and reconstructed services retain persistent dedupe",()=> {
    const session=createTypingSession({targetText:"ab"},()=>clock);session.insertText("a");clock=2100;session.insertText("b");
    act(()=>root.render(<StrictMode><Probe session={session} scope="user:A" service={control.service!}/></StrictMode>));flush();expect(profile().sessionCount).toBe(1);
    act(()=>root.unmount());root=createRoot(host);
    const reloaded=createLearningService({getItem:key=>values.get(key)??null,setItem:writes},job=>jobs.push(job));
    act(()=>root.render(<StrictMode><Probe session={session} scope="user:A" service={reloaded}/></StrictMode>));flush();
    expect(reloaded.getSnapshot("user:A").profile.sessionCount).toBe(1);expect(writes).toHaveBeenCalledTimes(3);
  });
  it("captures the starting learner; a restart captures the new learner",()=> {
    const session=createTypingSession({targetText:"ab"},()=>clock);
    act(()=>root.render(<Probe session={session} scope="user:A" service={control.service!}/>));act(()=>session.insertText("a"));
    act(()=>root.render(<Probe session={session} scope="user:B" service={control.service!}/>));clock=2100;act(()=>session.insertText("b"));flush();
    expect(profile("user:A").sessionCount).toBe(1);expect(profile("user:B").sessionCount).toBe(0);
    act(()=>root.unmount());root=createRoot(host);act(()=>root.render(<Probe session={session} scope="user:B" service={control.service!}/>));flush();
    expect(profile("user:A").sessionCount).toBe(1);expect(profile("user:B").sessionCount).toBe(0);
    act(()=>session.restart());act(()=>session.insertText("a"));clock=4100;act(()=>session.insertText("b"));flush();
    expect(profile("user:B").sessionCount).toBe(1);expect(values.has(profileStorageKey("user:A"))).toBe(true);expect(values.has(profileStorageKey("user:B"))).toBe(true);
  });
  it("typing, including completion, never synchronously writes profile storage",()=> {
    const session=createTypingSession({targetText:"abc"},()=>clock);act(()=>root.render(<Probe session={session} scope="user:A" service={control.service!}/>));
    act(()=>session.insertText("a"));act(()=>session.insertText("b"));expect(writes).not.toHaveBeenCalled();clock=2100;act(()=>session.insertText("c"));
    expect(writes).not.toHaveBeenCalled();expect(jobs).toHaveLength(1);flush();expect(writes).toHaveBeenCalledTimes(3);
  });
});
