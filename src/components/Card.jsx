export default function Card({ title, onClick }) {
  return (
    <div className="card" onClick={onClick} style={{ cursor: "pointer" }}>
      <h3>{title}</h3>
    </div>
  );
}
