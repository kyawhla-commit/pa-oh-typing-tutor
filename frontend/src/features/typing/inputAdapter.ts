/** Native editable staging area. Domain text never becomes a browser selection. */
export interface TypingInputSink {
  insertText(text: string): unknown;
  deleteBackward(): unknown;
}

export function attachTypingInput(input: HTMLTextAreaElement, sink: TypingInputSink, onCompositionDraft?: (text: string | null) => void) {
  let composing = false;
  let backspaceEcho = false;
  let compositionEcho: string | null = null;
  let handledInput: { type: string; text: string | null } | null = null;
  let keyboardInsertion: "insertText" | "insertLineBreak" | null = null;
  const listeners: Array<[string, EventListener]> = [];
  const anchor = () => {
    // Native IME selection is draft state and must remain under browser control.
    // setSelectionRange can itself emit select; avoid a self-triggering loop.
    const end = input.value.length;
    if (!composing && (input.selectionStart !== end || input.selectionEnd !== end)) {
      input.setSelectionRange(end, end);
    }
  };
  const clear = () => { input.value = ""; anchor(); };
  const reset = () => { composing = false; onCompositionDraft?.(null); backspaceEcho = false; compositionEcho = null; handledInput = null; keyboardInsertion = null; clear(); };
  const listen = (type: string, listener: EventListener) => {
    input.addEventListener(type, listener);
    listeners.push([type, listener]);
  };
  const supported = (type: string) => ["insertText", "insertLineBreak", "insertParagraph", "deleteContentBackward"].includes(type);
  const compositionType = (type: string) => ["insertCompositionText", "deleteCompositionText", "insertFromComposition", "deleteByComposition"].includes(type);
  // A missing inputType is usable only after a text/Enter key, or as a known
  // commit echo. Named unsupported edits never receive this fallback.
  const inputTypeOf = (event: InputEvent) => event.inputType || keyboardInsertion
    || (handledInput && handledInput.text === event.data ? handledInput.type : "")
    || (compositionEcho !== null && (event.data === compositionEcho || input.value === compositionEcho) ? "insertText" : "");
  const textOf = (event: InputEvent, type: string) => type === "insertLineBreak" || type === "insertParagraph"
    ? "\n" : event.data ?? input.value;
  const commit = (event: InputEvent, type: string) => {
    if (type === "deleteContentBackward") sink.deleteBackward();
    else if (textOf(event, type)) sink.insertText(textOf(event, type));
  };
  const isEcho = (event: InputEvent, type: string) => compositionEcho !== null
    && ["insertText", "insertFromComposition", "insertCompositionText"].includes(type)
    && (event.data === compositionEcho || (event.data === null && (input.value === "" || input.value === compositionEcho)));

  listen("compositionstart", () => { reset(); composing = true; onCompositionDraft?.(""); });
  // Updates are draft text only. Native editing stays enabled throughout composition.
  listen("compositionupdate", (event) => { if (composing) onCompositionDraft?.((event as CompositionEvent).data); });
  listen("compositionend", (raw) => {
    if (!composing) return; // A blur/reset cancelled this composition.
    composing = false;
    onCompositionDraft?.(null);
    const text = (raw as CompositionEvent).data;
    if (text) sink.insertText(text);
    compositionEcho = text || null;
    clear();
  });
  listen("beforeinput", (raw) => {
    const event = raw as InputEvent;
    const type = inputTypeOf(event);
    // Unsupported edits also cancel draft state so a later end cannot score them.
    if (!supported(type) && !compositionType(type)) {
      event.preventDefault(); reset(); handledInput = { type, text: event.data }; return;
    }
    if (composing || event.isComposing) return;
    if (isEcho(event, type)) {
      event.preventDefault(); compositionEcho = null;
      handledInput = { type, text: event.data }; keyboardInsertion = null; clear(); return;
    }
    if (backspaceEcho && type === "deleteContentBackward") {
      backspaceEcho = false; event.preventDefault(); clear(); return;
    }
    backspaceEcho = false;
    compositionEcho = null;
    handledInput = null;
    const selection = input.selectionStart !== input.value.length || input.selectionEnd !== input.value.length;
    if (!supported(type) || selection) {
      event.preventDefault(); handledInput = { type, text: event.data }; keyboardInsertion = null; clear(); return;
    }
    // Some keyboard/browser paths omit beforeinput.data. Let the native edit
    // occur so input can supply the committed scratch value instead of losing it.
    if (event.cancelable && (type === "deleteContentBackward" || textOf(event, type))) {
      event.preventDefault();
      commit(event, type);
      handledInput = { type, text: event.data };
      keyboardInsertion = null;
      clear();
    } else if (type === "insertText") {
      keyboardInsertion = "insertText";
    }
  });
  listen("input", (raw) => {
    const event = raw as InputEvent;
    const type = inputTypeOf(event);
    if (!supported(type) && !compositionType(type)) { reset(); return; }
    if (composing || event.isComposing) { if (composing) onCompositionDraft?.(input.value); return; }
    if (isEcho(event, type)) { compositionEcho = null; keyboardInsertion = null; clear(); return; }
    compositionEcho = null;
    if (handledInput?.type === type && handledInput.text === event.data) {
      handledInput = null; keyboardInsertion = null; clear(); return;
    }
    handledInput = null;
    if (supported(type)) commit(event, type);
    keyboardInsertion = null;
    clear();
  });
  listen("keydown", (raw) => {
    const event = raw as KeyboardEvent;
    if (composing || event.isComposing || event.keyCode === 229) { keyboardInsertion = null; return; }
    compositionEcho = null; handledInput = null; backspaceEcho = false;
    const modifier = event.ctrlKey || event.metaKey || event.altKey;
    keyboardInsertion = !modifier && event.key === "Enter" ? "insertLineBreak"
      : !modifier && Array.from(event.key).length === 1 ? "insertText" : null;
    if (event.key === "Backspace") {
      event.preventDefault();
      if (!modifier) sink.deleteBackward();
      // Native default was prevented; suppress a stray delete echo too.
      backspaceEcho = true;
      handledInput = { type: "deleteContentBackward", text: null };
      clear();
    } else if (["Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)
      || ((event.ctrlKey || event.metaKey) && ["a", "x", "z", "y"].includes(event.key.toLowerCase()))) {
      event.preventDefault(); anchor();
    }
  });
  for (const type of ["paste", "drop", "cut"]) listen(type, (event) => { event.preventDefault(); reset(); });
  listen("pointerdown", () => { compositionEcho = null; handledInput = null; backspaceEcho = false; keyboardInsertion = null; });
  listen("click", anchor);
  listen("select", anchor);
  listen("focus", reset);
  listen("blur", reset); // Clock continues; there is no domain PAUSE here.
  reset();
  return {
    reset,
    focus: () => { input.focus({ preventScroll: true }); anchor(); },
    dispose: () => { for (const [type, listener] of listeners) input.removeEventListener(type, listener); reset(); },
  };
}
