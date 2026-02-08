"use client";

import { useEffect, useState } from "react";
import { getHealth } from "@/lib/api";

export default function NetworkStatus() {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () =>
      getHealth()
        .then(() => setOnline(true))
        .catch(() => setOnline(false));
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`w-2 h-2 rounded-full ${
          online === null ? "bg-gray-500" : online ? "bg-green-400" : "bg-red-400"
        }`}
      />
      <span className="text-gray-400">
        API: {online === null ? "Checking..." : online ? "Online" : "Offline"}
      </span>
    </div>
  );
}
