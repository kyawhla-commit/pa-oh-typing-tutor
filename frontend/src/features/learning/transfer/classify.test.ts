import { describe,expect,it } from "vitest";
import { classifyEvidence,isTransferContext,recommendationIdentity,wasTargeted,weaknessIdentity,weaknessKey } from "./classify";
import { attribution,r,session } from "./testFixtures";
import type { SessionSummary } from "../types";
describe("structured source context and stable weakness identity",()=>{
  it.each([["fixed-text","ordinary-practice"],["timed","timed-test"],["word-count","word-test"]] as const)("classifies ordinary %s",(mode,context)=>expect(classifyEvidence(session(mode,undefined,[],{mode}).summary)).toBe(context));
  it("classifies targeted and general adaptive content through matching source metadata",()=>{
    const s=session("a",undefined,[],{adaptive:true}).summary;
    expect(classifyEvidence(s,attribution())).toBe("adaptive-targeted");
    expect(classifyEvidence(s,attribution("general",[]))).toBe("adaptive-general");
    expect(wasTargeted(s,r,attribution())).toBe(true);
  });
  it("excludes unrelated and general adaptive content from transfer",()=>{
    const s=session("a",undefined,[],{adaptive:true}).summary;
    expect(wasTargeted(s,r,attribution("grapheme",["t"]))).toBe(false);
    expect(isTransferContext(classifyEvidence(s,attribution("grapheme",["t"])))).toBe(false);
    expect(isTransferContext(classifyEvidence(s,attribution("general",[])))).toBe(false);
  });
  it.each([undefined,{...attribution(),sourceId:"other"},{...attribution(),sourceVersion:"other"},{...attribution(),focusItems:[]},{...attribution(),focusType:"invalid"}] as const)("missing/malformed adaptive metadata is unknown: %j",(a)=>{
    const s=session("a",undefined,[],{adaptive:true}).summary;
    expect(classifyEvidence(s,a as ReturnType<typeof attribution>)).toBe("unknown");expect(wasTargeted(s,r,a as ReturnType<typeof attribution>)).toBe(false);
  });
  it("missing/unknown sources never qualify even with an ordinary mode",()=>{
    const s=session("a").summary;
    expect(classifyEvidence({...s,sourceIdentity:null})).toBe("unknown");
    expect(classifyEvidence({...s,sourceIdentity:{...s.sourceIdentity!,type:"unknown"}} as unknown as SessionSummary)).toBe("unknown");
  });
  it("supports explicitly stored multi-focus graph/token metadata without reading text",()=>{
    const s=session("a",undefined,[],{adaptive:true}).summary;
    expect(classifyEvidence(s,attribution("grapheme",["r","t"]))).toBe("adaptive-targeted");
    expect(wasTargeted(s,r,attribution("grapheme",["t","r"]))).toBe(true);
    expect(wasTargeted(s,{kind:"token",items:["through"]},attribution("token",["through","rough"]))).toBe(true);
    expect(classifyEvidence(s,attribution("grapheme",["é","e\u0301"]))).toBe("unknown");
  });
  it("preserves source type over a misleading mode",()=>{
    const s=session("a",undefined,[],{mode:"timed"}).summary;
    expect(classifyEvidence({...s,sourceIdentity:{...s.sourceIdentity!,type:"adaptive"}},attribution())).toBe("unknown");
  });
  it("ordinary quote/custom sources qualify only for the evidence their privacy policy retains",()=>{
    for(const type of ["quote","custom"] as const)expect(classifyEvidence({...session("a").summary,sourceIdentity:{type,id:"x",version:"1"}})).toBe("ordinary-practice");
  });
  it("canonical NFC identities preserve Unicode clusters and directional substitutions",()=>{
    expect(weaknessKey(weaknessIdentity("grapheme",["e\u0301"]))).toBe(weaknessKey(weaknessIdentity("grapheme",["é"])));
    expect(weaknessIdentity("grapheme",["က္"])).toEqual({kind:"grapheme",items:["က္"]});
    expect(weaknessKey(weaknessIdentity("substitution",["r","t"]))).not.toBe(weaknessKey(weaknessIdentity("substitution",["t","r"])));
    expect(weaknessKey(weaknessIdentity("bigram",["r","r"]))).not.toBe(weaknessKey(r));
  });
  it.each([["grapheme",["ab"]],["bigram",["th"]],["substitution",["r","r"]],["token",["two words"]],["grapheme",["\ud800"]]] as const)("rejects malformed %s identities",(kind,items)=>expect(()=>weaknessIdentity(kind,items)).toThrow());
  it("recommendation instance and generator versions do not change weakness identity",()=>{
    const base={type:"WEAK_GRAPHEME",targets:["r"]} as unknown as Parameters<typeof recommendationIdentity>[0];
    expect(recommendationIdentity({...base,id:"one"})).toEqual(recommendationIdentity({...base,id:"two"}));
    const s=session("a",undefined,[],{adaptive:true}).summary;
    expect(wasTargeted({...s,sourceIdentity:{...s.sourceIdentity!,version:"next"}},r,{...attribution(),sourceVersion:"next"})).toBe(true);
  });
});
