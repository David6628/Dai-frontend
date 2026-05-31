import Card from "../components/Card";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="container">
      <h1>Dashboard</h1>
      <Logo />

      <div className="cards">
        <Card title="Comprar Bilhete" onClick={() => navigate("/tickets")} />
        <Card title="Carteira" onClick={() => navigate("/wallet")} />
        <Card title="Consulta de Horários" onClick={() => navigate("/realtime")} />
        <Card title="Validar Bilhete" onClick={() => navigate("/validation")} />
        
        <Card title="Tarifas e Descontos" onClick={() => navigate("/tarifas")} />
      </div>
    </div>
  );
}
