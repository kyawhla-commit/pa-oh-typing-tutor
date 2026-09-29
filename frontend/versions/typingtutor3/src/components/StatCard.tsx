interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'blue' | 'green' | 'purple' | 'amber';
  icon?: string;
}

const accentMap = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  purple: 'bg-violet-50 text-violet-600',
  amber: 'bg-amber-50 text-amber-600',
};

export default function StatCard({ label, value, sub, accent = 'blue', icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <span className="text-slate-500 text-sm font-medium">{label}</span>
        {icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${accentMap[accent]}`}>
            {icon}
          </div>
        )}
      </div>
      <p className="text-3xl font-semibold text-slate-900 tracking-tight">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}
