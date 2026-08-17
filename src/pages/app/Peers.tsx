import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Search, Send, UserCheck, UserPlus, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listMessages, listPeers, markMessagesRead, myConnections, requestConnection, respondConnection, sendMessage, useDb, type ChatMessage, type Peer, type PeerConnection } from "@/lib/db";
import { CATEGORIES, COUNTRIES, GRADE_LABEL, GRADES } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";


export default function Peers() {
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState<string | undefined>(undefined);
  const [interest, setInterest] = useState<string | undefined>(undefined);
  const [country, setCountry] = useState<string | undefined>(undefined);

  const peers = useDb(
    () => listPeers({ search: search || undefined, grade, interest, country, limit: 30 }),
    [search, grade, interest, country],
  );
  const connections = useDb(() => myConnections(), []);

  const [activeConnection, setActiveConnection] = useState<PeerConnection | null>(null);
  const [localPeers, setLocalPeers] = useState<Peer[] | null>(null);

  useEffect(() => {
    if (peers) setLocalPeers(peers);
  }, [peers]);

  const updatePeer = (userId: string, connection: Peer["connection"]) => {
    setLocalPeers((prev) =>
      prev ? prev.map((p) => (p.user._id === userId ? { ...p, connection } : p)) : prev,
    );
  };

  const categoryLabel = (slug: string) => CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Users className="size-5" />
        </span>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Peers</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Students on the same journey, in the same fields.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative lg:col-span-2">
          <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, bio, interest…" className="pl-10" />
        </div>
        <Select value={grade ?? "all"} onValueChange={(v) => setGrade(v === "all" ? undefined : v)}>
          <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any grade</SelectItem>
            {GRADES.map((g) => (
              <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={interest ?? "all"} onValueChange={(v) => setInterest(v === "all" ? undefined : v)}>
          <SelectTrigger><SelectValue placeholder="Interest" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any interest</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>{c.emoji} {c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={country ?? "all"} onValueChange={(v) => setCountry(v === "all" ? undefined : v)}>
          <SelectTrigger><SelectValue placeholder="Country" /></SelectTrigger>
          <SelectContent className="max-h-80">
            <SelectItem value="all">Any country</SelectItem>
            {COUNTRIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          {!localPeers && (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-52 animate-pulse rounded-2xl border bg-card" />
              ))}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {localPeers?.map((peer) => (
              <div key={peer.user._id} className="flex flex-col rounded-2xl border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">
                      {peer.user.image ? <img src={peer.user.image} alt="" className="size-11 rounded-full object-cover" /> : peer.profile.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{peer.profile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {peer.profile.grade ? GRADE_LABEL[peer.profile.grade] ?? peer.profile.grade : "Student"}
                        {peer.profile.country && ` · ${peer.profile.country}`}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    {peer.matchPct}% match
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{peer.profile.bio || "Building the next chapter."}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {peer.profile.interests.slice(0, 3).map((i) => (
                    <span key={i} className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {categoryLabel(i)}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  {peer.connection === "none" && (
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => {
                        updatePeer(peer.user._id, "pending");
                        void requestConnection(peer.user._id);
                      }}
                    >
                      <UserPlus className="size-4" /> Connect
                    </Button>
                  )}
                  {peer.connection === "pending" && (
                    <Button size="sm" variant="secondary" className="flex-1 gap-1.5" disabled>
                      <UserCheck className="size-4" /> Request sent
                    </Button>
                  )}
                  {peer.connection === "incoming" && (
                    <>
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={() => {
                          updatePeer(peer.user._id, "connected");
                          if (peer.connectionId) void respondConnection(peer.connectionId, true);
                        }}
                      >
                        <UserCheck className="size-4" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => updatePeer(peer.user._id, "none")}
                      >
                        Decline
                      </Button>
                    </>
                  )}
                  {peer.connection === "connected" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1 gap-1.5"
                      onClick={() => {
                        const conn = connections?.find((c) => c.peerId === peer.user._id);
                        if (conn) setActiveConnection(conn);
                      }}
                    >
                      <MessageCircle className="size-4" /> Message
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {localPeers && localPeers.length === 0 && (
            <p className="py-14 text-center text-sm text-muted-foreground">
              No peers match those filters yet.
            </p>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Your connections {connections ? `(${connections.length})` : ""}
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            {connections?.map((c) => (
              <button
                key={c.connectionId}
                type="button"
                onClick={() => setActiveConnection(c)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/40",
                  activeConnection?.connectionId === c.connectionId && "border-primary/50 bg-primary/5",
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">
                  {c.image ? <img src={c.image} alt="" className="size-9 rounded-full object-cover" /> : c.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{c.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {c.grade ? GRADE_LABEL[c.grade] ?? c.grade : "Student"}
                    {c.country ? ` · ${c.country}` : ""}
                  </span>
                </span>
                <MessageCircle className="size-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
            {connections && connections.length === 0 && (
              <p className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                Connect with peers to start chatting.
              </p>
            )}
          </div>

          <AnimatePresence>
            {activeConnection && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                className="mt-5 overflow-hidden rounded-2xl border bg-card"
              >
                <ChatPanel connection={activeConnection} onClose={() => setActiveConnection(null)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function ChatPanel({ connection, onClose }: { connection: PeerConnection; onClose: () => void }) {
  const messages = useDb<ChatMessage[]>(() => listMessages(connection.connectionId), [connection.connectionId]);
  const [body, setBody] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
    void markMessagesRead(connection.connectionId);
  }, [messages, connection.connectionId]);

  return (
    <div className="flex h-96 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <p className="text-sm font-semibold">{connection.name}</p>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {!messages && <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p>}
        {messages?.map((m) => (
          <div key={m._id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                m.mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-secondary",
              )}
            >
              {m.body}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form
        className="flex items-center gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!body.trim()) return;
          void sendMessage(connection.connectionId, body).then(() => setBody(""));
        }}
      >
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message…"
          className="flex-1"
        />
        <Button type="submit" size="icon" aria-label="Send">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
