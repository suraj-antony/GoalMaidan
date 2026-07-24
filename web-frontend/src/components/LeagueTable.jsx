import { useTranslation } from 'react-i18next';

export default function LeagueTable({ tableData }) {
  const { t } = useTranslation();

  if (!tableData || tableData.length === 0) {
    return <div className="text-center py-8 text-[var(--txt2)]">No table data available</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg shadow-sm border border-[var(--border)]">
      <table className="w-full text-left text-sm text-[var(--txt)] bg-[var(--card)]">
        <thead className="text-xs uppercase bg-[var(--bg2)] border-b border-[var(--border)]">
          <tr>
            <th scope="col" className="px-4 py-3">#</th>
            <th scope="col" className="px-4 py-3 font-semibold">Team</th>
            <th scope="col" className="px-3 py-3 text-center" title="Played">P</th>
            <th scope="col" className="px-3 py-3 text-center" title="Won">W</th>
            <th scope="col" className="px-3 py-3 text-center" title="Drawn">D</th>
            <th scope="col" className="px-3 py-3 text-center" title="Lost">L</th>
            <th scope="col" className="px-3 py-3 text-center hidden sm:table-cell" title="Goals For">GF</th>
            <th scope="col" className="px-3 py-3 text-center hidden sm:table-cell" title="Goals Against">GA</th>
            <th scope="col" className="px-3 py-3 text-center" title="Goal Difference">GD</th>
            <th scope="col" className="px-4 py-3 text-center font-bold text-primary-500" title="Points">Pts</th>
          </tr>
        </thead>
        <tbody>
          {tableData.map((row, index) => (
            <tr 
              key={row.id} 
              className={`border-b border-[var(--border)] hover:bg-[var(--bg2)] transition-colors ${index < 4 ? 'bg-primary-50/20' : ''}`}
            >
              <td className="px-4 py-3 font-medium">{index + 1}</td>
              <td className="px-4 py-3 font-semibold">{row.team_name}</td>
              <td className="px-3 py-3 text-center">{row.played}</td>
              <td className="px-3 py-3 text-center text-green-600">{row.won}</td>
              <td className="px-3 py-3 text-center text-gray-500">{row.drawn}</td>
              <td className="px-3 py-3 text-center text-red-500">{row.lost}</td>
              <td className="px-3 py-3 text-center hidden sm:table-cell">{row.goals_for}</td>
              <td className="px-3 py-3 text-center hidden sm:table-cell">{row.goals_against}</td>
              <td className="px-3 py-3 text-center font-medium">
                <span className={row.goal_difference > 0 ? 'text-green-600' : row.goal_difference < 0 ? 'text-red-500' : ''}>
                  {row.goal_difference > 0 ? '+' : ''}{row.goal_difference}
                </span>
              </td>
              <td className="px-4 py-3 text-center font-bold text-primary-600 text-base">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
