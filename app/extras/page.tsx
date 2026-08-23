"use client";

// app/extras/page.tsx
//
// Two independent things live here: free-form notes for a day, and
// user-defined "trackers" — a name + emoji the person picks once (e.g.
// "Mood" / 😊), then logs individual entries under. The emoji is what shows
// up on the Home calendar for any day with an entry of that type.

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/useAuth";
import { DayNote, ExtraRecord, ExtraType } from "@/lib/types";
import { dateToString, todayDateString } from "@/lib/workoutStore";
import {
  addDayNote,
  addExtraRecord,
  createExtraType,
  deleteDayNote,
  deleteExtraRecord,
  deleteExtraType,
  fetchDayNotes,
  fetchExtraRecordsForDate,
  fetchExtraTypes,
} from "@/lib/extrasStore";

const DEFAULT_HEALTH_TRACKERS: { name: string; emoji: string }[] = [
  { name: "Headache", emoji: "\ud83e\udd15" },
  { name: "Period", emoji: "\ud83e\udea8" },
  { name: "Ovulation", emoji: "\ud83e\udd5a" },
  { name: "Sick", emoji: "\ud83e\udd12" },
];

const EMOJI_CHOICES = [
  "\u2b50", "\ud83d\ude0a", "\ud83d\ude34", "\ud83d\udcda", "\ud83d\udcb0", "\ud83c\udfa8",
  "\ud83d\udc8a", "\ud83c\udf1e", "\ud83d\udea8", "\ud83c\udfc6", "\ud83d\udc36", "\u2601\ufe0f",
  "\ud83d\ude22", "\ud83d\ude21", "\ud83e\udd73", "\ud83d\udca7", "\ud83c\udfc3", "\ud83e\uddd8",
  "\ud83e\udd12", "\ud83e\udd27", "\ud83e\udd75", "\ud83e\udd76", "\ud83d\ude37", "\ud83d\udc89",
  "\ud83e\ude79", "\u2764\ufe0f", "\ud83c\udfaf", "\ud83c\udf19", "\ud83c\udf40", "\ud83c\udf89",
  "\ud83d\udc31", "\ud83c\udf38", "\ud83d\udeb4", "\ud83c\udfcb\ufe0f", "\ud83d\ude0e", "\ud83d\ude2a",
];

function NewTrackerForm({ onCreate, onCancel }: { onCreate: (name: string, emoji: string) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(EMOJI_CHOICES[0]);

  return (
    <div className="rounded-lg border border-[#0D9488] bg-[#0D9488]/5 p-3">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tracker name, e.g. 'Mood'"
        className="w-full mb-2 bg-white border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
      />
      <p className="text-[10px] text-[#6B7280] mb-1.5">Emoji for the Home calendar</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {EMOJI_CHOICES.map((e) => (
          <button
            key={e}
            onClick={() => setEmoji(e)}
            className={`h-8 w-8 rounded-full flex items-center justify-center text-base border ${
              emoji === e ? "border-[#0D9488] bg-white" : "border-transparent"
            }`}
          >
            {e}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => name.trim() && onCreate(name.trim(), emoji)}
          className="flex-1 rounded-md bg-[#0D9488] text-white text-sm font-medium py-2"
        >
          Create tracker
        </button>
        <button onClick={onCancel} className="px-4 rounded-md border border-[#E5E7EB] text-sm text-[#6B7280]">
          Cancel
        </button>
      </div>
    </div>
  );
}

const FLOW_PRESETS = ["Light", "Medium", "Heavy", "Spotting"];

function TrackerSection({
  type,
  records,
  onAddRecord,
  onDeleteRecord,
  onDeleteType,
}: {
  type: ExtraType;
  records: ExtraRecord[];
  onAddRecord: (name: string, notes: string) => void;
  onDeleteRecord: (id: string) => void;
  onDeleteType: () => void;
}) {
  const isPeriod = type.name.trim().toLowerCase() === "period";
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState(type.name);
  const [notes, setNotes] = useState("");

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-[#1D2027]">
          {type.emoji} {type.name}
        </p>
        <button onClick={onDeleteType} className="text-[10px] text-[#9CA3AF] hover:text-[#DC2626]">
          Remove tracker
        </button>
      </div>

      <div className="flex flex-col gap-1.5 mb-2">
        {records.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-md bg-[#F7F8FA] px-3 py-1.5">
            <div>
              <span className="text-sm text-[#1D2027]">{r.name}</span>
              {r.notes && <span className="text-xs text-[#6B7280] ml-2">{r.notes}</span>}
            </div>
            <button onClick={() => onDeleteRecord(r.id)} className="text-[#9CA3AF] hover:text-[#DC2626] text-xs">
              {"\u00d7"}
            </button>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="flex flex-col gap-1.5">
          {isPeriod ? (
            <div className="flex flex-wrap gap-1.5">
              {FLOW_PRESETS.map((f) => (
                <button
                  key={f}
                  onClick={() => setName(f)}
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    name === f ? "bg-[#1D2027] text-white border-[#1D2027]" : "border-[#E5E7EB] text-[#6B7280]"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          ) : (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Entry name"
              className="bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-1.5 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
            />
          )}
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-1.5 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!name.trim()) return;
                onAddRecord(name.trim(), notes);
                setName(type.name);
                setNotes("");
                setAdding(false);
              }}
              className="flex-1 rounded-md bg-[#0D9488] text-white text-xs font-medium py-1.5"
            >
              Add
            </button>
            <button
              onClick={() => setAdding(false)}
              className="px-3 rounded-md border border-[#E5E7EB] text-xs text-[#6B7280]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="text-xs text-[#0D9488] font-medium">
          + Add entry
        </button>
      )}
    </div>
  );
}

export default function ExtrasPage() {
  const { user } = useAuth();
  const [date, setDate] = useState(todayDateString());
  const [loading, setLoading] = useState(true);

  const [dayNotes, setDayNotes] = useState<DayNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [types, setTypes] = useState<ExtraType[]>([]);
  const [records, setRecords] = useState<ExtraRecord[]>([]);
  const [showNewTracker, setShowNewTracker] = useState(false);

  const isToday = date === todayDateString();

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchDayNotes(user.id, date), fetchExtraTypes(user.id), fetchExtraRecordsForDate(user.id, date)]).then(
      async ([n, t, r]) => {
        let finalTypes = t;
        if (t.length === 0) {
          finalTypes = [];
          for (const dt of DEFAULT_HEALTH_TRACKERS) {
            const created = await createExtraType(user.id, dt.name, dt.emoji);
            if (created) finalTypes.push(created);
          }
        }
        setDayNotes(n);
        setTypes(finalTypes);
        setRecords(r);
        setLoading(false);
      }
    );
  }, [user, date]);

  const shiftDate = (delta: number) => {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setDate(dateToString(d));
  };

  const submitNote = async () => {
    if (!user || !newNote.trim()) return;
    const created = await addDayNote(user.id, date, newNote.trim());
    if (created) setDayNotes((prev) => [...prev, created]);
    setNewNote("");
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <header className="mb-4">
          <h1 className="text-2xl font-semibold tracking-tight text-[#1D2027]">Extras</h1>
        </header>

        <div className="flex items-center justify-between mb-4">
          <button onClick={() => shiftDate(-1)} className="text-[#6B7280] px-2 py-1">
            {"\u2039"} Prev
          </button>
          <span className="text-sm font-medium text-[#1D2027]">
            {isToday
              ? "Today"
              : new Date(date + "T00:00:00").toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
          </span>
          <button onClick={() => shiftDate(1)} className="text-[#6B7280] px-2 py-1">
            Next {"\u203a"}
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-[#6B7280]">Loading...</p>
        ) : (
          <>
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 mb-4">
              <p className="text-sm font-medium text-[#1D2027] mb-2">Notes for this day</p>
              <div className="flex flex-col gap-1.5 mb-2">
                {dayNotes.map((n) => (
                  <div key={n.id} className="flex items-center justify-between rounded-md bg-[#F7F8FA] px-3 py-1.5">
                    <span className="text-sm text-[#1D2027]">{n.notes}</span>
                    <button
                      onClick={async () => {
                        setDayNotes((prev) => prev.filter((x) => x.id !== n.id));
                        await deleteDayNote(n.id);
                      }}
                      className="text-[#9CA3AF] hover:text-[#DC2626] text-xs"
                    >
                      {"\u00d7"}
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitNote()}
                  placeholder="Add a note..."
                  className="flex-1 bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
                />
                <button onClick={submitNote} className="px-4 rounded-md bg-[#0D9488] text-white text-sm font-medium">
                  Add
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 mb-4">
              {types.map((t) => (
                <TrackerSection
                  key={t.id}
                  type={t}
                  records={records.filter((r) => r.typeId === t.id)}
                  onAddRecord={async (name, notes) => {
                    if (!user) return;
                    const created = await addExtraRecord(user.id, t.id, date, name, notes || null);
                    if (created) setRecords((prev) => [...prev, created]);
                  }}
                  onDeleteRecord={async (id) => {
                    setRecords((prev) => prev.filter((r) => r.id !== id));
                    await deleteExtraRecord(id);
                  }}
                  onDeleteType={async () => {
                    setTypes((prev) => prev.filter((x) => x.id !== t.id));
                    await deleteExtraType(t.id);
                  }}
                />
              ))}
            </div>

            {showNewTracker ? (
              <NewTrackerForm
                onCancel={() => setShowNewTracker(false)}
                onCreate={async (name, emoji) => {
                  if (!user) return;
                  const created = await createExtraType(user.id, name, emoji);
                  if (created) setTypes((prev) => [...prev, created]);
                  setShowNewTracker(false);
                }}
              />
            ) : (
              <button
                onClick={() => setShowNewTracker(true)}
                className="w-full rounded-xl border border-dashed border-[#D1D5DB] text-[#6B7280] text-sm py-3 hover:border-[#0D9488] hover:text-[#0D9488] transition-colors"
              >
                + New tracker
              </button>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
