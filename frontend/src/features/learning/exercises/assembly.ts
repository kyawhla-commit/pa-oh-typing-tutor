import { prepareTypingText } from "../../../engine/typing";
import type { ContentStrategy,ExerciseSection } from "./types";
export interface Assembly { readonly text:string; readonly sections:ExerciseSection[] }
export function assemble(parts:readonly string[],separator:string,strategy:ContentStrategy):Assembly {
  let prefix="";const sections:ExerciseSection[]=[];
  parts.forEach((text,i)=>{
    if(i)prefix+=separator;const start=prefix ? prepareTypingText(prefix).units.length : 0;prefix+=text;
    sections.push({kind:(["focus","context","mixed"] as const)[i],text,start,end:prepareTypingText(prefix).units.length,
      composition:strategy==="fallback-drill" ? "drill" : (["controlled","contextual","fluent"] as const)[i]});
  });return {text:prefix,sections};
}
