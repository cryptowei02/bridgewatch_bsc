"use client";

import { useEffect, useState } from "react";
import { getStats, type Stats } from "@/lib/api";
import { formatAmount } from "@/lib/utils";

export default function StatsCards() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    getStats().then(setStats).catch(console.error);
    const interval = setInterval(() => {
      getStats().then(setStats).catch(console.error);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-5 animate-pulse h-24" />
        ))}
      </div>
    );
  }

  const cards = [
    { label: "Total Bridges", value: stats.totalTransactions.toLocaleString(), color: "text-white" },
    { label: "Success Rate", value: `${stats.successRate}%`, color: parseFloat(stats.successRate) > 90 ? "text-green-400" : "text-yellow-400" },
    { label: "Completed", value: stats.completedTransactions.toLocaleString(), color: "text-green-400" },
    { label: "Avg Amount", value: `${formatAmount(stats.averageAmount)} BNB`, color: "text-[#f0b90b]" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-5">
          <p className="text-sm text-gray-500">{card.label}</p>
          <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
