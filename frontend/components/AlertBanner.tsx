"use client";

import { useEffect, useState } from "react";
import { getAlerts, type Alert } from "@/lib/api";
import { severityColor, timeAgo } from "@/lib/utils";

export default function AlertBanner() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    getAlerts(5)
      .then((data) => setAlerts(data.alerts))
      .catch(console.error);
  }, []);

  if (alerts.length === 0) return null;

  const latestAlert = alerts[0];
  const severityBorder: Record<string, string> = {
    high: "border-red-500/40 bg-red-500/5",
    medium: "border-yellow-500/40 bg-yellow-500/5",
    low: "border-green-500/40 bg-green-500/5",
  };

  return (
    <div className={`border rounded-xl p-4 ${severityBorder[latestAlert.severity] || "border-gray-500/40 bg-gray-500/5"}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold uppercase ${severityColor(latestAlert.severity)}`}>
            {latestAlert.severity}
          </span>
          <p className="text-sm">{latestAlert.message}</p>
        </div>
        <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
          {timeAgo(latestAlert.created_at)}
        </span>
      </div>
      {alerts.length > 1 && (
        <p className="text-xs text-gray-500 mt-2">
          +{alerts.length - 1} more alert{alerts.length > 2 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
