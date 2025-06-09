import { useState } from "react";
import { auth, googleProvider } from "../firebase/config";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";


export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const login = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Logged in successfully!");
      navigate("/");
    } catch (error) {
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        toast.error("Invalid email or password");
      } else {
        toast.error(error.message);
      }
    }
  };

  const googleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success("Google login successful!");
      navigate("/");
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-900 text-white">
      <form className="flex flex-col bg-gray-800 p-8 rounded-xl space-y-4 w-96 shadow-lg" onSubmit={login}>
        <h2 className="text-3xl font-semibold text-center">Login</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="p-3 rounded bg-gray-700 placeholder-gray-400 text-white"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="p-3 rounded bg-gray-700 placeholder-gray-400 text-white"
          required
        />
        <button className="bg-blue-600 hover:bg-blue-700 rounded p-3">Login</button>
        <button
          type="button"
          onClick={googleLogin}
          className="bg-red-600 hover:bg-red-700 rounded p-3 flex items-center justify-center space-x-3"
        >
        
          <span>Sign in with Google</span>
        </button>
        <p className="mt-4 text-sm text-center">
          Don't have an account?{" "}
          <Link to="/signup" className="text-blue-400 underline">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
