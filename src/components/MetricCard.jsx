import { TrendingUp, TrendingDown } from 'lucide-react';

export function MetricCard({ name, value, unit, trend, trendValue }) {
  return (
    <div className="bg-[#f5f5f5] rounded-[12px] p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-sm text-gray-600 mb-2 font-medium">{name}</div>
      <div className="flex items-end justify-between">
        <div>
          <span className="text-2xl font-semibold text-gray-900">{value}</span>
          {unit && <span className="text-sm text-gray-600 ml-1">{unit}</span>}
        </div>
        {trendValue && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>{trendValue}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Legacy default export for backward compatibility
export default MetricCard;
