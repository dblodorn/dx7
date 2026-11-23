"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as V from "../lib/dx7/codec";
import { fromSyx, toBankSysex, toSysex, type SyxItem } from "../lib/dx7/sysex";
import { download, fileName } from "../lib/files";
import { RESOURCES } from "../lib/resources";
import { entry, fromB64, store, type Entry } from "../lib/store";
import type { Pending } from "./ImportDialog";
import { NOTE, ROW, SMALL } from "./params";
import Info from "./Info";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

// The LIBRARY sheet, from vz10m's. LOCAL: voices kept in this browser; IMPORT .SYX reads single voices and 32-voice
// banks and hands them to the import dialog (components/ImportDialog.tsx, owned by the editor so a bank from MIDI
// uses it too); checked voices (up to 32) make a bank to export or send, or to share from BANKS. SHARED: the public
// list (components/Shared.tsx, its own chunk with Relay). BANKS: public 32-voice banks (components/Banks.tsx). COLOPHON: the typeface's credit, then outside links (lib/resources.ts). Loaded with
// next/dynamic the first time LIBRARY is pressed.

const Shared = dynamic(() => import("./Shared"), { ssr: false, loading: () => <p className={NOTE}>LOADING…</p> });
const Banks = dynamic(() => import("./Banks"), { ssr: false, loading: () => <p className={NOTE}>LOADING…</p> });

const TABS = [{ value: "local", label: "LOCAL" }, { value: "shared", label: "SHARED" }, { value: "banks", label: "BANKS" }, { value: "colophon", label: "COLOPHON" }] as const;
type Tab = (typeof TABS)[number]["value"];
const BANK = 32;

const date = (iso: string): string => iso.slice(0, 10);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  library: Entry[];
  updateLibrary: (fn: (list: Entry[]) => Entry[]) => void;
  voice: Uint8Array;
  onOpen: (bytes: Uint8Array) => void;
  onImport: (p: Pending) => void;
  canSend: boolean;
  onSend: (message: Uint8Array, what: string) => void;
}

export default function Library({ open, onOpenChange, library, updateLibrary, voice, onOpen, onImport, canSend, onSend }: Props) {
  const [tab, setTab] = useState<Tab>("local");
  const [msg, setMsg] = useState("");
  const [query, setQuery] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null); // id awaiting a second press of DELETE
  const [checked, setChecked] = useState<string[]>([]); // ids in the bank, in list order
  const [bankSendOpen, setBankSendOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = store.get<string>("library.tab", "local");
    const t = saved === "resources" ? "colophon" : saved; // the tab's old name
    setTab(TABS.some(x => x.value === t) ? (t as Tab) : "local");
  }, []);
  const chooseTab = (t: Tab) => { setTab(t); setMsg(""); store.set("library.tab", t); };

  function saveCurrent() {
    const name = V.getName(voice) || "UNTITLED";
    updateLibrary(list => [entry(name, voice), ...list]);
    setMsg(`SAVED ${name}.`);
  }

  async function onFiles(files: File[]) {
    const items: SyxItem[] = [];
    let damaged = 0, unsupported = 0, unused = 0;
    for (const f of files) {
      const r = fromSyx(new Uint8Array(await f.arrayBuffer()));
      items.push(...r.items);
      damaged += r.errors.filter(e => !e.unsupported).length;
      unsupported += r.errors.filter(e => e.unsupported).length;
      unused += r.unusedBits;
    }
    const notes = [
      damaged && `${damaged} DAMAGED OR NOT DX7 MESSAGE${damaged === 1 ? "" : "S"} SKIPPED`,
      unsupported && `${unsupported} OTHER YAMAHA FORMAT${unsupported === 1 ? "" : "S"} (DX7II, PERFORMANCE…) NOT SUPPORTED`,
      unused && `${unused} BANK VOICE${unused === 1 ? "" : "S"} HAD UNUSED BITS SET, DROPPED`,
    ].filter(Boolean);
    if (!items.length) { setMsg(`NO DX7 VOICES FOUND${notes.length ? `: ${notes.join("; ")}` : ""}.`); return; }
    setMsg("");
    onImport({ title: `IMPORT ${items.length} VOICE${items.length === 1 ? "" : "S"}`, items, ...(notes.length ? { note: `${notes.join("; ")}.` } : {}) });
  }

  const inBank = library.filter(e => checked.includes(e.id)).slice(0, BANK);
  const bankBytes = () => inBank.map(e => fromB64(e.data));
  const toggle = (id: string, on: boolean) => setChecked(c => (on ? (c.length < BANK ? [...c, id] : c) : c.filter(x => x !== id)));
  const q = query.trim().toUpperCase();
  const shown = q ? library.filter(e => e.name.toUpperCase().includes(q)) : library;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-describedby="lib-desc" className="w-[min(480px,100vw)]">
        <SheetHeader>
          <SheetTitle>LIBRARY</SheetTitle>
          <Info k="library" />
          <span className="lead" />
          <SheetClose asChild><Button>CLOSE</Button></SheetClose>
        </SheetHeader>
        <div role="tablist" aria-label="LIBRARY" className="flex flex-wrap gap-1.5">
          {TABS.map(t => (
            <Button key={t.value} role="tab" id={`lib-tab-${t.value}`} aria-controls={`lib-panel-${t.value}`} aria-selected={tab === t.value}
              className="aria-selected:bg-foreground aria-selected:text-background" onClick={() => chooseTab(t.value)}>{t.label}</Button>
          ))}
        </div>
        <SheetDescription id="lib-desc" className={NOTE}>
          {tab === "local" ? "Kept in this browser. Import and export .syx files to move voices and banks between machines."
            : tab === "shared" ? "DX7 voices anyone can open. What you share here is public, and names are checked before they're listed."
            : tab === "banks" ? "Banks of 32 voices, like cartridges, that anyone can open: Yamaha's factory ROM cards and banks people share. Open one to play, send or download it."
            : "The typeface and the design system, then manuals, the SysEx format, articles and tools elsewhere on the web. They open in a new tab."}
        </SheetDescription>
        {tab === "colophon" && (
          <ul role="tabpanel" id="lib-panel-colophon" aria-labelledby="lib-tab-colophon" className="m-0 grid list-none p-0">
            <li className="grid gap-1 border-t border-dashed border-foreground py-2">
              <a href="https://aisforfonts.com/knif/" target="_blank" rel="noopener noreferrer"
                className="w-fit tracking-[.06em] text-foreground underline underline-offset-3 outline-none focus-visible:outline-1 focus-visible:outline-offset-3 focus-visible:outline-dashed">
                TYPE: KNIF MONO BY A IS FOR FONTS
              </a>
              <p className={NOTE}>The editor is set in Knif Mono, licensed from the foundry A is for fonts.</p>
            </li>
            <li className="grid gap-1 border-t border-dashed border-foreground py-2">
              <a href="https://soundsystem.dmbk.io/" target="_blank" rel="noopener noreferrer"
                className="w-fit tracking-[.06em] text-foreground underline underline-offset-3 outline-none focus-visible:outline-1 focus-visible:outline-offset-3 focus-visible:outline-dashed">
                SOUND DESIGN SYSTEM
              </a>
              <p className={NOTE}>The controls, type and colors this editor shares with Chime and the VZ-10M editor.</p>
            </li>
            {RESOURCES.map(r => (
              <li key={r.url} className="grid gap-1 border-t border-dashed border-foreground py-2">
                <a href={r.url} target="_blank" rel="noopener noreferrer"
                  className="w-fit tracking-[.06em] text-foreground underline underline-offset-3 outline-none focus-visible:outline-1 focus-visible:outline-offset-3 focus-visible:outline-dashed">
                  {r.name}
                </a>
                <p className={NOTE}>{r.text}</p>
              </li>
            ))}
          </ul>
        )}
        {tab === "shared" && (
          <div role="tabpanel" id="lib-panel-shared" aria-labelledby="lib-tab-shared" className="grid gap-3">
            <Shared voice={voice} onOpen={onOpen} onSaveLocal={bytes => {
              const name = V.getName(bytes) || "UNTITLED";
              updateLibrary(list => [entry(name, bytes), ...list]);
              setMsg(`SAVED ${name} TO LOCAL.`);
            }} />
            {msg && <p role="status" className={NOTE}>{msg}</p>}
          </div>
        )}
        {tab === "banks" && (
          <div role="tabpanel" id="lib-panel-banks" aria-labelledby="lib-tab-banks" className="grid gap-3">
            <Banks checked={bankBytes()} canSend={canSend} onOpen={onOpen} onSend={onSend} onCopyLocal={(voices, bank) => {
              updateLibrary(list => [...voices.map(v => entry(V.getName(v) || "UNTITLED", v)), ...list]);
              setMsg(`COPIED ${voices.length} VOICES FROM ${bank} TO LOCAL.`);
            }} />
            {msg && <p role="status" className={NOTE}>{msg}</p>}
          </div>
        )}
        {tab === "local" && (
          <div role="tabpanel" id="lib-panel-local" aria-labelledby="lib-tab-local" className="grid gap-3.5">
            <div className={ROW + " mt-0"}>
              <Button onClick={saveCurrent}>SAVE CURRENT</Button>
              <Button onClick={() => fileRef.current?.click()}>IMPORT .SYX</Button>
              <input ref={fileRef} type="file" accept=".syx,application/octet-stream" multiple hidden onChange={e => { onFiles([...(e.target.files ?? [])]); e.target.value = ""; }} />
            </div>
            <div role="group" aria-label="BANK" className="grid gap-2 border border-foreground p-2.5">
              <div className="flex items-baseline gap-2">
                <span className="tracking-[.08em]">BANK</span>
                <span className="lead" />
                <span className={SMALL}>{inBank.length} OF {BANK} CHECKED</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button disabled={!inBank.length} onClick={() => download(toBankSysex(bankBytes()), "dx7-bank.syx")}>EXPORT BANK</Button>
                <Button disabled={!inBank.length || !canSend} onClick={() => setBankSendOpen(true)}>BANK SEND</Button>
                <Button disabled={!checked.length} onClick={() => setChecked([])}>CLEAR</Button>
              </div>
              <p className={NOTE}>Check up to 32 voices below. The bank keeps them in list order and fills the rest with INIT VOICE.</p>
            </div>
            {msg && <p role="status" className={NOTE}>{msg}</p>}
            <label className="flex items-center gap-2">
              <span id="lib-search-label" className={SMALL}>SEARCH</span>
              <input type="search" aria-labelledby="lib-search-label" value={query} onChange={e => setQuery(e.target.value)}
                className="h-8 min-w-0 flex-1 border border-foreground bg-background px-2 uppercase outline-none focus-visible:outline-1 focus-visible:outline-offset-3 focus-visible:outline-dashed touch:text-[16px]" />
            </label>
            <ul aria-label="LOCAL VOICES" className="m-0 grid list-none p-0">
              {shown.map(e => (
                <li key={e.id} className="grid gap-1 border-t border-dashed border-foreground py-2">
                  <div className="flex items-center gap-2">
                    <Checkbox aria-label={`BANK ${e.name}`} checked={checked.includes(e.id)} onCheckedChange={v => toggle(e.id, v === true)}
                      disabled={!checked.includes(e.id) && checked.length >= BANK} />
                    <span className="tracking-[.06em]">{e.name}</span>
                    <span className="lead" />
                    <span className={SMALL}>{date(e.savedAt)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button onClick={() => onOpen(fromB64(e.data))}>OPEN</Button>
                    <Button disabled={!canSend} onClick={() => onSend(toSysex(fromB64(e.data)), e.name)}>SEND</Button>
                    <Button onClick={() => download(toSysex(fromB64(e.data)), fileName(e.name))}>.SYX</Button>
                    <Button
                      aria-pressed={confirming === e.id}
                      onClick={() => {
                        if (confirming !== e.id) { setConfirming(e.id); return; }
                        updateLibrary(list => list.filter(x => x.id !== e.id));
                        setChecked(c => c.filter(x => x !== e.id));
                        setConfirming(null);
                        setMsg(`DELETED ${e.name}.`);
                      }}
                      onBlur={() => setConfirming(c => (c === e.id ? null : c))}
                    >{confirming === e.id ? "CONFIRM DELETE" : "DELETE"}</Button>
                  </div>
                </li>
              ))}
            </ul>
            {!library.length && <p className={NOTE}>Nothing saved yet. SAVE CURRENT keeps the voice you&apos;re editing; IMPORT .SYX reads DX7 voice and bank files.</p>}
            {library.length > 0 && !shown.length && <p className={NOTE}>NO MATCH FOR {q}</p>}
          </div>
        )}
        <Dialog open={bankSendOpen} onOpenChange={setBankSendOpen}>
          <DialogContent>
            <DialogHeader>
              <div className="flex items-baseline gap-2">
                <DialogTitle>BANK SEND</DialogTitle>
                <span className="lead" />
                <DialogClose asChild><Button>CANCEL</Button></DialogClose>
              </div>
              <DialogDescription className={NOTE}>
                This replaces all 32 voices in the DX7&apos;s internal memory with the {inBank.length} checked here (and INIT VOICE in the rest). The DX7 takes it only with SYS INFO AVAIL and MEMORY PROTECT INTERNAL set to OFF. Save its current voices first if you want them.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-1.5">
              <Button onClick={() => { onSend(toBankSysex(bankBytes()), `A BANK OF ${inBank.length}`); setBankSendOpen(false); }}>SEND THE BANK</Button>
            </div>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
