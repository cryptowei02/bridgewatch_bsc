"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getReceipt, type Transaction } from "@/lib/api";
import { shortenAddress, formatAmount, formatTimestamp, bscscanTx, bscscanAddress } from "@/lib/utils";

export default function ReceiptPage() {
  const params = useParams();
  const txHash = params.txHash as string;
  const [tx, setTx] = useState<Transaction | null>(null);
  const [attestationHash, setAttestationHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    if (!txHash) return;
    setLoading(true);
    getReceipt(txHash)
      .then((data) => {
        setTx(data.transaction);
        setAttestationHash(data.attestationTxHash);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [txHash]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-6 animate-pulse h-64" />
      </div>
    );
  }

  if (error || !tx) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Receipt Lookup</h1>
          <p className="text-sm text-gray-500 mt-1">Search by transaction hash</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter transaction hash (0x...)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 bg-[#111118] border border-[#1e1e2e] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-[#f0b90b]/50"
          />
          <Link
            href={`/receipt/${searchInput}`}
            className="bg-[#f0b90b] text-black px-6 py-3 rounded-xl text-sm font-medium hover:bg-[#f0b90b]/90 transition-colors"
          >
            Search
          </Link>
        </div>
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
            Transaction not found: {txHash}
          </div>
        )}
      </div>
    );
  }

  const rows = [
    { label: "Transaction Hash", value: tx.tx_hash, link: bscscanTx(tx.tx_hash), mono: true },
    { label: "Status", value: tx.status, status: true },
    { label: "Event Type", value: tx.event_type },
    { label: "Direction", value: tx.bridge_direction },
    { label: "From", value: tx.from_address, link: bscscanAddress(tx.from_address), mono: true },
    { label: "To", value: tx.to_address, link: bscscanAddress(tx.to_address), mono: true },
    { label: "Amount", value: `${formatAmount(tx.amount)} BNB`, highlight: true },
    { label: "Block Number", value: tx.block_number.toLocaleString() },
    { label: "Timestamp", value: formatTimestamp(tx.timestamp) },
    ...(attestationHash
      ? [{ label: "Attestation TX", value: attestationHash, link: bscscanTx(attestationHash), mono: true }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/" className="text-gray-500 hover:text-white transition-colors">&larr; Back</Link>
        <div>
          <h1 className="text-2xl font-bold">Transaction Receipt</h1>
          <p className="text-sm text-gray-500 mt-1 font-mono">{shortenAddress(tx.tx_hash)}</p>
        </div>
      </div>

      <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl divide-y divide-[#1e1e2e]">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between px-6 py-4">
            <span className="text-sm text-gray-500">{row.label}</span>
            <span className={`text-sm ${row.mono ? "font-mono" : ""} ${row.highlight ? "text-[#f0b90b] font-medium" : ""}`}>
              {row.link ? (
                <a href={row.link} target="_blank" rel="noopener noreferrer" className="hover:text-[#f0b90b] transition-colors">
                  {row.mono ? shortenAddress(row.value as string) : row.value as string}
                </a>
              ) : row.status ? (
                <span className={
                  row.value === "completed" ? "text-green-400" :
                  row.value === "pending" ? "text-yellow-400" : "text-red-400"
                }>
                  {row.value as string}
                </span>
              ) : (
                row.value as string
              )}
            </span>
          </div>
        ))}
      </div>

      {attestationHash && (
        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
          <p className="text-green-400 text-sm font-medium">On-chain attestation verified</p>
          <p className="text-xs text-gray-500 mt-1">
            This transaction has a verifiable receipt stored on BSC.
          </p>
        </div>
      )}
    </div>
  );
}
