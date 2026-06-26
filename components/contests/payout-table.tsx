import { DollarSign, Trophy } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Payout {
  id:            string;
  shares:        number;
  payout_amount: number;
  status:        string;
  profiles:      { full_name: string | null; username: string | null } | { full_name: string | null; username: string | null }[] | null;
  finding_id:    string;
}

interface Props {
  payouts:    Payout[];
  poolAmount: number;
  currency:   string;
}

export function PayoutTable({ payouts, poolAmount, currency }: Props) {
  const totalPaid = payouts.reduce((sum, p) => sum + Number(p.payout_amount), 0);

  return (
    <div className="vault-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium flex items-center gap-2">
          <Trophy className="w-4 h-4 text-vault-teal" /> Final Distribution
        </h2>
        <div className="text-right">
          <p className="text-sm font-semibold text-vault-teal">
            {formatCurrency(totalPaid, currency)} distributed
          </p>
          <p className="text-xs text-vault-muted">of {formatCurrency(poolAmount, currency)} pool</p>
        </div>
      </div>

      <div className="divide-y divide-vault-border">
        {payouts.map((p, i) => {
          const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
          const name    = profile?.full_name ?? profile?.username ?? "Anonymous";
          const pct     = poolAmount > 0 ? (Number(p.payout_amount) / poolAmount * 100).toFixed(1) : "0";

          return (
            <div key={p.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span className="w-6 text-center text-xs text-vault-muted shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{name}</p>
                <p className="text-xs text-vault-muted">{Number(p.shares).toFixed(2)} shares · {pct}% of pool</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-vault-teal flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  {formatCurrency(Number(p.payout_amount), currency)}
                </p>
                <p className={`text-[10px] font-medium capitalize ${p.status === "paid" ? "text-emerald-400" : "text-yellow-400"}`}>
                  {p.status}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {poolAmount > totalPaid + 0.01 && (
        <p className="text-xs text-vault-muted mt-3 pt-3 border-t border-vault-border">
          {formatCurrency(poolAmount - totalPaid, currency)} unallocated (info-only findings + rounding)
        </p>
      )}
    </div>
  );
}
