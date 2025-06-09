import { Routes, Route } from "react-router-dom";
import Login from "./auth/login";
import SignUp from "./auth/signup";
import Dashboard from "./pages/dashboard";
import PrivateRoute from "./routes/PrivateRoutes";

export default function App() {
  return (
    
      <Routes>
        
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        
        <Route element={<PrivateRoute />}>
          <Route path="/" element={<Dashboard />} />
        </Route>
      </Routes>
    
  );
}
