import { differenceInHours } from "date-fns";
import { contentCards, officePresence } from "@/lib/mock-data";
import { Badge, Panel } from "@/components/ui/primitives";

const WIP_LIMIT = 4;

export function FlowAlertsPanel() {
  const activeWip = contentCards.filter((card) => card.stage !== "Published").length;
  const overWip = activeWip > WIP_LIMIT;

  const blocked = officePresence.filter((person) => person.state === "blocked" && person.blockedSince);
  const blockedOver24h = blocked.filter((person) => differenceInHours(new Date(), new Date(person.blockedSince!)) >= 24);

  return (
    <Panel>
      <h3 className="mb-3 text-lg font-semibold">Flow Alerts</h3>
      <div className="space-y-3">
        <div className="rounded-lg bg-slate-800 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-medium">WIP limit check</p>
            <Badge tone={overWip ? "danger" : "success"}>{activeWip}/{WIP_LIMIT}</Badge>
          </div>
          <p className="text-xs text-slate-400">
            {overWip ? "Too many cards in flight. Pause intake and close one card first." : "Within WIP limit. Keep pull-based flow."}
          </p>
        </div>

        <div className="rounded-lg bg-slate-800 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-medium">Blocked over 24h</p>
            <Badge tone={blockedOver24h.length ? "danger" : "success"}>{blockedOver24h.length}</Badge>
          </div>
          <p className="text-xs text-slate-400">
            {blockedOver24h.length
              ? `${blockedOver24h.map((p) => p.agentName).join(", ")} need unblock escalation today.`
              : "No long-running blockers detected."}
          </p>
        </div>
      </div>
    </Panel>
  );
}
