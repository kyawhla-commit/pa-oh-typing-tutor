import { prepareTypingText,type TargetText } from "../../../engine/typing";
import { EXERCISE } from "./constants";
import { compareUnicode } from "../aggregation";
/** Small original word/phrase bank; no fetched passages or learner content. */
const WORDS = `a an and at as be by do go he if in is it me my no of on or so to up us we
air arm art around away back bag bake ball bank bear bed bell best bird blue boat book box bring bright brown
calm care carry chair check clean clear close cloud coat cold come cook cool cup cut day deep desk door down draw dream dry
each early earth east easy edge eight end even ever every eye face fair fall farm fast feed feel find fine fire first fish five floor fly food foot for four free fresh friend from full
game garden gate get give glad glass glow good grass green grow hand hard has have head hear heat help her here high hill home hope hot house how ice idea into iron its
job join joy jump just keep key kind kite know lake land large last late leaf learn leave left less let life light like line list little live long look love low
make map mark may meet mild milk mind moon more most move much must name near neat need new next nice night nine north note now
oak old once one only open other our out over own page pair park part pass path pen pet pick place plain plan play please point pond pull pure put
quick quiet quite quiz quilt queen quote rain rare rate read ready real red rest rich ride right ring rise river road rock room root round row run rush
safe same sand sea seat see seed seem send set shade share sharp she shell shine ship short show side six sky slow small smile snow soft some song soon sound south space speak speed stand star start stay step still stone stop story street strong sun sure
table take tall tea team tear tell ten test text than that the their them then there these they thin thing think third this those three through throw time tiny tip toad today tone too top town train tree true try turn two
under until use very view voice walk wall warm was watch water way wear week well went were west what when where which white who why wide will win wind wing wish with word work world would write
yard year yellow yes yet you your zero zone zoo zip zebra`.split(/\s+/u);

const ACCURACY = [
  "keep a calm pace", "read each word with care", "rest your hands then begin", "let each small step count",
  "check the next word", "take time to stay steady", "keep your eyes on the line", "a clear path leads home",
  "write one line at a time", "soft light fills the room", "a small bird rests here", "we can learn each day",
];
const SPEED = [
  "we walk along the path", "the river flows past home", "a warm day brings clear skies", "we read and write each day",
  "keep your hands at ease", "let the words flow in order", "the next line is ready", "we move from one word to the next",
  "a light wind moves the leaves", "we meet near the garden", "follow the road back home", "there is time to find a rhythm",
];
const GENERAL = [
  "red birds rest near the river", "turn the page and read", "bring a bright red bag", "rain falls on the road",
  "the tree stands near the gate", "three friends walk together", "think of the other path", "this is the third step",
  "a quiet room helps us think", "take a quick look at the map", "the queen has a quilt", "a zebra rests near the zoo",
  "fresh fish fill the pond", "five friends find the path", "we check each small choice", "watch the clock then begin",
  "go through the gate", "walk through the garden", "look through the window", "read through the notes",
  "the road is clear", "follow the road home", "a quiet road curves ahead", "the light shines on the page",
  "open the box with care", "a yellow kite rises high", "join the team after lunch", "we enjoy a calm day",
];
export interface ContentChunk { readonly text:string; readonly prepared:TargetText }
export interface ContentBank {
  readonly version:string;
  readonly words:readonly ContentChunk[];
  readonly familiarWords:readonly ContentChunk[];
  readonly phrases:readonly ContentChunk[];
  readonly accuracy:readonly ContentChunk[];
  readonly speed:readonly ContentChunk[];
  readonly general:readonly ContentChunk[];
  readonly wordsByGrapheme:ReadonlyMap<string,readonly ContentChunk[]>;
  readonly wordsByBigram:ReadonlyMap<string,readonly ContentChunk[]>;
}
const key=(a:string,b:string)=>JSON.stringify([a,b]);
export function prepareContentBank(version:string,words:readonly string[],groups:{accuracy:readonly string[];speed:readonly string[];general:readonly string[]}):ContentBank {
  const prepare=(texts:readonly string[])=>Object.freeze([...new Set(texts)].sort(compareUnicode).map(text=>Object.freeze({text,prepared:prepareTypingText(text)})));
  const preparedWords=prepare(words);const byGrapheme=new Map<string,ContentChunk[]>(),byBigram=new Map<string,ContentChunk[]>();
  for(const chunk of preparedWords) {
    for(const unit of new Set(chunk.prepared.expectedUnits)) {const rows=byGrapheme.get(unit)??[];rows.push(chunk);byGrapheme.set(unit,rows);}
    for(const pair of new Set(chunk.prepared.expectedUnits.slice(1).map((b,i)=>key(chunk.prepared.expectedUnits[i],b)))) {const rows=byBigram.get(pair)??[];rows.push(chunk);byBigram.set(pair,rows);}
  }
  for(const rows of [...byGrapheme.values(),...byBigram.values()])Object.freeze(rows);
  return Object.freeze({version,words:preparedWords,familiarWords:prepare([...groups.accuracy,...groups.speed].flatMap(text=>prepareTypingText(text).words.map(w=>w.text))),phrases:prepare([...groups.accuracy,...groups.speed,...groups.general]),
    accuracy:prepare(groups.accuracy),speed:prepare(groups.speed),general:prepare(groups.general),wordsByGrapheme:byGrapheme,wordsByBigram:byBigram});
}
export const ENGLISH_CONTENT=prepareContentBank(EXERCISE.contentVersion,WORDS,{accuracy:ACCURACY,speed:SPEED,general:GENERAL});
