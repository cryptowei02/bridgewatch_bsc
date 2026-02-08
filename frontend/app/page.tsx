import StatsCards from "@/components/StatsCards";
import TransactionList from "@/components/TransactionList";
import AlertBanner from "@/components/AlertBanner";
import NetworkStatus from "@/components/NetworkStatus";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time opBNB Bridge monitoring</p>
        </div>
        <NetworkStatus />
      </div>

      <AlertBanner />
      <StatsCards />

      <div>
        <h2 className="text-lg font-semibold mb-3">Recent Transactions</h2>
        <TransactionList />
      </div>
    </div>
  );
}
