"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getTransactions, type Transaction } from "@/lib/api";
import { shortenAddress, shortenTxHash, formatAmount, timeAgo, statusColor, statusBg } from "@/lib/utils";

export default function TransactionList() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTransactions(25)
      .then((data) => setTxs(data.transactions))
      .catch(console.error)
      .finally(() => setLoading(false));

    const interval = setInterval(() => {
      getTransactions(25)
        .then((data) => setTxs(data.transactions))
        .catch(console.error);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-4 animate-pulse h-20" />
        ))}
      </div>
    );
  }

  if (txs.length === 0) {
    return (
      <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-8 text-center text-gray-500">
        No transactions found. Run <code className="text-[#f0b90b]">npm run seed</code> to add test data.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {txs.map((tx) => (
        <Link
          key={tx.id}
          href={`/receipt/${tx.tx_hash}`}
          className="block bg-[#111118] border border-[#1e1e2e] rounded-xl p-4 hover:border-[#f0b90b]/30 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`px-2 py-1 rounded-md border text-xs font-mono ${statusBg(tx.status)}`}>
                <span className={statusColor(tx.status)}>{tx.status}</span>
              </div>
              <div>
                <p className="font-mono text-sm">{shortenTxHash(tx.tx_hash)}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {shortenAddress(tx.from_address)} → {shortenAddress(tx.to_address)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-[#f0b90b]">{formatAmount(tx.amount)} BNB</p>
              <p className="text-xs text-gray-500 mt-0.5">{tx.bridge_direction} · {timeAgo(tx.timestamp)}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
