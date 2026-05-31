import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";

import Dashboard from "./pages/Dashboard";
import Tickets from "./pages/Tickets";
import Wallet from "./pages/Wallet";
import Login from "./pages/Login";
import Register from "./pages/Register";

import ProtectedRoute from "./components/ProtectedRoute";

import "./styles/style.css";

import Realtime from "./pages/Realtime";
import Validation from "./pages/Validation";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import Tarifas from "./pages/AdminPricing";

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        {/* Página inicial = Login */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        {/* Página de registo */}
        <Route path="/register" element={<Register />} />

        {/* Rotas protegidas */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tickets"
          element={
            <ProtectedRoute>
              <Tickets />
            </ProtectedRoute>
          }
        />

        <Route
          path="/wallet"
          element={
            <ProtectedRoute>
              <Wallet />
            </ProtectedRoute>
          }
        />
        <Route
          path="/realtime"
          element={
            <ProtectedRoute>
              <Realtime />
            </ProtectedRoute>
          }
        />
        <Route path="/realtime-public" element={<Realtime />} />
        <Route
          path="/validation"
          element={
            <ProtectedRoute>
              <Validation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tarifas"
          element={
            <ProtectedRoute>
              <Tarifas />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
