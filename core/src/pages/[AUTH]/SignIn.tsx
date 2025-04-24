import React, { createContext, useContext, useState, useEffect } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
import { Button } from "../../components/UI";

const appName = import.meta.env.VITE_APP_NAME ?? "Kyro";

interface User {
  username: string;
  permissions: Array<string>;
  requiresVerification?: boolean;
  userId?: string;
}

interface AuthContextType {
  user: User | null;
  login: (
    username: string,
    password: string,
  ) => Promise<{
    success: boolean;
    error?: string;
    requiresVerification?: boolean;
  }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch("/api/auth/state", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();

        if (data.requiresVerification) {
          localStorage.setItem("requiresVerification", "true");
          localStorage.setItem("userId", data.userId);

          setUser({
            username: data.username,
            permissions: data.permissions,
            requiresVerification: true,
            userId: data.userId,
          });

          if (window.location.pathname !== "/verify-email") {
            navigate("/verify-email");
          }
        } else {
          localStorage.removeItem("requiresVerification");
          localStorage.removeItem("userId");

          setUser({
            username: data.username,
            permissions: data.permissions,
            requiresVerification: false,
          });
        }
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("requiresVerification");
        localStorage.removeItem("userId");
      }
    } catch (error) {
      console.error("Auth state check failed:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("requiresVerification");
      localStorage.removeItem("userId");
    }
    setLoading(false);
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      localStorage.setItem("token", data.token);

      if (data.requiresVerification && data.userId) {
        localStorage.setItem("requiresVerification", "true");
        localStorage.setItem("userId", data.userId);

        setUser({
          username,
          permissions: data.permissions,
          requiresVerification: true,
          userId: data.userId,
        });

        navigate("/verify-email", {
          state: {
            userId: data.userId,
            token: data.token,
            requiresVerification: true,
          },
        });

        return {
          success: true,
          requiresVerification: true,
        };
      }

      setUser({
        username,
        permissions: data.permissions,
        requiresVerification: false,
      });

      navigate("/servers");
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "An error occurred",
      };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("requiresVerification");
    localStorage.removeItem("userId");
    setUser(null);
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0E0E0F]">
        <div className="w-8 h-8 border-2 border-[#1E1E20] border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" />;

  if (user.requiresVerification) {
    return <Navigate to="/verify-email" />;
  }

  return <>{children}</>;
};

export const AuthPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const result = await login(username, password);
    if (!result.success) {
      setError(result.error || "An error occurred");
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-[#0E0E0F]">
      {/* Left panel */}
      <div className="w-2/5 p-10 flex flex-col justify-center border-r border-[#1E1E20]">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">{appName}</h1>
        </div>

        <div className="my-6">
          <h2 className="text-2xl font-semibold text-white">Welcome back</h2>
          <p className="text-lg mt-2 text-gray-400">
            Sign in to continue to your dashboard.
          </p>
        </div>

        <div className="mt-8">
          <Link
            to="https://github.com/lydonwastaken"
            className="inline-flex items-center text-gray-400 border-b border-[#1E1E20]"
          >
            Powered by {appName}
            <svg
              className="ml-1 w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </Link>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-3/5 flex items-center justify-center bg-[#141415]">
        <div className="rounded-xl p-8 w-full max-w-md bg-[#0E0E0F] border border-[#1E1E20]">
          <h2 className="text-2xl font-semibold mb-1 text-white">Sign in</h2>
          <p className="text-sm mb-6 text-gray-400">
            Enter your credentials to access your account.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-md p-3 mb-4 bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-500">{error}</p>
              </div>
            )}
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-medium mb-1.5 text-gray-400"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full px-3 py-2 rounded-md text-sm bg-[#141415] border border-[#1E1E20] text-white outline-none"
                placeholder="yourusername"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-gray-400"
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-gray-400 no-underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2 rounded-md text-sm bg-[#141415] border border-[#1E1E20] text-white outline-none"
                  placeholder="*********"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="secondary"
              size="md"
              className="w-full"
              isLoading={isLoading}
            >
              Sign in
            </Button>

            <div className="text-center mt-6">
              <p className="text-sm text-gray-400">
                Don't have an account?{" "}
                <Link to="/register" className="text-gray-400 no-underline">
                  Create an account
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
