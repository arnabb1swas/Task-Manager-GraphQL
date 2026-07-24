import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { Toaster } from "@/components/ui/sonner";
import Admin from "@/pages/Admin";
import Board from "@/pages/Board";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";

const App = () => {
  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/board" element={<Board />} />
        </Route>

        <Route element={<ProtectedRoute requireAdmin />}>
          <Route path="/admin" element={<Admin />} />
        </Route>

        <Route path="/" element={<Navigate to="/board" replace />} />
        <Route path="*" element={<Navigate to="/board" replace />} />
      </Routes>
    </>
  );
};

export default App;
