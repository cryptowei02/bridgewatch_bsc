"use client";

import { useEffect, useState } from "react";
import { getInsights, getAlerts, type Alert, type AnomalyResult, type DelayResult, type OptimalTimeResult } from "@/lib/api";
import { severityColor, timeAgo } from "@/lib/utils";

export default function InsightsPage() {
  const [anomalies, setAnomalies] = useState<AnomalyResult | null>(null);
  const [delay, setDelay] = useState<DelayResult | null>(null);
  const [optimalTime, setOptimalTime] = useState<OptimalTimeResult | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getInsights().then((data) => {
        setAnomalies(data.anomalies);
        setDelay(data.delay);
        setOptimalTime(data.optimalTime);
      }),
      getAlerts(20).then((data) => setAlerts(data.alerts)),
    ])
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">AI Insights</h1>
          <p className="text-sm text-gray-500 mt-1">Powered by Claude AI</p>
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-6 animate-pulse h-40" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Insights</h1>
        <p className="text-sm text-gray-500 mt-1">Powered by Claude AI</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Anomaly Detection */}
        <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-6">
          <h3 className="text-sm text-gray-500 mb-3">Anomaly Detection</h3>
          {anomalies ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${anomalies.anomalyDetected ? "bg-red-400" : "bg-green-400"}`} />
                <span className={`text-sm font-medium ${anomalies.anomalyDetected ? "text-red-400" : "text-green-400"}`}>
                  {anomalies.anomalyDetected ? "Anomaly Detected" : "All Clear"}
                </span>
              </div>
              <p className="text-sm text-gray-400">{anomalies.description}</p>
              {anomalies.recommendation && (
                <p className="text-xs text-gray-500 mt-2">{anomalies.recommendation}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">No analysis available</p>
          )}
        </div>

        {/* Delay Prediction */}
        <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-6">
          <h3 className="text-sm text-gray-500 mb-3">Delay Prediction</h3>
          {delay ? (
            <>
              <p className="text-3xl font-bold text-[#f0b90b]">{delay.estimatedMinutes} min</p>
              <p className="text-xs text-gray-500 mt-1">Confidence: {delay.confidence}</p>
              <p className="text-sm text-gray-400 mt-2">{delay.reasoning}</p>
            </>
          ) : (
            <p className="text-sm text-gray-500">No prediction available</p>
          )}
        </div>

        {/* Optimal Time */}
        <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-6">
          <h3 className="text-sm text-gray-500 mb-3">Optimal Bridge Time</h3>
          {optimalTime ? (
            <>
              <p className="text-lg font-semibold text-[#f0b90b]">{optimalTime.bestTimeWindow}</p>
              <p className="text-sm text-gray-400 mt-2">{optimalTime.suggestion}</p>
              <p className="text-xs text-gray-500 mt-2">{optimalTime.reasoning}</p>
            </>
          ) : (
            <p className="text-sm text-gray-500">No suggestion available</p>
          )}
        </div>
      </div>

      {/* Alert History */}
      <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Alert History</h2>
        {alerts.length > 0 ? (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-start justify-between border-b border-[#1e1e2e] pb-3 last:border-0">
                <div className="flex items-start gap-3">
                  <span className={`text-xs font-bold uppercase mt-0.5 ${severityColor(alert.severity)}`}>
                    {alert.severity}
                  </span>
                  <div>
                    <p className="text-sm">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{alert.alert_type}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap ml-4">{timeAgo(alert.created_at)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No alerts yet</p>
        )}
      </div>
    </div>
  );
}
