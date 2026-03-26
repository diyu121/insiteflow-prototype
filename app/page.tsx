/**
 * InsiteFlow Coding Assistant — Drawer-Native Prototype
 * ======================================================
 * The drawer IS the product. Designed specifically for
 * right-side EHR integration (Epic, Athena, etc.)
 *
 * Stack:   React + Tailwind (CDN, no build step)
 * Width:   460px fixed
 * Layout:  Sticky header · Scrollable body · Sticky footer
 * Views:   Gap Inbox (default) → Gap Detail (per gap)
 *
 * To swap data: edit PATIENT and GAPS below.
 */
"use client";

import { useState, useRef, useEffect } from "react";

// ============================================================
// MOCK DATA — edit here to swap patient / gaps
// ============================================================

const PATIENT = {
  name: "Margaret Chen",
  mrn: "MRN-4829103",
  dob: "03/12/1953",
  age: 72,
  sex: "F",
  payer: "Humana Gold Plus",
  planType: "Medicare Advantage",
  pcp: "Dr. Sarah Williams, MD",
};

const GAPS = [
  {
    id: "g1",
    icd10: "N18.31",
    label: "Chronic kidney disease, stage 3a",
    confidence: "supported",
    source: "net_new",
    raf: 0.059,
    hcc: "HCC 138",
    hccVersion: "V28",
    evidence: [
      "eGFR 52 mL/min/1.73m² — Jan 15, 2026",
      "Creatinine 1.42 mg/dL — Jan 15, 2026",
      "uACR 188 mg/g — elevated on 2 consecutive visits",
      "Nephrology follow-up Nov 20, 2025: stable, no dialysis",
    ],
    docGap:
      "CKD is clinically evident and lab-supported, but no explicit staging language (\"Stage 3a\") appears in this year's assessment note. Codability requires the stage to be documented by the treating physician in the assessment section.",
    meat: {
      monitor:  { present: true,  note: "eGFR and creatinine trended over 6+ months" },
      evaluate: { present: true,  note: "Nephrology reviewed; stable, no acute changes" },
      assess:   { present: false, note: "Stage 3a not written in current-year assessment" },
      treat:    { present: true,  note: "Lisinopril active; nephrotoxins avoided" },
    },
    suggestedNote:
      "CKD stage 3a (N18.31) — eGFR 52 mL/min/1.73m² (01/15/26), stable. Managed with Nephrology. Continue Lisinopril for renoprotection. Avoid nephrotoxic agents (NSAIDs, contrast). Repeat CMP and eGFR in 3 months.",
  },
  {
    id: "g2",
    icd10: "E11.22",
    label: "Type 2 DM with diabetic chronic kidney disease",
    confidence: "supported",
    source: "payer",
    raf: 0.187,
    hcc: "HCC 37",
    hccVersion: "V28",
    evidence: [
      "HbA1c 8.2% (Jan 15, 2026) — above goal",
      "Active Rx: Metformin 1000mg BID + Lantus 20u QHS",
      "Diabetic retinopathy NPDR bilateral (Dec 3, 2025 — Dr. Lee OD)",
      "Diabetic nephropathy, uACR 168 mg/g (Nov 20, 2025 — Dr. Patel MD)",
    ],
    docGap:
      "Payer recapture gap. Diabetes is documented, but the ICD-10 specificity linking it to chronic complications (nephropathy, retinopathy) has not been coded in this encounter year. Complication linkage must appear in the assessment.",
    meat: {
      monitor:  { present: true,  note: "A1c, eGFR, uACR all tracked and trended" },
      evaluate: { present: true,  note: "Glycemic control reviewed; not at goal" },
      assess:   { present: false, note: "Complication linkage absent in current-year note" },
      treat:    { present: true,  note: "Metformin + Lantus active; A1c recheck ordered" },
    },
    suggestedNote:
      "Type 2 DM with chronic complications — nephropathy (E11.22), retinopathy (E11.319), hyperglycemia (E11.65). HbA1c 8.2% (01/15/26), not at goal. Continue Lantus 20u QHS + Metformin 1000mg BID. HbA1c recheck overdue >90d. Ophthalmology annual f/u scheduled with Dr. Lee.",
  },
  {
    id: "g3",
    icd10: "E66.01",
    label: "Morbid (severe) obesity due to excess calories",
    confidence: "suspected",
    source: "net_new",
    raf: 0.024,
    hcc: "HCC 48",
    hccVersion: "V28",
    evidence: [
      "BMI 41.2 kg/m² (Jan 15, 2026)",
      "Weight 247 lbs — present at current visit",
      "Obesity not addressed in last two office visit notes",
    ],
    docGap:
      "BMI ≥40 is captured in vitals, but morbid obesity does not appear in the physician's assessment or active problem list this year. To be codable, the diagnosis must appear in the assessment with either a treatment note or counseling reference.",
    meat: {
      monitor:  { present: true,  note: "BMI tracked in vitals (41.2 kg/m²)" },
      evaluate: { present: false, note: "No formal obesity evaluation documented" },
      assess:   { present: false, note: "Morbid obesity absent from current-year assessment" },
      treat:    { present: false, note: "No weight management plan or referral on file" },
    },
    suggestedNote:
      "Morbid obesity (E66.01) — BMI 41.2 kg/m² (01/15/26). Weight management counseled today. Consider structured weight management program referral or pharmacotherapy. Repeat weight and BMI documented at next visit.",
  },
  {
    id: "g4",
    icd10: "I50.32",
    label: "Chronic diastolic (congestive) heart failure",
    confidence: "supported",
    source: "payer",
    raf: 0.087,
    hcc: "HCC 85",
    hccVersion: "V28",
    evidence: [
      "Echo Oct 14, 2025: EF 55%, Grade II diastolic dysfunction",
      "Active Rx: Furosemide 40mg daily, Lisinopril 10mg daily",
      "Cardiology Oct 14, 2025 — stable, compensated, no hospitalizations",
      "Payer gap flagged from prior measurement year",
    ],
    docGap:
      "CHF was captured in the prior year but has not been explicitly documented with ICD-10 specificity (diastolic vs. systolic) in the current measurement year. Payer recapture requires current-year documentation by the responsible physician.",
    meat: {
      monitor:  { present: true,  note: "Echo EF 55%; daily weight monitoring in place" },
      evaluate: { present: true,  note: "Cardiology f/u 10/14/25 — stable, compensated" },
      assess:   { present: false, note: "CHF specificity (diastolic) absent from current-year note" },
      treat:    { present: true,  note: "Furosemide + Lisinopril active; sodium restriction counseled" },
    },
    suggestedNote:
      "Chronic diastolic (congestive) heart failure (I50.32) — stable, compensated. Echo 10/14/25: EF 55%, Grade II diastolic dysfunction. Continue Furosemide 40mg daily and Lisinopril 10mg. Monitor daily weights; return if weight ↑ >3 lbs in 2 days. Cardiology follow-up in 6 months.",
  },
  {
    id: "g5",
    icd10: "J44.1",
    label: "COPD with acute exacerbation",
    confidence: "unsupported",
    source: "net_new",
    raf: 0.050,
    hcc: "HCC 111",
    hccVersion: "V28",
    evidence: [
      "Albuterol HFA inhaler on med list (PRN use only)",
    ],
    docGap:
      "Active PRN bronchodilator was flagged by the model, but no spirometry, documented exacerbation visit, or prior COPD diagnosis was found in the current or prior year. This gap requires clinical verification before any coding action.",
    meat: {
      monitor:  { present: false, note: "No spirometry or peak flow measurements found" },
      evaluate: { present: false, note: "No formal pulmonary evaluation on file" },
      assess:   { present: false, note: "COPD absent from problem list and assessment" },
      treat:    { present: false, note: "PRN inhaler only — no COPD management plan documented" },
    },
    suggestedNote:
      "⚠ Verify before coding. Active Albuterol (PRN) noted but no spirometry or COPD diagnosis found in chart. If COPD is clinically present, document diagnosis, severity, and whether exacerbation is current or historical. Order spirometry if not already completed.",
  },
];

// ============================================================
// STYLE MAPS
// ============================================================

const CONF_MAP = {
  supported:   { label: "Supported",   badge: "text-emerald-700 bg-emerald-50",  dot: "bg-emerald-400", border: "border-l-emerald-300" },
  suspected:   { label: "Suspected",   badge: "text-amber-700  bg-amber-50",     dot: "bg-amber-400",   border: "border-l-amber-300" },
  unsupported: { label: "Unsupported", badge: "text-gray-500   bg-gray-100",     dot: "bg-gray-300",    border: "border-l-gray-200" },
};

const SRC_MAP = {
  net_new: { label: "Net New", badge: "text-violet-700 bg-violet-50" },
  payer:   { label: "Payer",   badge: "text-blue-700   bg-blue-50" },
};

// Workflow state: left-border + row tint
const WF_ROW = {
  pending:      { border: "border-l-gray-200",    tint: "",                  label: null },
  accepted:     { border: "border-l-emerald-400", tint: "bg-emerald-50",    label: "Accepted" },
  dismissed:    { border: "border-l-gray-200",    tint: "bg-gray-50",       label: "Dismissed" },
  added_to_note:{ border: "border-l-blue-400",    tint: "bg-blue-50",       label: "Added to note" },
};

const WF_TAG = {
  accepted:      "text-emerald-700 bg-emerald-50 border border-emerald-200",
  dismissed:     "text-gray-500   bg-gray-50    border border-gray-200",
  added_to_note: "text-blue-700   bg-blue-50    border border-blue-200",
};

// ============================================================
// UTILITY
// ============================================================

function rafFmt(r)  { return `+${r.toFixed(3)}`; }

const MEAT_LABELS = { monitor: "Monitor", evaluate: "Evaluate", assess: "Assess", treat: "Treat" };
const MEAT_KEYS   = ["monitor", "evaluate", "assess", "treat"];

// Compiles per-section MEAT drafts into a single Assessment & Plan note
function compileAssessmentNote(gap, meatNotes) {
  return MEAT_KEYS
    .map((k) => {
      const text = (meatNotes?.[k] ?? gap.meat[k]?.note ?? "").trim();
      return text ? `[${MEAT_LABELS[k]}] ${text}` : null;
    })
    .filter(Boolean)
    .join("\n\n");
}

// ============================================================
// ATOMS
// ============================================================

function ConfBadge({ c }) {
  const m = CONF_MAP[c] ?? CONF_MAP.unsupported;
  return <span className={`text-xs font-semibold px-1.5 py-0.5 rounded shrink-0 ${m.badge}`}>{m.label}</span>;
}

function SrcBadge({ s }) {
  const m = SRC_MAP[s] ?? SRC_MAP.net_new;
  return <span className={`text-xs font-semibold px-1.5 py-0.5 rounded shrink-0 ${m.badge}`}>{m.label}</span>;
}

function WorkflowTag({ status, onReset }) {
  const cls = WF_TAG[status];
  if (!cls) return null;
  const label = WF_ROW[status]?.label;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${cls}`}>
      {label}
      {onReset && (
        <button
          onClick={(e) => { e.stopPropagation(); onReset(); }}
          className="opacity-40 hover:opacity-100 text-xs leading-none ml-0.5"
          title="Undo"
        >×</button>
      )}
    </span>
  );
}

// ============================================================
// SECTION WRAPPER (used in detail view)
// ============================================================

function Section({ label, children, noPad }) {
  return (
    <div className="border-t border-gray-100">
      <div className={noPad ? "" : "px-4 py-3"}>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5 px-4 pt-3">{label}</p>
        <div className={noPad ? "" : "px-4"}>{children}</div>
      </div>
    </div>
  );
}

// ============================================================
// MEAT SECTION — core clinical display
// ============================================================

// MeatSection — selector/nav style. Clicking a row sets the active key for the
// shared Documentation Update field below. No inline editing here.
function MeatSection({ meat, activeKey, onSelect, notesByKey }) {
  const rows = [
    { key: "monitor",  letter: "M", word: "Monitor" },
    { key: "evaluate", letter: "E", word: "Evaluate" },
    { key: "assess",   letter: "A", word: "Assess" },
    { key: "treat",    letter: "T", word: "Treat" },
  ];

  return (
    <div className="px-4 pb-2">
      <div className="rounded-lg overflow-hidden border border-gray-100">
        {rows.map(({ key, letter, word }, i) => {
          const d        = meat[key];
          const present  = d?.present;
          const isActive = activeKey === key;

          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={`w-full flex items-start text-left text-xs transition-colors ${i > 0 ? "border-t border-gray-100" : ""} ${
                isActive
                  ? "bg-indigo-50"
                  : !present
                    ? "bg-red-50 hover:bg-red-100"
                    : "bg-white hover:bg-gray-50"
              }`}
            >
              {/* Active indicator bar */}
              <div className={`w-1 self-stretch shrink-0 ${isActive ? "bg-indigo-400" : "bg-transparent"}`} />
              {/* Letter */}
              <div className={`w-7 flex-none flex items-center justify-center py-2.5 border-r ${isActive ? "border-indigo-100" : !present ? "border-red-100" : "border-gray-100"}`}>
                <span className={`font-mono font-black text-xs ${isActive ? "text-indigo-500" : !present ? "text-red-300" : "text-gray-300"}`}>{letter}</span>
              </div>
              {/* Word */}
              <div className={`w-16 flex-none flex items-center py-2.5 px-2 border-r ${isActive ? "border-indigo-100" : !present ? "border-red-100" : "border-gray-100"}`}>
                <span className={`text-xs font-semibold ${isActive ? "text-indigo-700" : !present ? "text-red-400" : "text-gray-500"}`}>{word}</span>
              </div>
              {/* Status icon */}
              <div className="w-6 flex-none flex items-center justify-center py-2.5">
                <span className={`text-xs font-bold ${present ? "text-emerald-600" : "text-red-400"}`}>
                  {present ? "✓" : "✗"}
                </span>
              </div>
              {/* Note preview */}
              <div className="flex-1 py-2.5 pl-1.5 pr-2">
                <span className={`leading-relaxed ${isActive ? "text-indigo-800 font-medium" : !present ? "text-red-700" : "text-gray-500"}`}>
                  {notesByKey?.[key] ?? d?.note ?? "—"}
                </span>
              </div>
              {/* Edit chevron */}
              <div className="w-7 flex-none flex items-center justify-center py-2.5 shrink-0">
                <span className={`text-xs ${isActive ? "text-indigo-400 font-bold" : "text-gray-200"}`}>
                  {isActive ? "✎" : "›"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// INBOX ITEM — single row in the gap list
// ============================================================

function InboxItem({ gap, status, onAction, onSelect }) {
  const conf = CONF_MAP[gap.confidence] ?? CONF_MAP.unsupported;
  const wf   = WF_ROW[status] ?? WF_ROW.pending;
  const isPending = status === "pending";
  const isDismissed = status === "dismissed";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(gap.id)}
      onKeyDown={(e) => e.key === "Enter" && onSelect(gap.id)}
      className={`border-l-4 ${wf.border} ${wf.tint} ${isDismissed ? "opacity-50" : ""} cursor-pointer group transition-colors hover:bg-gray-50 select-none`}
    >
      <div className="flex items-start gap-2 px-3 pt-2.5 pb-2">
        {/* Left content */}
        <div className="flex-1 min-w-0">
          {/* Row 1: status dot + code + label */}
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 translate-y-[-1px] ${conf.dot}`} />
            <span className="font-mono text-xs font-bold text-gray-800 shrink-0">{gap.icd10}</span>
            <span className="text-xs text-gray-600 truncate leading-tight">{gap.label}</span>
          </div>
          {/* Row 2: badges + RAF */}
          <div className="flex items-center gap-1.5 mt-1.5 pl-3">
            <ConfBadge c={gap.confidence} />
            <SrcBadge s={gap.source} />
            <span className="text-gray-200 text-xs">·</span>
            <span className="text-xs font-bold text-indigo-600">{rafFmt(gap.raf)} RAF</span>
            <span className="text-gray-200 text-xs">·</span>
            <span className="text-xs text-gray-400">{gap.hcc}</span>
          </div>
        </div>

        {/* Right: actions */}
        <div className="shrink-0 flex items-center gap-1 mt-0.5" onClick={(e) => e.stopPropagation()}>
          {isPending ? (
            <>
              <button
                onClick={() => onAction(gap.id, "accepted")}
                title="Accept"
                className="w-7 h-7 rounded-md bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-700 text-xs font-bold flex items-center justify-center transition-colors border border-emerald-100"
              >✓</button>
              <button
                onClick={() => onAction(gap.id, "dismissed")}
                title="Dismiss"
                className="w-7 h-7 rounded-md bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-400 text-xs flex items-center justify-center transition-colors border border-gray-100"
              >✕</button>
            </>
          ) : (
            <WorkflowTag status={status} onReset={() => onAction(gap.id, "pending")} />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// GAP INBOX — default list view
// ============================================================

function GapInbox({ gaps, statuses, onAction, onSelect }) {
  const [filter, setFilter] = useState("all");

  const counts = {
    all:      gaps.length,
    pending:  gaps.filter((g) => !statuses[g.id] || statuses[g.id] === "pending").length,
    accepted: gaps.filter((g) => statuses[g.id] === "accepted" || statuses[g.id] === "added_to_note").length,
    dismissed:gaps.filter((g) => statuses[g.id] === "dismissed").length,
  };

  const visible = gaps.filter((g) => {
    const s = statuses[g.id] ?? "pending";
    if (filter === "all")      return true;
    if (filter === "pending")  return s === "pending";
    if (filter === "accepted") return s === "accepted" || s === "added_to_note";
    if (filter === "dismissed")return s === "dismissed";
    return true;
  });

  const FILTERS = [
    { key: "all",       label: `All (${counts.all})` },
    { key: "pending",   label: `Pending (${counts.pending})` },
    { key: "accepted",  label: `Accepted (${counts.accepted})` },
    { key: "dismissed", label: `Dismissed (${counts.dismissed})` },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Filter strip */}
      <div className="flex items-center gap-0.5 px-3 py-2 border-b border-gray-100 bg-gray-50 shrink-0 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-colors whitespace-nowrap ${
              filter === f.key
                ? "bg-white text-gray-800 shadow-sm border border-gray-200"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Column hint */}
      <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 border-b border-gray-100 shrink-0">
        <span className="text-xs text-gray-300 pl-3">Code · Diagnosis · Status · Source · RAF</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-xs text-gray-300">
            <span className="text-2xl mb-1 opacity-30">◉</span>
            No gaps in this filter
          </div>
        ) : (
          visible.map((gap) => (
            <InboxItem
              key={gap.id}
              gap={gap}
              status={statuses[gap.id] ?? "pending"}
              onAction={onAction}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================
// GAP DETAIL — expanded view for a single gap
// ============================================================

function GapDetail({ gap, status, onAction, onBack, meatNotes, onMeatNoteChange }) {
  const conf      = CONF_MAP[gap.confidence] ?? CONF_MAP.unsupported;
  const src       = SRC_MAP[gap.source] ?? SRC_MAP.net_new;
  const isPending = !status || status === "pending";
  const isAdded   = status === "added_to_note";
  const isAccepted= status === "accepted";

  // Active MEAT key — controls which section appears in the Documentation Update field
  // Default to "assess" since it is the most common gap across all conditions
  const [activeMeatKey, setActiveMeatKey] = useState("assess");

  // Scroll to top + reset active MEAT key when navigating to a different gap
  const scrollRef = useRef(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    setActiveMeatKey("assess");
  }, [gap.id]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Back nav */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 px-4 py-2.5 text-xs text-gray-400 hover:text-gray-700 border-b border-gray-100 transition-colors bg-gray-50 shrink-0"
      >
        <span className="text-sm leading-none">←</span>
        <span className="font-medium">Back to list</span>
      </button>

      {/* Scrollable body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">

        {/* ── DIAGNOSIS ─────────────────────────────────── */}
        <div className="px-4 py-3.5 border-b border-gray-100">
          {/* Code row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md shrink-0">
              {gap.icd10}
            </span>
            <ConfBadge c={gap.confidence} />
            <SrcBadge s={gap.source} />
            {status && status !== "pending" && (
              <WorkflowTag status={status} onReset={() => onAction(gap.id, "pending")} />
            )}
          </div>
          {/* Diagnosis label */}
          <h2 className="text-sm font-bold text-gray-900 mt-2 leading-snug">{gap.label}</h2>
          {/* Metadata row */}
          <div className="flex items-center gap-2 mt-1.5 text-xs flex-wrap">
            <span className="font-bold text-indigo-600">{rafFmt(gap.raf)} RAF</span>
            <span className="text-gray-200">·</span>
            <span className="text-gray-400">{gap.hcc} · {gap.hccVersion}</span>
          </div>
          {/* Coding impact */}
          <p className="text-xs text-gray-300 mt-1 leading-relaxed">Captures condition for current measurement year</p>
        </div>

        {/* ── SUPPORTING EVIDENCE ───────────────────────── */}
        <div className="border-t border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-4 pt-3 mb-2">Supporting Evidence</p>
          <ul className="px-4 pb-3 space-y-2">
            {gap.evidence.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className="text-gray-300 shrink-0 mt-0.5 leading-none">•</span>
                <span className="text-gray-700 leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── DOCUMENTATION GAP ─────────────────────────── */}
        <div className="border-t border-gray-100 bg-amber-50">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-widest px-4 pt-3 mb-2">Documentation Gap</p>
          <p className="px-4 pb-3 text-xs text-amber-900 leading-relaxed">{gap.docGap}</p>
        </div>

        {/* ── MEAT STATUS ───────────────────────────────── */}
        <div className="border-t border-gray-100">
          <div className="px-4 pt-3 mb-2 flex items-baseline justify-between">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">MEAT Status</p>
            <span className="text-xs text-gray-300">Click a row to edit</span>
          </div>
          <MeatSection
            meat={gap.meat}
            activeKey={activeMeatKey}
            onSelect={setActiveMeatKey}
            notesByKey={meatNotes}
          />
          {/* MEAT completeness summary */}
          {MEAT_KEYS.every((k) => gap.meat[k]?.present) ? (
            <p className="px-4 pb-2 text-xs text-emerald-600 font-medium flex items-center gap-1.5">
              <span>✓</span> MEAT criteria satisfied.
            </p>
          ) : (
            <p className="px-4 pb-2 text-xs text-amber-600 leading-relaxed">
              Missing documentation will be resolved when added to note.
            </p>
          )}
        </div>

        {/* ── DOCUMENTATION UPDATE — shared editable field ── */}
        <div className="border-t border-gray-100">
          <div className="px-4 pt-3 mb-1.5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Documentation Update</p>
            <p className="text-xs text-gray-300 mt-0.5">Edit the selected MEAT section below. This content contributes to the final Assessment &amp; Plan note.</p>
          </div>
          <div className="px-4 pb-3">
            {/* Active section label + status pill */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">
                {MEAT_LABELS[activeMeatKey]}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium leading-none ${
                gap.meat[activeMeatKey]?.present
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-red-50 text-red-400"
              }`}>
                {gap.meat[activeMeatKey]?.present ? "Documented" : "Missing"}
              </span>
            </div>
            <textarea
              key={`${gap.id}-${activeMeatKey}`}
              value={meatNotes?.[activeMeatKey] ?? gap.meat[activeMeatKey]?.note ?? ""}
              onChange={(e) => onMeatNoteChange(gap.id, activeMeatKey, e.target.value)}
              rows={4}
              spellCheck={false}
              className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-300 leading-relaxed"
              placeholder={`Document ${MEAT_LABELS[activeMeatKey]?.toLowerCase()} for this condition…`}
            />
          </div>
        </div>

        {/* ── ASSESSMENT & PLAN PREVIEW — compiled read-only ── */}
        <div className="border-t border-gray-100">
          <div className="px-4 pt-3 mb-1.5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Assessment &amp; Plan Preview</p>
            <p className="text-xs text-gray-300 mt-0.5">Compiled note that will be inserted into the EHR</p>
          </div>
          <div className="px-4 pb-3">
            {compileAssessmentNote(gap, meatNotes) ? (
              <pre className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg p-3 whitespace-pre-wrap leading-relaxed font-mono">
                {compileAssessmentNote(gap, meatNotes)}
              </pre>
            ) : (
              <p className="text-xs text-gray-300 italic">Edit MEAT sections above to build the note.</p>
            )}
          </div>
        </div>

      </div>{/* ── end scrollable body ── */}

      {/* ── STICKY ACTION BAR ─────────────────────────────
           Lives outside the scroll area so it never scrolls
           away. Sits between the scroll body and DrawerFooter.
      ─────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-3 space-y-2">

        {/* ── SUCCESS STATE: added_to_note ── */}
        {isAdded && (
          <div className="flex items-center justify-between gap-3 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                <span className="text-white font-bold leading-none" style={{ fontSize: "10px" }}>✓</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-blue-800 leading-snug">Added to Assessment</p>
                <p className="text-xs text-blue-400 leading-snug mt-0.5">Documentation updated. Ready for coding.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onBack}
                className="text-xs text-blue-400 hover:text-blue-600 underline whitespace-nowrap"
              >← List</button>
              <span className="text-blue-200">·</span>
              <button
                onClick={() => onAction(gap.id, "pending")}
                className="text-xs text-blue-300 hover:text-blue-500 underline"
              >undo</button>
            </div>
          </div>
        )}

        {/* ── PENDING: primary 3-action layout ── */}
        {isPending && (
          <>
            <button
              onClick={() => onAction(gap.id, "added_to_note")}
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold py-2.5 px-3 rounded-lg transition-colors"
            >
              Accept &amp; Add to Note
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => onAction(gap.id, "accepted")}
                className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-semibold py-2 px-3 rounded-lg transition-colors"
              >Accept Only</button>
              <button
                onClick={() => onAction(gap.id, "dismissed")}
                className="flex-1 border border-red-100 hover:bg-red-50 text-red-400 text-xs font-semibold py-2 px-3 rounded-lg transition-colors"
              >Dismiss</button>
            </div>
            <p className="text-xs text-gray-300 text-center leading-relaxed">
              Only conditions added to the note will be captured for coding.
            </p>
          </>
        )}

        {/* ── ACCEPTED: upgrade or dismiss ── */}
        {isAccepted && (
          <>
            <button
              onClick={() => onAction(gap.id, "added_to_note")}
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold py-2.5 px-3 rounded-lg transition-colors"
            >Add to Note</button>
            <div className="flex gap-2">
              <button
                onClick={() => onAction(gap.id, "dismissed")}
                className="flex-1 border border-red-100 hover:bg-red-50 text-red-400 text-xs font-semibold py-2 px-3 rounded-lg transition-colors"
              >Dismiss</button>
              <button
                onClick={() => onAction(gap.id, "pending")}
                className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-400 text-xs font-semibold py-2 px-3 rounded-lg transition-colors"
              >Reset</button>
            </div>
            <p className="text-xs text-gray-300 text-center leading-relaxed">
              Only conditions added to the note will be captured for coding.
            </p>
          </>
        )}

        {/* ── DISMISSED: restore ── */}
        {status === "dismissed" && (
          <button
            onClick={() => onAction(gap.id, "pending")}
            className="w-full border border-gray-200 hover:bg-gray-50 text-gray-500 text-xs font-semibold py-2.5 px-3 rounded-lg transition-colors"
          >Restore to pending</button>
        )}

      </div>{/* ── end sticky action bar ── */}

    </div>
  );
}

// ============================================================
// DRAWER HEADER — sticky top
// ============================================================

function DrawerHeader({ gapCount, pendingCount, onClose }) {
  return (
    <div className="shrink-0 border-b border-gray-200 bg-white">
      {/* Title row */}
      <div className="flex items-start justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">IF</span>
          </div>
          <h1 className="text-sm font-bold text-gray-900">Coding Opportunities</h1>
        </div>
        <button
          onClick={onClose}
          title="Close"
          className="w-7 h-7 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 flex items-center justify-center text-xs transition-colors shrink-0"
        >✕</button>
      </div>

      {/* Patient context */}
      <div className="px-4 pb-2.5">
        <p className="text-xs text-gray-700 font-semibold">
          {PATIENT.name}
          <span className="font-normal text-gray-400 ml-1.5">{PATIENT.mrn} · DOB {PATIENT.dob} · {PATIENT.age}{PATIENT.sex}</span>
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-xs text-gray-400">{PATIENT.payer}</span>
          <span className="text-gray-200 text-xs">·</span>
          <span className={`text-xs font-semibold ${pendingCount > 0 ? "text-indigo-600" : "text-gray-400"}`}>
            {pendingCount} gap{pendingCount !== 1 ? "s" : ""} pending review
          </span>
          <span className="text-gray-200 text-xs">·</span>
          <span className="text-xs text-gray-400">{gapCount} total</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DRAWER FOOTER — sticky bottom workspace
// ============================================================

function DrawerFooter({ gaps, statuses, onInsert }) {
  const accepted = gaps.filter((g) => statuses[g.id] === "accepted").length;
  const added    = gaps.filter((g) => statuses[g.id] === "added_to_note").length;
  const total    = accepted + added;

  if (total === 0) {
    return (
      <div className="shrink-0 border-t border-gray-100 px-4 py-2 bg-white">
        <p className="text-xs text-gray-300 text-center">Accept gaps to build your note</p>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs flex-wrap">
          {accepted > 0 && (
            <span className="font-semibold text-emerald-700">
              {accepted} accepted
            </span>
          )}
          {accepted > 0 && added > 0 && <span className="text-gray-300">·</span>}
          {added > 0 && (
            <span className="font-semibold text-blue-700">
              {added} added to note
            </span>
          )}
        </div>
        {accepted > 0 && (
          <button
            onClick={onInsert}
            className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Insert into Note →
          </button>
        )}
        {accepted === 0 && added > 0 && (
          <span className="text-xs text-blue-500 font-medium">Note ready ✓</span>
        )}
      </div>
    </div>
  );
}

// ============================================================
// INSERTED NOTES MODAL — shows what would go into the EHR
// ============================================================

function InsertedNotesModal({ gaps, statuses, meatNotesByGap, onClose }) {
  const added = gaps.filter(
    (g) => statuses[g.id] === "accepted" || statuses[g.id] === "added_to_note"
  );
  // Build compiled note per gap from MEAT drafts; fall back to suggestedNote if
  // the user hasn't edited anything yet
  const text = added
    .map((g) => {
      const compiled = compileAssessmentNote(g, meatNotesByGap[g.id]);
      return compiled || g.suggestedNote;
    })
    .join("\n\n---\n\n");

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.3)" }}>
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-96 max-h-96 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">Note Ready to Insert</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xs w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">{text}</pre>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
          <button
            onClick={() => { navigator.clipboard?.writeText(text); }}
            className="flex-1 border border-gray-200 text-gray-600 text-xs font-semibold py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Copy to clipboard
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EHR BACKGROUND — simulates note editor behind drawer
// ============================================================

function EhrBackground() {
  return (
    <div className="h-screen bg-gray-100 overflow-hidden">
      {/* EHR top bar */}
      <div className="h-10 bg-blue-900 flex items-center px-4 gap-3">
        <span className="text-white text-xs font-semibold opacity-80">Epic EHR</span>
        <span className="text-blue-400 text-xs">|</span>
        <span className="text-blue-300 text-xs">Margaret Chen · 72F · MRN-4829103</span>
        <span className="text-blue-400 text-xs">|</span>
        <span className="text-blue-300 text-xs">Office Visit — 03/25/2026</span>
      </div>

      {/* EHR body */}
      <div className="flex h-full">
        {/* Left sidebar nav */}
        <div className="w-40 bg-blue-800 flex-shrink-0 pt-2">
          {["Chart Review", "Problem List", "Medications", "Labs", "Vitals", "Visit Note", "Orders"].map((item, i) => (
            <div key={item} className={`px-3 py-2 text-xs ${i === 5 ? "bg-blue-600 text-white font-semibold" : "text-blue-300 hover:text-white"} cursor-default`}>
              {item}
            </div>
          ))}
        </div>

        {/* Note editor area */}
        <div className="flex-1 bg-white p-4 overflow-y-auto">
          <div className="max-w-lg">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Visit Note — Dr. Sarah Williams, MD</p>

            {/* Note sections */}
            {[
              { label: "Chief Complaint", content: "Follow-up for chronic conditions. Patient reports stable symptoms. No acute complaints today." },
              { label: "HPI", content: "72-year-old female with history of DM2, CKD, and HF presenting for routine follow-up. A1c was 8.2% at last check. Nephrology follow-up completed November 2025." },
              { label: "Vitals", content: "BP 138/82 · HR 74 · Wt 247 lbs · BMI 41.2 · Temp 98.4°F · SpO2 97% RA" },
              { label: "Assessment", content: "" },
              { label: "Plan", content: "" },
            ].map(({ label, content }) => (
              <div key={label} className="mb-4">
                <p className="text-xs font-bold text-gray-700 mb-1">{label}</p>
                {content ? (
                  <p className="text-xs text-gray-500 leading-relaxed">{content}</p>
                ) : (
                  <div className="h-16 border border-dashed border-gray-200 rounded bg-gray-50 flex items-center justify-center">
                    <span className="text-xs text-gray-300">Click to type or use Coding Assistant →</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ROOT APP
// ============================================================

export default function DrawerApp() {
  const [statuses,       setStatuses]       = useState({});
  const [meatNotesByGap, setMeatNotesByGap] = useState({});
  const [detailGapId,    setDetailGapId]    = useState(null);
  const [drawerOpen,     setDrawerOpen]     = useState(true);
  const [showInserted,   setShowInserted]   = useState(false);

  const detailGap = detailGapId ? GAPS.find((g) => g.id === detailGapId) : null;

  const handleAction   = (gapId, status) => setStatuses((prev) => ({ ...prev, [gapId]: status }));
  const handleMeatNote = (gapId, key, val) =>
    setMeatNotesByGap((prev) => ({
      ...prev,
      [gapId]: { ...(prev[gapId] ?? {}), [key]: val },
    }));
  const handleInsert  = () => {
    // Mark all accepted as added_to_note
    const updates = {};
    GAPS.forEach((g) => {
      if (statuses[g.id] === "accepted") updates[g.id] = "added_to_note";
    });
    setStatuses((prev) => ({ ...prev, ...updates }));
    setShowInserted(true);
  };

  const pendingCount = GAPS.filter((g) => !statuses[g.id] || statuses[g.id] === "pending").length;

  return (
    <div className="relative" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* EHR background */}
      <EhrBackground />

      {/* Drawer toggle tab — visible when closed */}
      {!drawerOpen && (
        <button
          onClick={() => setDrawerOpen(true)}
          style={{ writingMode: "vertical-lr", right: 0, top: "50%", transform: "translateY(-50%)", zIndex: 40, padding: "18px 10px", borderRadius: "8px 0 0 8px" }}
          className="fixed bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg transition-colors"
        >
          <span style={{ transform: "rotate(180deg)", display: "inline-block" }} className="text-xs font-bold tracking-widest uppercase whitespace-nowrap">
            Coding Assistant · {pendingCount}
          </span>
        </button>
      )}

      {/* Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.05)" }}
          onClick={() => { setDrawerOpen(false); setDetailGapId(null); }}
        />
      )}

      {/* THE DRAWER */}
      <div
        className="fixed right-0 top-0 h-screen bg-white border-l border-gray-200 z-50 flex flex-col transition-transform duration-300 ease-in-out"
        style={{
          width: "460px",
          transform: drawerOpen ? "translateX(0)" : "translateX(100%)",
          boxShadow: drawerOpen ? "-4px 0 24px rgba(0,0,0,0.08)" : "none",
        }}
      >
        {/* ── HEADER ─────────────────────────────────── */}
        <DrawerHeader
          gapCount={GAPS.length}
          pendingCount={pendingCount}
          onClose={() => { setDrawerOpen(false); setDetailGapId(null); }}
        />

        {/* ── BODY ───────────────────────────────────── */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {detailGap ? (
            <GapDetail
              gap={detailGap}
              status={statuses[detailGap.id] ?? "pending"}
              onAction={(id, st) => { handleAction(id, st); }}
              onBack={() => setDetailGapId(null)}
              meatNotes={meatNotesByGap[detailGap.id]}
              onMeatNoteChange={handleMeatNote}
            />
          ) : (
            <GapInbox
              gaps={GAPS}
              statuses={statuses}
              onAction={handleAction}
              onSelect={(id) => setDetailGapId(id)}
            />
          )}
        </div>

        {/* ── FOOTER ─────────────────────────────────── */}
        <DrawerFooter
          gaps={GAPS}
          statuses={statuses}
          onInsert={handleInsert}
        />
      </div>

      {/* "Insert into note" modal */}
      {showInserted && (
        <InsertedNotesModal
          gaps={GAPS}
          statuses={statuses}
          meatNotesByGap={meatNotesByGap}
          onClose={() => setShowInserted(false)}
        />
      )}
    </div>
  );
}
