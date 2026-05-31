import { Link, useNavigate } from "react-router-dom";
import API from "../api/api";

function Navbar(){
  const navigate = useNavigate();

  async function handleLogout(){
    try{
      await API.post('/api/auth/logout', {});
    } catch (e) {
      // ignore errors but continue to clear local state
    }
    localStorage.removeItem('authToken');
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userProfile');
    navigate('/login');
  }

  return(

    <nav className="navbar">

      <h2 className="logo">moveBRT</h2>

      <div className="actions">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/notifications">Notificações</Link>
        <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: 12 }}>Sair</button>
      </div>

    </nav>

  )

}

export default Navbar