"use client";

// The editor's one client root, copied from vz10m's components/Editor.tsx with the VZ voice editing taken out:
// the header (SOUND, KEYS, AUDIO, LIBRARY, MIDI), the AUDIO and MIDI dialogs, computer-key audition and the
// footer. The DX7 voice editor (dx7-editor-sysex) fills the empty VOICE section.

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import * as A from "../lib/audio";
import * as M from "../lib/midi";
import { router } from "../lib/router";
import type { Dir, LivePort, PortInfo, Status } from "../lib/midi";
import { VOICE_BYTES } from "@dblodorn/yamaha-dx7-engine";
import { store } from "../lib/store";
import Info from "./Info";
import { NOTE, Param, ParamSelect, ROW, SMALL } from "./params";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SelectItem } from "@/components/ui/select";

const Library = dynamic(() => import("./Library"), { ssr: false });
const KeyboardFloater = dynamic(() => import("./KeyboardFloater"), { ssr: false });

const CHANNELS = Array.from({ length: 16 }, (_, k) => k + 1);
interface Device { id: string; label: string }
const deviceName = (d: Device): string => (d.label || "UNNAMED DEVICE").toUpperCase();
const portName = (p: PortInfo): string => p.name.toUpperCase() + (p.manufacturer ? "   " + p.manufacturer.toUpperCase() : "");
// computer keys for auditioning: the bottom letter row plays C4 to C5
const KEYS: Record<string, number> = { z: 60, s: 61, x: 62, d: 63, c: 64, v: 65, g: 66, b: 67, h: 68, n: 69, j: 70, m: 71, ",": 72 };

export default function Editor() {
  const [midiOpen, setMidiOpen] = useState(false);
  const [libOpen, setLibOpen] = useState(false);
  const [midiSupported, setMidiSupported] = useState<boolean | null>(null);
  const [midi, setMidi] = useState<Status>(() => M.status());
  const [inputs, setInputs] = useState<PortInfo[]>([]);
  const [outputs, setOutputs] = useState<PortInfo[]>([]);
  const [channel, setChannel] = useState(1);
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
  const restored = useRef(false);

  // ---- persistence: read after mount so the server render matches ----
  useEffect(() => {
    setMidiSupported(M.supported());
    setChannel(store.get("channel", 1));
    M.setWanted("in", store.get("midiIn", ""));
    M.setWanted("out", store.get("midiOut", ""));
    setKeysOpen(store.get("keys.open", false));
    // until the voice editor exists the emulator gets a blank voice, so it has one to play
    A.setVoice(new Uint8Array(VOICE_BYTES));
    restored.current = true;
  }, []);
  useEffect(() => { if (restored.current) store.set("channel", channel); }, [channel]);
  useEffect(() => { router.setChannel(channel); }, [channel]);
  useEffect(() => { if (restored.current) store.set("keys.open", keysOpen); }, [keysOpen]);
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

  // ---- MIDI ----
  useEffect(() => M.onChange(() => {
    const s = M.status();
    setMidi(s);
    setInputs(M.listInputs());
    setOutputs(M.listOutputs());
    if (s.wanted.in) store.set("midiIn", s.wanted.in);
    if (s.wanted.out) store.set("midiOut", s.wanted.out);
  }), []);

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

  const midiReady = midi.connected;
  const midiLive = !!midi.output;

  return (
    <main className="mx-auto grid max-w-[1180px] gap-5">
      <header className="flex flex-wrap items-center gap-2.5">
        <h1 className="m-0 text-[11px] font-normal tracking-[.08em]">DX7</h1>
        <span className="lead min-w-6" />
        <span className="flex items-center gap-1.5"><Button aria-pressed={sound} onClick={onSound}>SOUND</Button><Info k="sound" /></span>
        <span className="flex items-center gap-1.5"><Button aria-pressed={keysOpen} onClick={() => setKeysOpen(o => !o)}>KEYS</Button><Info k="keys" /></span>
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
                  <div className={ROW}>
                    <Button disabled={!midiLive} onClick={() => { M.noteOn(channel, 60); setTimeout(() => M.noteOff(channel, 60), 500); }}>TEST NOTE</Button>
                    <Button disabled={!midiLive} onClick={() => { router.allOff(); M.allNotesOff(channel); A.allOff(); }}>PANIC</Button>
                  </div>
                  <p className={NOTE}>Play notes with KEYS or the Z–M keys; PLAY TO on the keyboard sends them to the DX7, the emulator, or both. Receiving and sending voices arrive with the voice editor.</p>
                  {!inputs.length && !outputs.length && <p className={NOTE}>No MIDI ports found. Plug in an interface.</p>}
                </>
              )}
              {midi.error && <p className={NOTE}>{midi.error}</p>}
            </div>
          </DialogContent>
        </Dialog>
      </header>

      {msg && <p role="status" className={`${NOTE} max-w-none`}>{msg}</p>}

      <section aria-label="VOICE" className="grid content-start gap-3.5">
        <div className="flex items-baseline gap-2">
          <h2 className="m-0 text-[11px] font-normal tracking-[.08em]">VOICE</h2>
          <span className="lead" />
        </div>
        <p className={NOTE}>The voice editor comes next: the algorithm, six operators with their envelopes and keyboard scaling, the pitch envelope and the LFO, with voices and banks to and from the DX7 over SysEx.</p>
      </section>

      <footer className={`flex flex-wrap items-center gap-3 ${SMALL}`}>
        <span>YAMAHA DX7 EDITOR AND EMULATOR</span>
        <span className="lead min-w-6" />
        <Link href="/changelog" className="text-foreground">CHANGELOG</Link>
      </footer>

      {keysOpen && <KeyboardFloater onClose={() => setKeysOpen(false)} ensureSound={startSound} />}

      {libOpen && <Library open={libOpen} onOpenChange={setLibOpen} />}
    </main>
  );
}
