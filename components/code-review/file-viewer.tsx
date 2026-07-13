"use client";

import { useEffect, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView, gutter, GutterMarker } from "@codemirror/view";
import { StateField, StateEffect, RangeSetBuilder } from "@codemirror/state";
import { Decoration, type DecorationSet } from "@codemirror/view";
import { WidgetType } from "@codemirror/view";
import { Loader2, AlertTriangle, Shield, Info, Lightbulb } from "lucide-react";

// Severity markers color maps
const SEV_COLOR: Record<string, string> = {
  critical: "text-red-400 bg-red-950/20 border-red-900/40",
  high: "text-orange-400 bg-orange-950/20 border-orange-900/40",
  medium: "text-yellow-400 bg-yellow-950/20 border-yellow-900/40",
  low: "text-blue-400 bg-blue-950/20 border-blue-900/40",
  info: "text-zinc-400 bg-zinc-800/20 border-zinc-700/40",
};

export interface FileFinding {
  line: number;
  severity: "critical" | "high" | "medium" | "low" | "info";
  message: string;
  recommendation: string;
  category: string;
}

interface FileViewerProps {
  content: string;
  path: string;
  findings: FileFinding[];
  loading?: boolean;
  onCursorMove?: (line: number) => void;
  initialLine?: number;
}

// ─── CodeMirror Custom Gutter & Widgets ──────────────────────────────────────

class FindingGutterMarker extends GutterMarker {
  constructor(readonly severity: string) {
    super();
  }
  toDOM() {
    const span = document.createElement("span");
    span.className = `flex items-center justify-center w-4 h-4 rounded text-[9px] font-bold select-none cursor-pointer uppercase ${
      this.severity === "critical"
        ? "bg-red-500/20 text-red-400 border border-red-500/30"
        : this.severity === "high"
        ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
        : this.severity === "medium"
        ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
        : this.severity === "low"
        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
        : "bg-zinc-700/20 text-zinc-400 border border-zinc-600/30"
    }`;
    span.textContent = this.severity[0].toUpperCase();
    span.title = `Click to scroll to ${this.severity} severity finding`;
    return span;
  }
}

class FindingWidget extends WidgetType {
  constructor(
    readonly message: string,
    readonly severity: string,
    readonly recommendation: string,
    readonly category: string
  ) {
    super();
  }

  toDOM() {
    const div = document.createElement("div");
    div.className = "p-3.5 my-2.5 rounded-lg border text-xs bg-vault-surface border-vault-border space-y-2 ml-12 mr-4 shadow-sm select-text";

    const header = document.createElement("div");
    header.className = "flex items-center gap-2 font-medium justify-between";

    const left = document.createElement("div");
    left.className = "flex items-center gap-1.5";

    const badge = document.createElement("span");
    badge.className = `px-1.5 py-0.5 rounded text-[9px] uppercase font-bold border ${
      this.severity === "critical"
        ? "border-red-900/50 bg-red-950/40 text-red-400"
        : this.severity === "high"
        ? "border-orange-900/50 bg-orange-950/40 text-orange-400"
        : this.severity === "medium"
        ? "border-yellow-900/50 bg-yellow-950/40 text-yellow-400"
        : this.severity === "low"
        ? "border-blue-900/50 bg-blue-950/40 text-blue-400"
        : "border-zinc-700 bg-zinc-800/40 text-zinc-400"
    }`;
    badge.textContent = this.severity;
    left.appendChild(badge);

    const categorySpan = document.createElement("span");
    categorySpan.className = "text-[10px] text-vault-muted font-mono";
    categorySpan.textContent = `[${this.category}]`;
    left.appendChild(categorySpan);

    header.appendChild(left);
    div.appendChild(header);

    const msg = document.createElement("p");
    msg.className = "text-vault-text leading-relaxed font-sans";
    msg.textContent = this.message;
    div.appendChild(msg);

    if (this.recommendation) {
      const rec = document.createElement("div");
      rec.className = "mt-2 p-2.5 rounded-lg bg-vault-teal/5 border border-vault-teal/15 text-[11px] text-vault-muted leading-relaxed font-sans flex gap-2";
      
      const lightbulb = document.createElement("div");
      lightbulb.className = "text-vault-teal shrink-0 mt-0.5";
      lightbulb.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-lightbulb"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A7 7 0 0 0 4 8c0 1.3.5 2.6 1.5 3.5.7.8 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`;
      rec.appendChild(lightbulb);

      const text = document.createElement("span");
      text.textContent = this.recommendation;
      rec.appendChild(text);

      div.appendChild(rec);
    }

    return div;
  }
}

// State effects for updating view
export const updateScanFindings = StateEffect.define<{ line: number; severity: string; message: string; recommendation: string; category: string }[]>();

// StateField managing widgets
const widgetField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(widgets, tr) {
    widgets = widgets.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(updateScanFindings)) {
        const builder = new RangeSetBuilder<Decoration>();
        const sorted = [...effect.value].sort((a, b) => a.line - b.line);
        for (const item of sorted) {
          try {
            const line = tr.state.doc.line(item.line);
            builder.add(
              line.to,
              line.to,
              Decoration.widget({
                widget: new FindingWidget(item.message, item.severity, item.recommendation, item.category),
                side: 1,
                block: true,
              })
            );
          } catch (e) {
            // line out of bounds (can happen if scan line counts don't align perfectly with live files)
          }
        }
        widgets = builder.finish();
      }
    }
    return widgets;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// StateField managing line highlighting
const lineHighlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(highlights, tr) {
    highlights = highlights.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(updateScanFindings)) {
        const builder = new RangeSetBuilder<Decoration>();
        const sorted = [...effect.value].sort((a, b) => a.line - b.line);
        for (const item of sorted) {
          try {
            const line = tr.state.doc.line(item.line);
            builder.add(
              line.from,
              line.from,
              Decoration.line({
                attributes: {
                  class: `bg-vault-${item.severity}/5 border-l-2 border-vault-${item.severity}`,
                },
              })
            );
          } catch (e) {
            // line out of bounds
          }
        }
        highlights = builder.finish();
      }
    }
    return highlights;
  },
  provide: (f) => EditorView.decorations.from(f),
});

export function FileViewer({
  content,
  path,
  findings,
  loading = false,
  onCursorMove,
  initialLine = 1,
}: FileViewerProps) {
  const editorRef = useRef<any>(null);
  const [showFindingsInline, setShowFindingsInline] = useState(true);

  // Sync findings whenever they change or toggled
  useEffect(() => {
    const view = editorRef.current?.view;
    if (!view) return;

    if (showFindingsInline) {
      view.dispatch({
        effects: updateScanFindings.of(
          findings.map((f) => ({
            line: f.line,
            severity: f.severity,
            message: f.message,
            recommendation: f.recommendation,
            category: f.category,
          }))
        ),
      });
    } else {
      view.dispatch({
        effects: updateScanFindings.of([]),
      });
    }
  }, [findings, showFindingsInline, content]);

  // Scroll to initialLine when loaded
  useEffect(() => {
    const view = editorRef.current?.view;
    if (view && initialLine > 1) {
      setTimeout(() => {
        try {
          const line = view.state.doc.line(initialLine);
          view.dispatch({
            selection: { anchor: line.from },
            scrollIntoView: true,
          });
        } catch (e) {
          // ignore out of bounds
        }
      }, 100);
    }
  }, [initialLine, content]);

  // Create custom findings gutter
  const findingsGutter = gutter({
    lineMarker: (view, line) => {
      const lineNum = view.state.doc.lineAt(line.from).number;
      const match = findings.find((f) => f.line === lineNum);
      return match ? new FindingGutterMarker(match.severity) : null;
    },
    initialSpacer: () => new FindingGutterMarker("info"),
    domEventHandlers: {
      click: (view, line) => {
        const lineNum = view.state.doc.lineAt(line.from).number;
        onCursorMove?.(lineNum);
        return true;
      },
    },
  });

  const extensions = [
    EditorView.editable.of(false),
    EditorView.theme({
      "&": { height: "100%", fontSize: "13px" },
      ".cm-gutters": { backgroundColor: "#09090b", borderRight: "1px solid #1f1f23" },
      ".cm-line": { paddingLeft: "10px" },
      ".cm-activeLine": { backgroundColor: "rgba(255,255,255,0.02)" },
    }),
    findingsGutter,
    widgetField,
    lineHighlightField,
  ];

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-vault-surface border border-vault-border rounded-xl">
        <Loader2 className="w-8 h-8 text-vault-teal animate-spin mb-2" />
        <span className="text-xs text-vault-muted">Fetching file content...</span>
      </div>
    );
  }

  if (!content && !loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-vault-surface border border-vault-border rounded-xl text-center p-6">
        <AlertTriangle className="w-8 h-8 text-vault-muted mb-2 opacity-50" />
        <p className="text-sm font-medium mb-1">No file selected</p>
        <p className="text-xs text-vault-muted">Select a file from the repository tree to review findings inline</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-vault-surface border border-vault-border rounded-xl overflow-hidden">
      {/* Header toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-vault-border bg-vault-surface shrink-0">
        <span className="text-xs font-mono text-vault-subtle truncate">{path}</span>
        <button
          onClick={() => setShowFindingsInline(!showFindingsInline)}
          className={`text-[10px] px-2 py-1 rounded border transition-colors flex items-center gap-1 ${
            showFindingsInline
              ? "bg-vault-teal/10 border-vault-teal/30 text-vault-teal"
              : "border-vault-border text-vault-muted hover:text-vault-text"
          }`}
        >
          {showFindingsInline ? (
            <><Shield className="w-3 h-3" /> Hide Inline Findings</>
          ) : (
            <><AlertTriangle className="w-3 h-3" /> Show Inline Findings</>
          )}
        </button>
      </div>

      {/* Editor container */}
      <div className="flex-1 min-h-0 overflow-auto">
        <CodeMirror
          ref={editorRef}
          value={content}
          theme="dark"
          readOnly
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true,
            foldGutter: true,
          }}
          extensions={extensions}
          onUpdate={(update) => {
            if (update.selectionSet) {
              const pos = update.state.selection.main.head;
              const line = update.state.doc.lineAt(pos).number;
              onCursorMove?.(line);
            }
          }}
        />
      </div>
    </div>
  );
}
