// Componente de logotipo minimalista para TUB
export default function Logo({ style }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 18, ...style
    }}>
      <div style={{ fontWeight: 700, fontSize: 32, letterSpacing: 1, fontFamily: 'Inter, Arial, sans-serif', color: '#23243a', lineHeight: 1 }}>
        <span style={{ color: '#e53935' }}>T</span>
        <span style={{ color: '#3b6eea' }}>U</span>
        <span style={{ color: '#3b6eea' }}>B</span>
      </div>
    </div>
  );
}
