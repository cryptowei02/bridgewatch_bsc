"use client";

import { useEffect, useState } from "react";
import { getStats, getVolume, type Stats, type VolumeData } from "@/lib/api";
import { formatAmount } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const COLORS = ["#22c55e", "#eab308", "#ef4444"];

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [volume, setVolume] = useState<VolumeData[]>([]);
  const [timeframe, setTimeframe] = useState("7d");

  useEffect(() => {
    getStats().then(setStats).catch(console.error);
  }, []);

  useEffect(() => {
    getVolume(timeframe)
      .then((data) => setVolume(data.data))
      .catch(console.error);
  }, [timeframe]);

  const pieData = stats
    ? [
        { name: "Completed", value: stats.completedTransactions },
        { name: "Pending", value: stats.totalTransactions - stats.completedTransactions - stats.failedTransactions },
        { name: "Failed", value: stats.failedTransactions },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Bridge volume and performance metrics</p>
      </div>

      {/* Stats summary */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-5">
            <p className="text-sm text-gray-500">Total Bridges</p>
            <p className="text-2xl font-bold mt-1">{stats.totalTransactions}</p>
          </div>
          <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-5">
            <p className="text-sm text-gray-500">Success Rate</p>
            <p className="text-2xl font-bold mt-1 text-green-400">{stats.successRate}%</p>
          </div>
          <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-5">
            <p className="text-sm text-gray-500">Failed</p>
            <p className="text-2xl font-bold mt-1 text-red-400">{stats.failedTransactions}</p>
          </div>
          <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-5">
            <p className="text-sm text-gray-500">Avg Amount</p>
            <p className="text-2xl font-bold mt-1 text-[#f0b90b]">{formatAmount(stats.averageAmount)} BNB</p>
          </div>
        </div>
      )}

      {/* Volume chart */}
      <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Bridge Volume</h2>
          <div className="flex gap-2">
            {["24h", "7d", "30d"].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  timeframe === tf
                    ? "bg-[#f0b90b] text-black"
                    : "bg-[#1e1e2e] text-gray-400 hover:text-white"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
        {volume.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={volume}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
              <XAxis
                dataKey="period"
                tick={{ fill: "#6b7280", fontSize: 12 }}
                tickFormatter={(v: string) => v.slice(-5)}
              />
              <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: "8px" }}
                labelStyle={{ color: "#9ca3af" }}
              />
              <Bar dataKey="count" fill="#f0b90b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            No volume data for this timeframe
          </div>
        )}
      </div>

      {/* Status distribution */}
      {pieData.length > 0 && (
        <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Status Distribution</h2>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }: {name?: string; percent?: number}) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
