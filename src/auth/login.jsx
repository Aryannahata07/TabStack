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
        <button className= "mt-4 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer">Login</button>
        <button
          type="button"
          onClick={googleLogin}
          className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
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
