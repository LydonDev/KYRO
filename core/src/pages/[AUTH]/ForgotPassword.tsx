import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/UI";
import { APP_NAME } from "@/config";

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [verificationStep, setVerificationStep] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send reset email");
      }

      setSuccess(true);
      setUserId(data.userId);
      setVerificationStep(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (code.some((digit) => !digit)) {
      setError("Please enter all digits of the verification code");
      return;
    }

    if (!userId) {
      setError("User information is missing");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          code: code.join(""),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Invalid verification code");
      }

      setSuccess(true);
      setVerificationStep(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword) {
      setError("Please enter a new password");
      return;
    }

    if (!userId) {
      setError("User information is missing");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      if (nextInput) nextInput.focus();
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
          <h2 className="text-2xl font-semibold text-white">Reset your password</h2>
          <p className="text-lg mt-2 text-gray-400">
            We'll help you get back into your account.
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
          <h2 className="text-2xl font-semibold mb-1 text-white">Forgot Password</h2>
          <p className="text-sm mb-6 text-gray-400">
            {!verificationStep
              ? "Enter your email to receive a reset code."
              : "Enter the verification code sent to your email."}
          </p>

          {!verificationStep ? (
            <form onSubmit={handleSendResetEmail} className="space-y-5">
              {error && (
                <div className="rounded-md p-3 mb-4 bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-red-500">{error}</p>
                </div>
              )}
              {success && (
                <div className="rounded-md p-3 mb-4 bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-green-500">
                    Verification code sent! Please check your email.
                  </p>
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
                  placeholder="your@email.com"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="secondary"
                size="md"
                className="w-full"
                isLoading={isLoading}
              >
                Send Reset Code
              </Button>

              <div className="text-center mt-6">
                <p className="text-sm text-gray-400">
                  Remember your password?{" "}
                  <Link to="/login" className="text-gray-400 no-underline">
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-5">
              {error && (
                <div className="rounded-md p-3 mb-4 bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-red-500">{error}</p>
                </div>
              )}
              {success && (
                <div className="rounded-md p-3 mb-4 bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-green-500">
                    Code verified! Please set your new password.
                  </p>
                </div>
              )}

              <div>
                <label
                  htmlFor="code"
                  className="block text-xs font-medium mb-1.5 text-gray-400"
                >
                  Verification Code
                </label>
                <div className="flex gap-2">
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      id={`code-${index}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      className="w-12 h-12 text-center rounded-md text-sm bg-stone-950 border border-stone-900 text-white outline-none"
                      required
                    />
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                variant="secondary"
                size="md"
                className="w-full"
                isLoading={isLoading}
              >
                Verify Code
              </Button>

              <div className="text-center mt-6">
                <p className="text-sm text-gray-400">
                  Didn't receive the code?{" "}
                  <button
                    type="button"
                    onClick={handleSendResetEmail}
                    className="text-gray-400 no-underline"
                    disabled={resendLoading}
                  >
                    {resendLoading ? "Sending..." : "Resend Code"}
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
