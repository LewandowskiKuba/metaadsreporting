import React from 'react';

const colorClasses = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-100' },
  green:  { bg: 'bg-green-50',  text: 'text-green-600',  border: 'border-green-100' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
  red:    { bg: 'bg-red-50',    text: 'text-red-600',    border: 'border-red-100' },
};

export default function MetricCard({ label, value, icon, color = 'blue', subValue }) {
  const c = colorClasses[color] || colorClasses.blue;

  return (
    <div className="metric-card flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${c.bg}`}>
          {icon}
        </span>
        <span className="text-xs text-gray-500 font-medium leading-tight">{label}</span>
      </div>
      <div className="text-xl font-bold text-gray-900 truncate">{value}</div>
      {subValue && (
        <div className="text-xs text-gray-400">{subValue}</div>
      )}
    </div>
  );
}
