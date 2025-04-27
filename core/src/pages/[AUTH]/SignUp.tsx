import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
import { Button } from "../../components/UI";
import { APP_NAME } from "@/config";

export const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      localStorage.setItem("token", data.token);

      if (data.requiresVerification && data.userId) {
        localStorage.setItem("requiresVerification", "true");
        localStorage.setItem("userId", data.userId);

        navigate("/verify-email", {
          state: {
            userId: data.userId,
            token: data.token,
            requiresVerification: true,
          },
        });
      } else {
        navigate("/servers");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-stone-950">
      {/* Left panel */}
      <div className="w-2/5 p-10 flex flex-col justify-center border-r border-stone-900">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">{APP_NAME}</h1>
        </div>

        <div className="my-6">
          <h2 className="text-2xl font-semibold text-white">
            Create an account
          </h2>
          <p className="text-lg mt-2 text-gray-400">
            Join us to manage your servers.
          </p>
        </div>

        <div className="mt-8">
          <Link
            to="https://github.com/lydondev"
            className="inline-flex items-center text-gray-400 border-b border-stone-900"
          >
            Powered by {APP_NAME}
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
      <div className="w-3/5 flex items-center justify-center bg-stone-950">
        <div className="rounded-xl p-8 w-full max-w-md bg-stone-950 border border-stone-900">
          <h2 className="text-2xl font-semibold mb-1 text-white">Register</h2>
          <p className="text-sm mb-6 text-gray-400">
            Create a new account to get started.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-md p-3 mb-4 bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-500">{error}</p>
              </div>
            )}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium mb-1.5 text-gray-400"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-3 py-2 rounded-md text-sm bg-stone-950 border border-stone-900 text-white outline-none"
                placeholder="email@example.com"
                required
              />
            </div>
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
                className="block w-full px-3 py-2 rounded-md text-sm bg-stone-950 border border-stone-900 text-white outline-none"
                placeholder="yourusername"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium mb-1.5 text-gray-400"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2 rounded-md text-sm bg-stone-950 border border-stone-900 text-white outline-none"
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

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-medium mb-1.5 text-gray-400"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full px-3 py-2 rounded-md text-sm bg-stone-950 border border-stone-900 text-white outline-none"
                  placeholder="*********"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                >
                  {showConfirmPassword ? (
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
              Create Account
            </Button>

            <div className="text-center mt-6">
              <p className="text-sm text-gray-400">
                Already have an account?{" "}
                <Link to="/login" className="text-gray-400">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
