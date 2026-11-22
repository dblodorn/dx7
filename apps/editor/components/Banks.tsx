"use client";

// The BANKS tab: public DX7 banks from the dmbk GraphQL API (dmbk-graphql-api's dx7-voices, "Banks"), 32 slots each
// like a cartridge. Yamaha's factory ROM1A–ROM4B cards are among them. Opening a bank shows its slots: OPEN puts a
// voice in the editor, SEND BANK puts the whole bank into the DX7 (one VMEM, empty slots as INIT VOICE), .SYX
// downloads it, COPY TO LOCAL adds its voices to LOCAL. SHARE CHECKED AS BANK shares LOCAL's checked voices and
// saves them as a new bank, owned by this browser's device key like shared voices. Loaded with next/dynamic when
// the tab is first opened.

import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { ConnectionHandler, RelayEnvironmentProvider, graphql, useFragment, useLazyLoadQuery, useMutation, usePaginationFragment } from "react-relay";
import type { RecordSourceSelectorProxy } from "relay-runtime";
import { relayEnvironment } from "../lib/relay/environment";
import { problem, refusedName } from "../lib/relay/problem";
import * as D from "../lib/device";
import * as V from "../lib/dx7/codec";
import { toBankSysex } from "../lib/dx7/sysex";
import { isNameAllowed } from "../lib/dx7/names";
import { download, fileName } from "../lib/files";
import { fromB64, toB64 } from "../lib/store";
import { NOTE, ROW, SMALL } from "./params";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BanksQuery } from "./__generated__/BanksQuery.graphql";
import type { BanksPaginationQuery } from "./__generated__/BanksPaginationQuery.graphql";
import type { Banks_list$key } from "./__generated__/Banks_list.graphql";
import type { Banks_row$data, Banks_row$key } from "./__generated__/Banks_row.graphql";
import type { BanksSaveVoiceMutation } from "./__generated__/BanksSaveVoiceMutation.graphql";
import type { BanksSaveMutation, BanksSaveMutation$data } from "./__generated__/BanksSaveMutation.graphql";
import type { BanksRenameMutation } from "./__generated__/BanksRenameMutation.graphql";
import type { BanksDeleteMutation } from "./__generated__/BanksDeleteMutation.graphql";

const PAGE = 20;
const SLOTS = 32;
const BANK_NAME_MAX = 20;

const ListQuery = graphql`
  query BanksQuery($count: Int, $cursor: String, $creatorKey: String, $search: String, $yoursKey: String!) {
    ...Banks_list @arguments(count: $count, cursor: $cursor, creatorKey: $creatorKey, search: $search, yoursKey: $yoursKey)
  }
`;

const ListFragment = graphql`
  fragment Banks_list on Query
  @refetchable(queryName: "BanksPaginationQuery")
  @argumentDefinitions(
    count: { type: "Int", defaultValue: 20 }
    cursor: { type: "String" }
    creatorKey: { type: "String" }
    search: { type: "String" }
    yoursKey: { type: "String!" }
  ) {
    dmbkSoundDx7Banks(first: $count, after: $cursor, creatorKey: $creatorKey, search: $search)
    @connection(key: "Banks_dmbkSoundDx7Banks", filters: ["creatorKey", "search"]) {
      __id
      edges {
        node {
          id
          ...Banks_row @arguments(yoursKey: $yoursKey)
        }
      }
    }
  }
`;

const RowFragment = graphql`
  fragment Banks_row on Dx7Bank @argumentDefinitions(yoursKey: { type: "String!" }) {
    id
    name
    updatedAt
    yours(creatorKey: $yoursKey)
    slots { id name data }
  }
`;

const SaveVoiceMutation = graphql`
  mutation BanksSaveVoiceMutation($input: DmbkSoundSaveDx7VoiceInput!) {
    dmbkSoundSaveDx7Voice(input: $input) { dx7Voice { id } }
  }
`;

const SaveMutation = graphql`
  mutation BanksSaveMutation($input: DmbkSoundSaveDx7BankInput!, $yoursKey: String!) {
    dmbkSoundSaveDx7Bank(input: $input) {
      created
      dx7BankEdge {
        cursor
        node { id ...Banks_row @arguments(yoursKey: $yoursKey) }
      }
    }
  }
`;

const RenameMutation = graphql`
  mutation BanksRenameMutation($input: DmbkSoundUpdateDx7BankInput!, $yoursKey: String!) {
    dmbkSoundUpdateDx7Bank(input: $input) { dx7Bank { id ...Banks_row @arguments(yoursKey: $yoursKey) } }
  }
`;

const DeleteMutation = graphql`
  mutation BanksDeleteMutation($input: DmbkSoundDeleteDx7BankInput!, $connections: [ID!]!) {
    dmbkSoundDeleteDx7Bank(input: $input) { deletedDx7BankId @deleteEdge(connections: $connections) }
  }
`;

const date = (iso: string): string => iso.slice(0, 10);
const voiceOf = (data: string | undefined): Uint8Array | null => {
  if (!data) return null;
  try { const b = fromB64(data); return b.length === V.VOICE_BYTES ? b : null; } catch { return null; }
};

interface Actions {
  yoursKey: string;
  connectionId: string;
  canSend: boolean;
  onOpen: (bytes: Uint8Array) => void;
  onSend: (message: Uint8Array, what: string) => void;
  onCopyLocal: (voices: Uint8Array[], bank: string) => void;
  say: (msg: string) => void;
}

function Row({ row, yoursKey, connectionId, canSend, onOpen, onSend, onCopyLocal, say }: Actions & { row: Banks_row$data }) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [commitRename, renamingBusy] = useMutation<BanksRenameMutation>(RenameMutation);
  const [commitDelete, deleting] = useMutation<BanksDeleteMutation>(DeleteMutation);
  const voices = row.slots.map(s => voiceOf(s?.data));
  const filled = voices.filter((v): v is Uint8Array => v !== null);
  const bank = () => toBankSysex(voices.map(v => v ?? V.initVoice()));

  return (
    <li className="grid gap-1.5 border-t border-dashed border-foreground py-2">
      <div className="flex items-baseline gap-2">
        <button aria-expanded={open} onClick={() => setOpen(o => !o)}
          className="cursor-pointer border-0 bg-transparent p-0 text-left tracking-[.06em] text-foreground underline underline-offset-3 outline-none focus-visible:outline-1 focus-visible:outline-offset-3 focus-visible:outline-dashed">
          {row.name}
        </button>
        {row.yours && <Badge title="SAVED FROM THIS DEVICE">YOURS</Badge>}
        <span className="lead" />
        <span className={SMALL}>{filled.length}/{SLOTS} · {date(row.updatedAt)}</span>
      </div>
      {open && (
        <>
          <ol aria-label={`${row.name} SLOTS`} className="m-0 grid list-none grid-cols-2 gap-x-3 p-0 sm:grid-cols-4">
            {row.slots.map((s, i) => {
              const v = voices[i];
              return (
                <li key={i} className="flex items-baseline gap-1.5">
                  <span className={`${SMALL} w-5 tabular-nums`}>{String(i + 1).padStart(2, "0")}</span>
                  {v ? (
                    <button onClick={() => onOpen(v)} title={`OPEN ${s?.name}`}
                      className="min-w-0 cursor-pointer truncate border-0 bg-transparent p-0 text-left text-[11px] tracking-[.04em] text-foreground hover:underline focus-visible:outline-1 focus-visible:outline-dashed">
                      {s?.name || "UNTITLED"}
                    </button>
                  ) : <span className={SMALL}>—</span>}
                </li>
              );
            })}
          </ol>
          {renaming !== null ? (
            <form className="flex flex-wrap gap-1.5" onSubmit={e => {
              e.preventDefault();
              const name = renaming.trim();
              if (!name) return;
              if (!isNameAllowed(name)) { say(refusedName(name)); return; }
              commitRename({
                variables: { input: { id: row.id, name, slots: row.slots.map(s => s?.id ?? null), creatorKey: yoursKey }, yoursKey },
                onCompleted: () => { say(`RENAMED TO ${name}.`); setRenaming(null); },
                onError: err => say(problem(err, "RENAME", "BANK")),
              });
            }}>
              <input aria-label={`NEW NAME FOR ${row.name}`} autoFocus maxLength={BANK_NAME_MAX} value={renaming} onChange={e => setRenaming(e.target.value)}
                onKeyDown={e => { if (e.key === "Escape") { e.stopPropagation(); setRenaming(null); } }}
                className="h-8 w-[22ch] border border-foreground bg-background px-2 outline-none focus-visible:outline-1 focus-visible:outline-offset-3 focus-visible:outline-dashed touch:text-[16px]" />
              <Button type="submit" disabled={renamingBusy}>{renamingBusy ? "SAVING…" : "SAVE NAME"}</Button>
              <Button type="button" onClick={() => setRenaming(null)}>CANCEL</Button>
            </form>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              <Button disabled={!canSend} onClick={() => onSend(bank(), `BANK ${row.name}`)}>SEND BANK</Button>
              <Button onClick={() => download(bank(), fileName(row.name))}>.SYX</Button>
              <Button disabled={!filled.length} onClick={() => onCopyLocal(filled, row.name)}>COPY TO LOCAL</Button>
              {row.yours && (
                <>
                  <Button onClick={() => setRenaming(row.name)}>RENAME</Button>
                  <Button aria-pressed={confirm} disabled={deleting} onBlur={() => setConfirm(false)}
                    onClick={() => {
                      if (!confirm) { setConfirm(true); return; }
                      setConfirm(false);
                      commitDelete({
                        variables: { input: { id: row.id, creatorKey: yoursKey }, connections: [connectionId] },
                        onCompleted: () => say(`DELETED THE BANK ${row.name}. ITS VOICES STAY IN SHARED.`),
                        onError: err => say(problem(err, "DELETE", "BANK")),
                      });
                    }}>{confirm ? "CONFIRM DELETE" : deleting ? "DELETING…" : "DELETE"}</Button>
                </>
              )}
            </div>
          )}
          {!canSend && <p className={NOTE}>SEND BANK needs a MIDI OUT port, and replaces the DX7&apos;s 32 internal voices (MEMORY PROTECT INTERNAL OFF).</p>}
        </>
      )}
    </li>
  );
}

function RowItem({ node, ...actions }: Actions & { node: Banks_row$key }) {
  return <Row row={useFragment<Banks_row$key>(RowFragment, node)} {...actions} />;
}

interface Filters { creatorKey: string | null; search: string | null; yoursKey: string }

function List({ filters, fetchKey, onConnection, ...actions }: Omit<Actions, "connectionId" | "yoursKey"> & { filters: Filters; fetchKey: string; onConnection: (id: string) => void }) {
  const query = useLazyLoadQuery<BanksQuery>(ListQuery, { count: PAGE, ...filters }, { fetchKey, fetchPolicy: "store-and-network" });
  const { data, loadNext, hasNext, isLoadingNext } = usePaginationFragment<BanksPaginationQuery, Banks_list$key>(ListFragment, query);
  const connectionId = data.dmbkSoundDx7Banks.__id;
  useEffect(() => { onConnection(connectionId); }, [connectionId, onConnection]);
  const edges = data.dmbkSoundDx7Banks.edges;
  return (
    <>
      {edges.length === 0
        ? <p className={NOTE}>{filters.search ? `NO BANK NAMED ${filters.search}.` : filters.creatorKey ? "YOU HAVEN'T SHARED A BANK FROM THIS DEVICE YET." : "NO BANKS YET."}</p>
        : <ul aria-label="BANKS" className="m-0 grid list-none p-0">{edges.map(e => <RowItem key={e.node.id} node={e.node} connectionId={connectionId} yoursKey={filters.yoursKey} {...actions} />)}</ul>}
      {hasNext && <Button className="w-full" onClick={() => loadNext(PAGE)} disabled={isLoadingNext}>{isLoadingNext ? "LOADING…" : "MORE"}</Button>}
    </>
  );
}

class LoadFailed extends Component<{ children: ReactNode; onRetry: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="grid gap-2"><p className={NOTE}>COULD NOT LOAD THE BANKS.</p><Button onClick={this.props.onRetry}>RETRY</Button></div>;
  }
}

// Shares each checked LOCAL voice (an identical one already shared from this key is reused), then saves the bank.
function ShareChecked({ checked, yoursKey, onKey, connection, say }: {
  checked: Uint8Array[]; yoursKey: string; onKey: (k: string) => void; connection: () => { id: string | null; search: boolean }; say: (m: string) => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [commitVoice] = useMutation<BanksSaveVoiceMutation>(SaveVoiceMutation);
  const [commitBank] = useMutation<BanksSaveMutation>(SaveMutation);
  const saveVoice = (data: Uint8Array, key: string) => new Promise<string>((resolve, reject) =>
    commitVoice({ variables: { input: { data: toB64(data), creatorKey: key } }, onCompleted: r => resolve(r.dmbkSoundSaveDx7Voice.dx7Voice.id), onError: reject }));

  async function share() {
    const bankName = name.trim();
    if (!bankName) { say("NAME THE BANK FIRST."); return; }
    if (!isNameAllowed(bankName)) { say(refusedName(bankName)); return; }
    const bad = checked.map(v => V.getName(v)).find(n => !isNameAllowed(n));
    if (bad !== undefined) { say(refusedName(bad)); return; }
    const key = yoursKey || D.ensureKey();
    if (key !== yoursKey) onKey(key);
    setBusy(true);
    try {
      const ids: (string | null)[] = [];
      for (const v of checked) ids.push(await saveVoice(v, key));
      while (ids.length < SLOTS) ids.push(null);
      await new Promise<void>((resolve, reject) => commitBank({
        variables: { input: { name: bankName, slots: ids, creatorKey: key }, yoursKey: key },
        updater: (store: RecordSourceSelectorProxy<BanksSaveMutation$data>) => {
          const c = connection();
          if (c.search || !c.id) return;
          const edge = store.getRootField("dmbkSoundSaveDx7Bank")?.getLinkedRecord("dx7BankEdge");
          const conn = store.get(c.id);
          const node = edge?.getLinkedRecord("node");
          if (!edge || !conn || !node) return;
          if ((conn.getLinkedRecords("edges") || []).some(e => e?.getLinkedRecord("node")?.getDataID() === node.getDataID())) return;
          const built = ConnectionHandler.buildConnectionEdge(store, conn, edge);
          if (built) ConnectionHandler.insertEdgeBefore(conn, built);
        },
        onCompleted: r => { say(r.dmbkSoundSaveDx7Bank.created ? `SHARED THE BANK ${bankName} (${checked.length} VOICES).` : `${bankName} IS ALREADY SHARED.`); setName(""); resolve(); },
        onError: reject,
      }));
    } catch (err) {
      say(problem(err instanceof Error ? err : new Error(String(err)), "SHARE THE BANK", "BANK"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="group" aria-label="NEW BANK" className="grid gap-2 border border-foreground p-2.5">
      <div className="flex items-baseline gap-2">
        <span className="tracking-[.08em]">NEW BANK</span>
        <span className="lead" />
        <span className={SMALL}>{checked.length} OF {SLOTS} CHECKED IN LOCAL</span>
      </div>
      <form className={ROW + " mt-0"} onSubmit={e => { e.preventDefault(); share(); }}>
        <input aria-label="BANK NAME" placeholder="BANK NAME" maxLength={BANK_NAME_MAX} value={name} onChange={e => setName(e.target.value)}
          className="h-8 w-[22ch] border border-foreground bg-background px-2 outline-none focus-visible:outline-1 focus-visible:outline-offset-3 focus-visible:outline-dashed touch:text-[16px]" />
        <Button type="submit" disabled={busy || !checked.length}>{busy ? "SHARING…" : "SHARE CHECKED AS BANK"}</Button>
      </form>
      <p className={NOTE}>Check up to 32 voices in LOCAL, in the order you want them. Sharing the bank shares those voices too (each once).</p>
    </div>
  );
}

interface Props {
  checked: Uint8Array[]; // LOCAL's checked voices, in list order
  canSend: boolean;
  onOpen: (bytes: Uint8Array) => void;
  onSend: (message: Uint8Array, what: string) => void;
  onCopyLocal: (voices: Uint8Array[], bank: string) => void;
}

export default function Banks({ checked, canSend, onOpen, onSend, onCopyLocal }: Props) {
  const [yoursKey, setYoursKey] = useState("");
  const [mine, setMine] = useState(false);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [retries, setRetries] = useState(0);
  const [msg, setMsg] = useState("");
  const connectionId = useRef<string | null>(null);

  useEffect(() => { setYoursKey(D.readKey() ?? ""); }, []);
  useEffect(() => { const t = setTimeout(() => setSearch(text.trim()), 300); return () => clearTimeout(t); }, [text]);

  const filters: Filters = { creatorKey: mine && yoursKey ? yoursKey : null, search: search || null, yoursKey };
  const fetchKey = String(retries);

  return (
    <RelayEnvironmentProvider environment={relayEnvironment()}>
      <ShareChecked checked={checked} yoursKey={yoursKey} onKey={setYoursKey} connection={() => ({ id: connectionId.current, search: !!search })} say={setMsg} />
      {msg && <p role="status" className={NOTE}>{msg}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="SHOW" className="flex gap-1.5">
          <Button aria-pressed={!mine} onClick={() => setMine(false)}>ALL</Button>
          <Button aria-pressed={mine} disabled={!yoursKey} onClick={() => setMine(true)}>YOURS</Button>
        </div>
        <label className="flex min-w-[12rem] flex-1 items-center gap-2">
          <span id="banks-search-label" className={SMALL}>SEARCH</span>
          <input type="search" aria-labelledby="banks-search-label" maxLength={BANK_NAME_MAX} value={text} onChange={e => setText(e.target.value)}
            className="h-8 min-w-0 flex-1 border border-foreground bg-background px-2 outline-none focus-visible:outline-1 focus-visible:outline-offset-3 focus-visible:outline-dashed touch:text-[16px]" />
        </label>
      </div>
      <LoadFailed key={fetchKey} onRetry={() => setRetries(n => n + 1)}>
        <Suspense fallback={<p className={NOTE}>LOADING…</p>}>
          <List filters={filters} fetchKey={fetchKey} onConnection={id => { connectionId.current = id; }} canSend={canSend} onOpen={onOpen} onSend={onSend} onCopyLocal={onCopyLocal} say={setMsg} />
        </Suspense>
      </LoadFailed>
    </RelayEnvironmentProvider>
  );
}
