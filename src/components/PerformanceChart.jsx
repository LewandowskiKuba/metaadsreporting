import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function PerformanceChart({ data = [] }) {
  const chartData = data.map(d => ({
    date: d.date?.slice(5) || d.date_start?.slice(5),
    wydatki: Math.round(parseFloat(d.spend) || 0),
    wyswietlenia: parseInt(d.impressions) || 0,
    klikniecia: parseInt(d.clicks) || 0,
  }));

  return (
    <div className="w-full h-[440px]">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Wydajność w czasie</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
          <XAxis dataKey="date" stroke="rgba(0,0,0,0.6)" tick={{ fill: 'rgba(0,0,0,0.6)' }} />
          <YAxis yAxisId="left" stroke="rgba(0,0,0,0.6)" tick={{ fill: 'rgba(0,0,0,0.6)' }} />
          <YAxis yAxisId="right" orientation="right" stroke="rgba(0,0,0,0.6)" tick={{ fill: 'rgba(0,0,0,0.6)' }} />
          <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px' }} />
          <Legend verticalAlign="bottom" wrapperStyle={{ color: 'rgba(0,0,0,0.8)', paddingTop: '20px' }} />
          <Line yAxisId="left" type="monotone" dataKey="wydatki" stroke="#ab1dfe" strokeWidth={2} dot={false} name="Wydatki (PLN)" />
          <Line yAxisId="right" type="monotone" dataKey="wyswietlenia" stroke="#34e2e4" strokeWidth={2} dot={false} name="Wyświetlenia" />
          <Line yAxisId="right" type="monotone" dataKey="klikniecia" stroke="#4721fb" strokeWidth={2} dot={false} name="Kliknięcia" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
