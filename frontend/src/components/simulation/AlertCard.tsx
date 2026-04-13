import { useMemo, useState } from "react";
import { AlertTriangle, ChevronRight, ChevronUp, Lightbulb } from "lucide-react";
import { DailySimulationResult, SimulationAlert } from "@/lib/types";

interface OverlayAlert {
  id: string;
  type: "warning" | "info" | "success" | "error";
  message: string;
}

interface AlertCardProps {
  dayResult: DailySimulationResult | null;
  overlayAlerts: OverlayAlert[];
}

function severityClass(severity: string): string {
  switch (severity) {
    case "Critical":
    case "Severe":
      return "text-red-700 bg-red-100 border-red-200";
    case "Moderate":
      return "text-amber-700 bg-amber-100 border-amber-200";
    case "Low":
      return "text-blue-700 bg-blue-100 border-blue-200";
    default:
      return "text-emerald-700 bg-emerald-100 border-emerald-200";
  }
}

function firstSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^.*?[.!?](\s|$)/);
  return match ? match[0].trim() : trimmed;
}

export function AlertCard({ dayResult, overlayAlerts }: AlertCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showOtherActions, setShowOtherActions] = useState(false);

  const primary = dayResult?.primary_limiting_factor;
  const primaryAlert = primary && "rule_id" in primary ? (primary as SimulationAlert) : null;
  const level2 = dayResult?.level2_warnings ?? [];
  const bestActionRaw = dayResult?.best_available_action;
  const bestAction = bestActionRaw && "rule_id" in bestActionRaw ? (bestActionRaw as SimulationAlert) : null;
  const otherActions = dayResult?.other_actions ?? [];
  const additionalAlerts = useMemo(() => {
    const level2Additional = level2.filter((a) => !primaryAlert || a.rule_id !== primaryAlert.rule_id);
    return [...level2Additional];
  }, [level2, primaryAlert]);

  const extraCount = additionalAlerts.length + otherActions.length + overlayAlerts.length;
  const hasDetails = Boolean(primaryAlert || bestAction || additionalAlerts.length || otherActions.length || overlayAlerts.length);
  const noActiveAlerts = !hasDetails;

  return (
    <div
      className="rounded-xl border-2 border-alert-border bg-alert-bg p-5 animate-fade-in h-[340px] md:h-[380px] grid grid-rows-[auto,1fr,auto]"
      style={{ animationDelay: "0.3s" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="w-10 h-10 rounded-xl bg-alert-border/20 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-alert-border" />
        </div>
        <div className="flex-1">
          <h3 className="font-poppins font-semibold text-alert-text flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Expert System Alert
          </h3>
          {noActiveAlerts && (
            <p className="mt-2 text-sm text-alert-text/80">
              No Active Alerts
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 overflow-y-auto pr-1 space-y-4">
        {!expanded && hasDetails && (
          <div className="space-y-4">
            {primaryAlert && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-alert-text/70">Primary Limiting Factor</p>
                <p className="text-base text-alert-text leading-relaxed">{firstSentence(primaryAlert.message)}</p>
              </div>
            )}

            {bestAction && (
              <div className="space-y-1 mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-alert-text/70">Best Available Action</p>
                <p className="text-base text-alert-text leading-relaxed">{firstSentence(bestAction.message)}</p>
              </div>
            )}
          </div>
        )}

        {expanded && primaryAlert && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-alert-text/70">Primary Limiting Factor</p>
            <div className={`mt-2 rounded-md border px-3 py-2 text-sm leading-relaxed ${severityClass(primaryAlert.severity)}`}>
              {primaryAlert.message}
            </div>
          </div>
        )}

        {expanded && bestAction && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-alert-text/70">Best Available Action</p>
            <div className={`mt-2 rounded-md border px-3 py-2 text-sm ${severityClass(bestAction.severity)}`}>
              <p className="text-alert-text/90 leading-relaxed">{bestAction.message}</p>
            </div>
          </div>
        )}

        {expanded && otherActions.length > 0 && (
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-alert-text/70">
                Other Actions ({otherActions.length})
              </p>
              <button
                type="button"
                onClick={() => setShowOtherActions((v) => !v)}
                className="text-xs font-medium text-rain hover:text-rain/80 flex items-center gap-1 transition-colors"
              >
                {showOtherActions ? "Collapse" : "Expand"}
                {showOtherActions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>
            {showOtherActions && (
              <div className="mt-2 space-y-2">
                {otherActions.map((a) => (
                  <div key={a.rule_id} className={`rounded-md border px-3 py-2 text-sm ${severityClass(a.severity)}`}>
                    {a.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {expanded && additionalAlerts.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-alert-text/70">Additional Alerts</p>
            <div className="mt-2 space-y-2">
              {additionalAlerts.map((a) => (
                <div key={a.rule_id} className={`rounded-md border px-3 py-2 text-sm ${severityClass(a.severity)}`}>
                  {a.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {expanded && overlayAlerts.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-alert-text/70">User Actions</p>
            <div className="mt-2 space-y-2">
              {overlayAlerts.map((a) => (
                <div key={a.id} className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                  {a.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {hasDetails && (
        <div className="pt-3 mt-3 border-t border-alert-border/30 flex items-center justify-between">
          <p className="text-sm text-alert-text/70">
            {!expanded && extraCount > 0 ? `+${extraCount} more alert${extraCount > 1 ? "s" : ""}` : ""}
          </p>
          {expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="text-sm font-medium text-rain hover:text-rain/80 flex items-center gap-1 transition-colors"
            >
              Hide details
              <ChevronUp className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="text-sm font-medium text-rain hover:text-rain/80 flex items-center gap-1 transition-colors"
            >
              View details
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
