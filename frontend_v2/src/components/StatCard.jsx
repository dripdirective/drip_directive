export default function StatCard({ icon, label, value, note, tone = 'warm' }) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <div className="stat-card__icon">{icon}</div>
      <div>
        <p className="stat-card__label">{label}</p>
        <h3 className="stat-card__value">{value}</h3>
        {note ? <p className="stat-card__note">{note}</p> : null}
      </div>
    </article>
  );
}
