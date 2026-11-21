"use client";

import { useEffect, useState } from "react";
import { RESOURCES } from "../lib/resources";
import { store } from "../lib/store";
import { NOTE } from "./params";
import Info from "./Info";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

// The LIBRARY sheet, copied from vz10m's. Two tabs for now: LOCAL (voices kept in this browser; empty until the
// voice editor can save and import them) and RESOURCES (outside links, lib/resources.ts). SHARED and BANKS come
// with sharing. Loaded with next/dynamic the first time LIBRARY is pressed.

const TABS = [{ value: "local", label: "LOCAL" }, { value: "resources", label: "RESOURCES" }] as const;
type Tab = (typeof TABS)[number]["value"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function Library({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<Tab>("local");

  useEffect(() => {
    const t = store.get<string>("library.tab", "local");
    setTab(TABS.some(x => x.value === t) ? (t as Tab) : "local");
  }, []);
  const chooseTab = (t: Tab) => { setTab(t); store.set("library.tab", t); };

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
            : "Manuals, the SysEx format, articles and tools elsewhere on the web. They open in a new tab."}
        </SheetDescription>
        {tab === "resources" && (
          <ul role="tabpanel" id="lib-panel-resources" aria-labelledby="lib-tab-resources" className="m-0 grid list-none p-0">
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
        {tab === "local" && (
          <div role="tabpanel" id="lib-panel-local" aria-labelledby="lib-tab-local" className="grid gap-3.5">
            <p className={NOTE}>Nothing saved yet. SAVE CURRENT and IMPORT .SYX arrive with the voice editor.</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
