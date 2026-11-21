"use client";

// Choosing which voices to add to LOCAL, for a bank arriving from the DX7 or a .syx file opened with IMPORT .SYX.
// Every voice starts checked; ADD SELECTED adds the checked ones in order.

import { useEffect, useState } from "react";
import type { SyxItem } from "@dblodorn/yamaha-dx7-engine";
import { NOTE, SMALL } from "./params";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface Pending { title: string; items: SyxItem[]; note?: string }

export default function ImportDialog({ pending, onClose, onAdd }: { pending: Pending | null; onClose: () => void; onAdd: (items: SyxItem[]) => void }) {
  const [checked, setChecked] = useState<boolean[]>([]);
  useEffect(() => { setChecked(pending ? pending.items.map(() => true) : []); }, [pending]);
  const count = checked.filter(Boolean).length;
  return (
    <Dialog open={!!pending} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-baseline gap-2">
            <DialogTitle>{pending?.title ?? "IMPORT"}</DialogTitle>
            <span className="lead" />
            <DialogClose asChild><Button>CANCEL</Button></DialogClose>
          </div>
          <DialogDescription className={NOTE}>{pending?.note ?? "Choose the voices to add to LOCAL."}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-1.5">
          <Button onClick={() => setChecked(c => c.map(() => true))}>ALL</Button>
          <Button onClick={() => setChecked(c => c.map(() => false))}>NONE</Button>
          <span className="lead min-w-4" />
          <Button disabled={!count} onClick={() => { onAdd(pending!.items.filter((_, i) => checked[i])); onClose(); }}>ADD SELECTED ({count})</Button>
        </div>
        <ul aria-label="VOICES" className="m-0 grid max-h-[50vh] list-none grid-cols-1 overflow-y-auto p-0 sm:grid-cols-2">
          {pending?.items.map((it, i) => (
            <li key={i} className="border-t border-dashed border-foreground py-1.5">
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox checked={checked[i] ?? false} onCheckedChange={v => setChecked(c => c.map((x, j) => (j === i ? v === true : x)))} />
                <span className={`${SMALL} w-6 tabular-nums`}>{String(i + 1).padStart(2, "0")}</span>
                <span className="tracking-[.06em]">{it.name || "UNTITLED"}</span>
              </label>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
