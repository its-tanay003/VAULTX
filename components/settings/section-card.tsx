import { cn } from "@/lib/utils";

interface SectionCardProps {
  title:       string;
  description?: string;
  children:    React.ReactNode;
  className?:  string;
  danger?:     boolean;
}

export function SectionCard({ title, description, children, className, danger }: SectionCardProps) {
  return (
    <div
      className={cn(
        "vault-card overflow-hidden",
        danger && "border-red-500/30",
        className
      )}
    >
      <div className={cn(
        "px-5 py-4 border-b border-vault-border",
        danger && "border-red-500/20 bg-red-500/5"
      )}>
        <h2 className={cn("text-sm font-semibold", danger && "text-red-400")}>{title}</h2>
        {description && (
          <p className="text-xs text-vault-muted mt-0.5">{description}</p>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function FieldRow({
  label,
  description,
  children,
}: {
  label:        string;
  description?: string;
  children:     React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0 border-b border-vault-border/50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-vault-muted mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SettingsToggle({
  checked,
  onChange,
  disabled,
}: {
  checked:   boolean;
  onChange:  (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked ? "true" : "false"}
      aria-label={checked ? "Enabled" : "Disabled"}
      title={checked ? "Enabled" : "Disabled"}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
        "transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-vault-teal/50",
        checked ? "bg-vault-teal" : "bg-vault-border",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow",
          "ring-0 transition duration-200",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );
}
