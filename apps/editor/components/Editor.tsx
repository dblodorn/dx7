"use client";

// The editor's one client root, built on vz10m's components/Editor.tsx: the header (name, undo, SOUND, KEYS, AUDIO,
// SEND, LIBRARY, MIDI), the AUDIO and MIDI dialogs, computer-key audition, and the DX7 voice: the algorithm, the six
// operators, the selected operator's panel and the voice-wide settings. Every edit goes through the codec's set()
// on the voice's 155 bytes (lib/dx7/codec.ts).

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import * as A from "../lib/audio";
import * as M from "../lib/midi";
import { router } from "../lib/router";
import * as V from "../lib/dx7/codec";
import { parse, toParamChange, toSysex, type SyxItem } from "../lib/dx7/sysex";
import type { Dir, LivePort, PortInfo, Status } from "../lib/midi";
import { OPERATOR_ENABLE_PARAM, OPERATORS, voiceField, type Operator } from "@dblodorn/yamaha-dx7-engine";
import { entry, fromB64, loadLibrary, saveLibrary, store, toB64, type Entry } from "../lib/store";
import AlgorithmDiagram from "./AlgorithmDiagram";
import Envelope from "./Envelope";
import ImportDialog, { type Pending } from "./ImportDialog";
import Info from "./Info";
import ScalingCurve from "./ScalingCurve";
import { Check, FieldRow, NOTE, Param, ParamSelect, ROW, SMALL } from "./params";
import { Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, SelectItem } from "@dblodorn/sound-ui";

const Library = dynamic(() => import("./Library"), { ssr: false });
const KeyboardFloater = dynamic(() => import("./KeyboardFloater"), { ssr: false });

const CHANNELS = Array.from({ length: 16 }, (_, k) => k + 1);
interface Device { id: string; label: string }
const deviceName = (d: Device): string => (d.label || "UNNAMED DEVICE").toUpperCase();
const portName = (p: PortInfo): string => p.name.toUpperCase() + (p.manufacturer ? "   " + p.manufacturer.toUpperCase() : "");
// computer keys for auditioning: the bottom letter row plays C4 to C5
const KEYS: Record<string, number> = { z: 60, s: 61, x: 62, d: 63, c: 64, v: 65, g: 66, b: 67, h: 68, n: 69, j: 70, m: 71, ",": 72 };
const ALL_ON: Record<Operator, boolean> = { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true };
// SEND ON EDIT sends a parameter change per changed byte up to this many, else the whole voice
const PARAM_CHANGES_MAX = 10;
const H2 = "m-0 text-[11px] font-normal tracking-[.08em]";

// Undo history: every edit pushes the whole voice (155 bytes), capped.
const LIMIT = 200;
interface History { past: Uint8Array[]; voice: Uint8Array; future: Uint8Array[] }
type Action = { type: "edit"; voice: Uint8Array } | { type: "undo" } | { type: "redo" };

function history(state: History, action: Action): History {
  switch (action.type) {
    case "edit": return { past: [...state.past, state.voice].slice(-LIMIT), voice: action.voice, future: [] };
    case "undo": {
      const prev = state.past.at(-1);
      return prev ? { past: state.past.slice(0, -1), voice: prev, future: [state.voice, ...state.future] } : state;
    }
    case "redo": {
      const next = state.future[0];
      return next ? { past: [...state.past, state.voice], voice: next, future: state.future.slice(1) } : state;
    }
  }
}

export default function Editor() {
  const [{ voice, past, future }, dispatch] = useReducer(history, null, (): History => ({ voice: V.initVoice(), past: [], future: [] }));
  const [opSel, setOpSel] = useState<Operator>(1);
  const [opsOn, setOpsOn] = useState<Record<Operator, boolean>>(ALL_ON); // session state, never stored (parameter 155)
  const [clip, setClip] = useState<Uint8Array | null>(null); // COPY OPERATOR
  const [midiOpen, setMidiOpen] = useState(false);
  const [libOpen, setLibOpen] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null); // voices waiting in the import dialog
  const [midiSupported, setMidiSupported] = useState<boolean | null>(null);
  const [midi, setMidi] = useState<Status>(() => M.status());
  const [inputs, setInputs] = useState<PortInfo[]>([]);
  const [outputs, setOutputs] = useState<PortInfo[]>([]);
  const [channel, setChannel] = useState(1);
  const [autoSend, setAutoSend] = useState(false);
  const [msg, setMsg] = useState("");
  const [keysOpen, setKeysOpen] = useState(false); // the keyboard floater
  const [sound, setSound] = useState(false); // the emulator in the browser
  const soundRef = useRef(false);
  // AUDIO: the emulator's output device, as windchime chooses it
  const [audioOpen, setAudioOpen] = useState(false);
  const [audioSupported, setAudioSupported] = useState<boolean | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [wantedDevice, setWantedDevice] = useState<Device>({ id: "", label: "" });
  const [audioMsg, setAudioMsg] = useState("");
  const [library, setLibrary] = useState<Entry[]>([]);
  const restored = useRef(false);

  const edit = useCallback((next: Uint8Array) => dispatch({ type: "edit", voice: next }), []);
  const setValues = useCallback((values: Record<string, number>) => edit(V.setMany(voice, values)), [edit, voice]);
  const val = (key: string): number => V.get(voice, key);
  // a voice from elsewhere (library, INIT, the DX7): all operators back on, as the DX7 does on a voice change
  const openVoice = useCallback((bytes: Uint8Array) => { edit(bytes); setOpsOn(ALL_ON); A.setOperators(V.enableMask(ALL_ON)); }, [edit]);

  // ---- persistence: read after mount so the server render matches ----
  useEffect(() => {
    setMidiSupported(M.supported());
    const saved = store.get<string | null>("voice", null);
    if (saved) { try { const v = fromB64(saved); if (v.length === V.VOICE_BYTES) dispatch({ type: "edit", voice: v }); } catch (e) {} }
    setChannel(store.get("channel", 1));
    setAutoSend(store.get("autoSend", false));
    M.setWanted("in", store.get("midiIn", ""));
    M.setWanted("out", store.get("midiOut", ""));
    setLibrary(loadLibrary());
    setKeysOpen(store.get("keys.open", false));
    restored.current = true;
  }, []);
  useEffect(() => { if (restored.current) store.set("voice", toB64(voice)); }, [voice]);
  // every voice change reaches the emulator (a no-op until SOUND has started it)
  useEffect(() => { A.setVoice(voice); }, [voice]);
  useEffect(() => { if (restored.current) store.set("channel", channel); }, [channel]);
  useEffect(() => { router.setChannel(channel); }, [channel]);
  useEffect(() => { if (restored.current) store.set("keys.open", keysOpen); }, [keysOpen]);
  useEffect(() => { if (restored.current) store.set("autoSend", autoSend); }, [autoSend]);
  // ---- audio output device ----
  const listDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      // "default" and "communications" are aliases Chrome adds for the system's own choices
      setDevices(all.filter(d => d.kind === "audiooutput" && !["default", "communications"].includes(d.deviceId)).map(d => ({ id: d.deviceId, label: d.label })));
    } catch (e) { setDevices([]); }
  }, []);
  useEffect(() => {
    const ok = A.deviceChoiceSupported() && !!navigator.mediaDevices?.enumerateDevices;
    setAudioSupported(ok);
    const w = store.get<Partial<Device> | null>("audioOut", null);
    if (w && typeof w.id === "string") setWantedDevice({ id: w.id, label: typeof w.label === "string" ? w.label : "" });
    if (!ok) return;
    listDevices();
    navigator.mediaDevices.addEventListener("devicechange", listDevices);
    return () => navigator.mediaDevices.removeEventListener("devicechange", listDevices);
  }, [listDevices]);
  // the device to play on: the wanted one by id, else by name; the system default while it is unplugged. While the
  // browser hides device names (no media permission yet) the list can't be read, so the remembered id is tried as is.
  const namesHidden = !!audioSupported && devices.every(d => !d.label);
  const liveDevice = wantedDevice.id
    ? devices.find(d => d.id === wantedDevice.id) || (wantedDevice.label ? devices.find(d => d.label === wantedDevice.label) : undefined)
    : undefined;
  const deviceGone = !!audioSupported && !!wantedDevice.id && !namesHidden && !liveDevice;
  const sinkId = !audioSupported || !wantedDevice.id ? "" : liveDevice ? liveDevice.id : namesHidden ? wantedDevice.id : "";
  useEffect(() => {
    if (!audioSupported) return;
    A.setDevice(sinkId).catch(e => setAudioMsg(`THAT DEVICE WOULD NOT OPEN${e instanceof Error && e.message ? `: ${e.message}` : ""}.`));
  }, [audioSupported, sinkId]);
  function chooseDevice(v: string) {
    setAudioMsg("");
    const d = v === "default" ? { id: "", label: "" } : devices.find(x => x.id === v);
    if (!d) return;
    setWantedDevice(d);
    store.set("audioOut", d);
  }
  // Browsers only reveal device names after media permission; asking once for the microphone shows them.
  async function onShowNames() {
    setAudioMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      await listDevices();
    } catch (e) {
      setAudioMsg("THE BROWSER KEPT DEVICE NAMES HIDDEN. ALLOW THE MICROPHONE FOR THIS PAGE TO SEE THEM.");
    }
  }
  const deviceValue = !wantedDevice.id ? "default" : liveDevice ? liveDevice.id : "wanted";
  const deviceText = !wantedDevice.id ? "SYSTEM DEFAULT" : liveDevice ? deviceName(liveDevice) : `${deviceName(wantedDevice)}${namesHidden ? "" : "   DISCONNECTED"}`;

  const updateLibrary = useCallback((fn: (list: Entry[]) => Entry[]) => setLibrary(list => { const next = fn(list); saveLibrary(next); return next; }), []);
  const addToLibrary = useCallback((items: SyxItem[]) => {
    updateLibrary(list => [...items.map(i => entry(i.name || "UNTITLED", i.data)), ...list]);
    setMsg(`ADDED ${items.length} VOICE${items.length === 1 ? "" : "S"} TO LOCAL.`);
  }, [updateLibrary]);

  // ---- MIDI ----
  useEffect(() => M.onChange(() => {
    const s = M.status();
    setMidi(s);
    setInputs(M.listInputs());
    setOutputs(M.listOutputs());
    if (s.wanted.in) store.set("midiIn", s.wanted.in);
    if (s.wanted.out) store.set("midiOut", s.wanted.out);
  }), []);

  // what the DX7 has, as far as SEND ON EDIT knows; a voice that came from the DX7 isn't sent back
  const known = useRef<Uint8Array | null>(null);
  const fromDevice = useRef(false);

  // Anything from MIDI IN: the DX7 sends on channel 1 whatever its receive channel (manual p.22), so every channel
  // is read.
  useEffect(() => M.onSysex(({ raw }) => {
    const p = parse(raw);
    if ("error" in p) {
      if (p.error === "not a Yamaha bulk dump") return;
      setMsg(p.format !== undefined && p.format !== 0 && p.format !== 9 ? `RECEIVED YAMAHA FORMAT ${p.format}, WHICH ISN'T A DX7 VOICE OR BANK.` : `RECEIVED A DAMAGED DUMP: ${p.error.toUpperCase()}.`);
      return;
    }
    if (p.type === "voice") {
      fromDevice.current = true;
      openVoice(p.data);
      setMsg(`RECEIVED VOICE ${V.getName(p.data) || "UNTITLED"}. UNDO GOES BACK TO WHAT WAS HERE.`);
    } else {
      setPending({ title: "BANK FROM THE DX7", items: p.voices.map((data, slot) => ({ name: V.getName(data), data, from: "bank", slot })), note: "32 voices arrived. Choose the ones to add to LOCAL." });
    }
  }), [openVoice]);

  // SEND ON EDIT: each changed byte as a parameter change, at once; a bigger change (INIT, opening a voice, paste) as
  // one voice dump
  useEffect(() => {
    if (!restored.current) return;
    const prev = known.current;
    known.current = voice;
    if (fromDevice.current) { fromDevice.current = false; return; }
    if (!autoSend || !midi.output || !prev) return;
    const changed: number[] = [];
    voice.forEach((b, i) => { if (b !== prev[i]) changed.push(i); });
    if (!changed.length) return;
    M.sendSysex(changed.length <= PARAM_CHANGES_MAX ? changed.map(i => toParamChange(i, voice[i]!, { channel })) : toSysex(voice, { channel }), 0);
  }, [voice, autoSend, midi.output, channel]);

  function toggleOp(op: Operator, on: boolean) {
    const next = { ...opsOn, [op]: on };
    setOpsOn(next);
    A.setOperators(V.enableMask(next));
    if (autoSend && midi.output) M.sendSysex(toParamChange(OPERATOR_ENABLE_PARAM, V.enableMask(next), { channel }));
  }

  async function onConnect() {
    setMsg("");
    try { await M.connect(); } catch (e) { setMsg(e instanceof Error && e.message ? e.message : "MIDI access was refused."); }
  }
  // Start the emulator inside the current click or key press. Also used by the keyboard floater.
  const startSound = useCallback(async (): Promise<boolean> => {
    if (soundRef.current) return true;
    if (!A.supported()) { setMsg("THIS BROWSER CAN'T RUN THE EMULATOR (NO AUDIO WORKLET)."); return false; }
    try {
      await A.start();
      soundRef.current = true; setSound(true);
      return true;
    } catch (e) {
      setMsg(`THE EMULATOR WOULD NOT START${e instanceof Error && e.message ? `: ${e.message}` : ""}.`);
      return false;
    }
  }, []);
  // SOUND: start the emulator, or silence it; MIDI is unaffected either way
  async function onSound() {
    if (!soundRef.current) { await startSound(); return; }
    soundRef.current = false; setSound(false);
    await A.stop();
  }

  async function onSend() {
    const ok = await M.sendSysex(toSysex(voice, { channel }));
    setMsg(ok ? `SENT ${V.getName(voice) || "VOICE"} ON CHANNEL ${channel}.` : "NOTHING SENT: CHOOSE A MIDI OUT PORT.");
  }

  // audition from the computer keyboard, unless typing in a field; notes go where PLAY TO (on KEYS) says
  useEffect(() => {
    const held = new Set<number>();
    const typing = (e: KeyboardEvent): boolean => e.target instanceof Element && !!e.target.closest("input, textarea, [role=combobox], [role=slider], [role=listbox]");
    const down = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || typing(e)) return;
      const n = KEYS[e.key.toLowerCase()];
      if (n === undefined || held.has(n)) return;
      held.add(n); router.noteOn(n);
    };
    const up = (e: KeyboardEvent) => { const n = KEYS[e.key.toLowerCase()]; if (n !== undefined && held.delete(n)) router.noteOff(n); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); held.forEach(n => router.noteOff(n)); };
  }, []);

  // undo / redo: Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z" || (e.target instanceof Element && e.target.closest("input"))) return;
      e.preventDefault();
      dispatch({ type: e.shiftKey ? "redo" : "undo" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const name = V.getName(voice);
  const o = `op${opSel}.`;
  const midiReady = midi.connected;
  const midiLive = !!midi.output;
  const row = (key: string, info?: Parameters<typeof FieldRow>[0]["info"], label?: string) => (
    <FieldRow key={key} id={key.replace(".", "-")} field={voiceField(key)} value={val(key)} onChange={v => setValues({ [key]: v })}
      {...(info ? { info } : {})} {...(label ? { label } : {})} />
  );

  return (
    <main className="mx-auto grid max-w-[1180px] gap-5">
      <header className="flex flex-wrap items-center gap-2.5">
        <h1 className={H2}>DX7</h1>
        <span className="lead min-w-6" />
        <label className="flex items-center gap-2">
          <span id="name-label" className={SMALL}>NAME</span>
          <input
            aria-labelledby="name-label" value={name} maxLength={10} spellCheck={false}
            onChange={e => edit(V.setName(voice, e.target.value))}
            className="h-8 w-[14ch] border border-foreground bg-background px-2 tracking-[.06em] outline-none focus-visible:outline-1 focus-visible:outline-offset-3 focus-visible:outline-dashed touch:text-[16px]"
          />
        </label>
        <Button onClick={() => dispatch({ type: "undo" })} disabled={!past.length}>UNDO</Button>
        <Button onClick={() => dispatch({ type: "redo" })} disabled={!future.length}>REDO</Button>
        <Button onClick={() => openVoice(V.initVoice())}>INIT</Button>
        <span className="flex items-center gap-1.5"><Button aria-pressed={sound} onClick={onSound}>SOUND</Button><Info k="sound" /></span>
        <span className="flex items-center gap-1.5"><Button aria-pressed={keysOpen} onClick={() => setKeysOpen(k => !k)}>KEYS</Button><Info k="keys" /></span>
        <Dialog open={audioOpen} onOpenChange={setAudioOpen}>
          <DialogTrigger asChild>
            <Button className="touch:hidden">AUDIO</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <div className="flex items-baseline gap-2">
                <DialogTitle>AUDIO OUT</DialogTitle>
                <span className="lead" />
                <DialogClose asChild><Button>CLOSE</Button></DialogClose>
              </div>
              <DialogDescription className={NOTE}>Play the emulator through any audio device. SOUND turns it on.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3.5">
              <Param id="a-dev" label="DEVICE" value={deviceGone ? "DISCONNECTED" : sinkId ? "CHOSEN" : "DEFAULT"}>
                <ParamSelect id="a-dev" value={deviceValue} display={deviceText} onChange={chooseDevice} disabled={!audioSupported}>
                  <SelectItem value="default">SYSTEM DEFAULT</SelectItem>
                  {deviceValue === "wanted" && <SelectItem value="wanted" disabled>{deviceText}</SelectItem>}
                  {!namesHidden && devices.map(d => <SelectItem key={d.id} value={d.id}>{deviceName(d)}</SelectItem>)}
                </ParamSelect>
              </Param>
              {namesHidden && (
                <div className={ROW}>
                  <Button onClick={onShowNames}>SHOW DEVICE NAMES</Button>
                  <span className={`${NOTE} min-w-0`}>The browser shows device names only after you allow the microphone once. Nothing is recorded.</span>
                </div>
              )}
              {audioSupported === false && <p className={NOTE}>THIS BROWSER PLAYS THROUGH THE SYSTEM OUTPUT. CHOOSE THE DEVICE IN YOUR SYSTEM SETTINGS.</p>}
              {audioMsg && <p className={NOTE}>{audioMsg}</p>}
            </div>
          </DialogContent>
        </Dialog>
        <Button onClick={onSend} disabled={!midiLive}>SEND</Button>
        <Button onClick={() => setLibOpen(true)}>LIBRARY</Button>
        <Dialog open={midiOpen} onOpenChange={setMidiOpen}>
          <DialogTrigger asChild>
            <Button data-live={midiLive || undefined} className="data-[live]:bg-foreground data-[live]:text-background">MIDI</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <div className="flex items-baseline gap-2">
                <DialogTitle>MIDI</DialogTitle>
                <Info k="midi" />
                <span className="lead" />
                <DialogClose asChild><Button>CLOSE</Button></DialogClose>
              </div>
              <DialogDescription className={NOTE}>Voices travel as SysEx both ways. The browser asks for SysEx access when you connect.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3.5">
              {!midiReady ? (
                <div className={ROW}>
                  <Button onClick={onConnect} disabled={midiSupported === false}>CONNECT MIDI</Button>
                  {midiSupported === false && <span className={NOTE}>This browser has no Web MIDI. Use Chrome or Edge on a computer.</span>}
                </div>
              ) : (
                <>
                  {([["in", "MIDI IN", inputs, midi.input], ["out", "MIDI OUT", outputs, midi.output]] as [Dir, string, PortInfo[], LivePort | null][]).map(([dir, label, ports, live]) => (
                    <Param key={dir} id={`m-${dir}`} label={label} value={live ? "OPEN" : "NONE"}>
                      <ParamSelect id={`m-${dir}`} value={live ? live.id : "none"} display={live ? portName(live) : "NONE"} onChange={v => M.select(dir, v === "none" ? "" : v)}>
                        <SelectItem value="none">NONE</SelectItem>
                        {!live && midi.wanted[dir] && <SelectItem value="wanted" disabled>{midi.wanted[dir].toUpperCase()}   DISCONNECTED</SelectItem>}
                        {ports.map(p => <SelectItem key={p.id} value={p.id}>{portName(p)}</SelectItem>)}
                      </ParamSelect>
                    </Param>
                  ))}
                  <Param id="m-ch" label="CHANNEL" value={channel}>
                    <ParamSelect id="m-ch" value={String(channel)} display={`CHANNEL ${channel}`} onChange={v => setChannel(Number(v))}>
                      {CHANNELS.map(c => <SelectItem key={c} value={String(c)}>CHANNEL {c}</SelectItem>)}
                    </ParamSelect>
                  </Param>
                  <Check checked={autoSend} onChange={setAutoSend}>SEND ON EDIT</Check>
                  <div className={ROW}>
                    <Button disabled={!midiLive} onClick={() => { M.noteOn(channel, 60); setTimeout(() => M.noteOff(channel, 60), 500); }}>TEST NOTE</Button>
                    <Button disabled={!midiLive} onClick={() => { router.allOff(); M.allNotesOff(channel); A.allOff(); }}>PANIC</Button>
                  </div>
                  <p className={NOTE}>On the DX7: FUNCTION, then 8 for MIDI CH (match CHANNEL here); 8 again for SYS INFO AVAIL. Selecting a voice on the DX7 sends it here; 8 once more, MIDI TRANSMIT? YES, sends all 32 as a bank. To receive voices from here, also set MEMORY PROTECT INTERNAL to OFF. SEND ON EDIT sends each change as you make it.</p>
                  {!inputs.length && !outputs.length && <p className={NOTE}>No MIDI ports found. Plug in an interface.</p>}
                </>
              )}
              {midi.error && <p className={NOTE}>{midi.error}</p>}
            </div>
          </DialogContent>
        </Dialog>
      </header>

      {msg && <p role="status" className={`${NOTE} max-w-none`}>{msg}</p>}

      <section aria-label="ALGORITHM" className="grid gap-4 border border-foreground p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <AlgorithmDiagram algorithm={val("algorithm")} selected={opSel} enabled={opsOn} onSelect={setOpSel} />
        <div className="grid content-start gap-3.5">
          {row("algorithm", "algorithm")}
          {row("feedback", "feedback")}
          {row("oscSync", "oscSync")}
        </div>
      </section>

      <div className="-mb-2 flex items-baseline gap-2">
        <h2 className={H2}>OPERATORS</h2>
        <Info k="operators" />
        <span className="lead" />
      </div>
      <section aria-label="OPERATORS" className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {OPERATORS.map(op => {
          const carrier = V.algorithmOf(val("algorithm")).carriers.includes(op);
          return (
            <div key={op} role="group" aria-label={`OPERATOR ${op}`} className={`grid gap-1.5 border border-foreground p-1.5 ${opsOn[op] ? "" : "opacity-40"}`}>
              <button aria-pressed={opSel === op} onClick={() => setOpSel(op)}
                className="grid cursor-pointer gap-0.5 border border-foreground bg-background p-1.5 text-left text-foreground hover:bg-foreground hover:text-background aria-pressed:bg-foreground aria-pressed:text-background focus-visible:outline-1 focus-visible:outline-offset-3 focus-visible:outline-dashed">
                <span className="flex items-baseline gap-2 tracking-[.08em]">OP{op}<span className="lead" /><span className={SMALL}>{carrier ? "CARRIER" : "MOD"}</span></span>
                <span className={`${SMALL} tabular-nums`}>LEVEL {val(`op${op}.ol`)} · {V.frequency(voice, op).text}</span>
              </button>
              <Check checked={opsOn[op]} onChange={v => toggleOp(op, v)}>ON</Check>
            </div>
          );
        })}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section aria-label={`OPERATOR ${opSel}`} className="grid content-start gap-3.5">
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className={H2}>OPERATOR {opSel}</h2>
            <span className="lead min-w-4" />
            <Button onClick={() => { setClip(V.operatorBytes(voice, opSel)); setMsg(`COPIED OPERATOR ${opSel}.`); }}>COPY</Button>
            <Button disabled={!clip} onClick={() => { if (clip) { edit(V.setOperator(voice, opSel, clip)); setMsg(`PASTED ONTO OPERATOR ${opSel}.`); } }}>PASTE</Button>
          </div>
          {row(`${o}ol`, "output")}
          {row(`${o}kvs`)}
          {row(`${o}ams`)}
          <Param id="freq" label="FREQUENCY" info="frequency" value={V.frequency(voice, opSel).text} />
          {row(`${o}mode`)}
          {row(`${o}coarse`)}
          {row(`${o}fine`)}
          {row(`${o}detune`)}
          <Param id="env" label="ENVELOPE" info="envelope" value={`OP${opSel}`} />
          <Envelope id="op-env" voice={voice} prefix={o} onChange={setValues} />
          <Param id="kls" label="KEYBOARD LEVEL SCALING" info="scaling" value={`BREAK ${voiceField(`${o}bp`).display!(val(`${o}bp`))}`} />
          <ScalingCurve bp={val(`${o}bp`)} ld={val(`${o}ld`)} rd={val(`${o}rd`)} lc={val(`${o}lc`)} rc={val(`${o}rc`)} />
          {row(`${o}bp`)}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
            {row(`${o}ld`)}
            {row(`${o}rd`)}
            {row(`${o}lc`)}
            {row(`${o}rc`)}
          </div>
          {row(`${o}rs`, "rateScaling")}
        </section>

        <section aria-label="VOICE" className="grid content-start gap-3.5">
          <h2 className={H2}>VOICE</h2>
          <Param id="penv" label="PITCH ENVELOPE" info="pitchEnv" value={`L1 ${val("pl1")}`} />
          <Envelope id="pitch-env" voice={voice} prefix="p" center onChange={setValues} />
          <div role="group" aria-label="LFO" className="grid gap-2.5 border border-foreground p-2.5">
            <span className="flex items-center gap-2"><span className="tracking-[.08em]">LFO</span><Info k="lfo" /></span>
            {["lfoWave", "lfoSpeed", "lfoDelay", "lfoPmd", "lfoAmd", "lfoSync", "pms"].map(k => row(k))}
          </div>
          {row("transpose", "transpose")}
        </section>
      </div>

      <footer className={`flex flex-wrap items-center gap-3 ${SMALL}`}>
        <span>VALUES ARE THE DX7&apos;S OWN 0–99 PANEL VALUES, AS STORED.</span>
        <span className="lead min-w-6" />
        <Link href="/changelog" className="text-foreground">CHANGELOG</Link>
      </footer>

      {keysOpen && <KeyboardFloater onClose={() => setKeysOpen(false)} ensureSound={startSound} />}

      <ImportDialog pending={pending} onClose={() => setPending(null)} onAdd={addToLibrary} />

      {libOpen && (
        <Library
          open={libOpen} onOpenChange={setLibOpen}
          library={library} updateLibrary={updateLibrary}
          voice={voice} onOpen={bytes => { openVoice(bytes); setLibOpen(false); }}
          onImport={p => setPending(p)}
          canSend={midiLive}
          onSend={async (m, what) => { const ok = await M.sendSysex(m); setMsg(ok ? `SENT ${what}.` : "NOTHING SENT: CHOOSE A MIDI OUT PORT."); }}
        />
      )}
    </main>
  );
}
