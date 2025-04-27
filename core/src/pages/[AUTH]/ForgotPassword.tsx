import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "../../components/UI";
import LoadingSpinner from "@/components/LoadingSpinner";
import { APP_NAME } from "@/config";

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [verificationStep, setVerificationStep] = useState(false);
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [userId, setUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const navigate = useNavigate();

  const inputRefs = Array(6)
    .fill(0)
    .map(() => React.createRef<HTMLInputElement>());

  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (!code[index] && index > 0) {
        inputRefs[index - 1].current?.focus();
      }
    }
  };

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

    if (!newPassword || !confirmPassword) {
      setError("Please enter and confirm your new password");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
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
          password: newPassword,
          code: code.join(""),
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
      setError(
        error instanceof Error ? error.message : "Password reset failed",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen flex bg-stone-950">
      {/* Left panel */}
      <div className="w-2/5 p-10 flex flex-col justify-center border-r border-stone-900">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[#FFFFFF]">{APP_NAME}</h1>
        </div>

        <div className="my-6">
          <h2 className="text-2xl font-semibold text-[#FFFFFF]">
            Reset your password
          </h2>
          <p className="text-lg mt-2 text-[#9CA3AF]">
            We'll help you get back into your account.
          </p>
        </div>

        <div className="mt-8">
          <Link
            to="https://github.com/lydondev"
            className="inline-flex items-center border-b border-stone-900 pb-1 text-[#9CA3AF]"
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
        <div className="bg-stone-950 rounded-xl p-8 w-full max-w-md border border-stone-900">
          {!verificationStep && !success ? (
            <>
              <h2 className="text-2xl font-semibold text-[#FFFFFF] mb-1">
                Forgot Password
              </h2>
              <p className="text-sm text-[#9CA3AF] mb-6">
                Enter your email address to receive a verification code.
              </p>

              <form onSubmit={handleSendResetEmail} className="space-y-5">
                {error && (
                  <div className="bg-stone-950 border border-stone-900 rounded-md p-3 mb-4">
                    <p className="text-xs text-[#EF4444]">{error}</p>
                  </div>
                )}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-medium text-[#9CA3AF] mb-1.5"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full px-3 py-2 rounded-md border border-stone-900 bg-stone-950 text-[#FFFFFF] text-sm transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-stone-900"
                    placeholder="email@example.com"
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
                  Send Reset Link
                </Button>

                <div className="text-center mt-6">
                  <p className="text-sm text-[#9CA3AF]">
                    Remember your password? <Link to="/login">Sign in</Link>
                  </p>
                </div>
              </form>
            </>
          ) : verificationStep ? (
            <>
              <h2 className="text-2xl font-semibold text-[#FFFFFF] mb-1">
                Verification Code
              </h2>
              <p className="text-sm text-[#9CA3AF] mb-6">
                Enter the 6-digit code sent to your email.
              </p>

              <form onSubmit={handleVerifyCode} className="space-y-5">
                {error && (
                  <div className="bg-stone-950 border border-stone-900 rounded-md p-3 mb-4">
                    <p className="text-xs text-[#EF4444]">{error}</p>
                  </div>
                )}
                <div className="flex justify-center space-x-2 my-6">
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      ref={inputRefs[index]}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-10 h-12 border border-stone-900 rounded text-center text-[#FFFFFF] font-medium text-lg bg-stone-950 focus:outline-none focus:ring-1 focus:ring-stone-900"
                    />
                  ))}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-full"
                  isLoading={isLoading}
                >
                  Verify Code
                </Button>

                <div className="text-center mt-6">
                  <p className="text-sm text-[#9CA3AF]">
                    Didn't receive a code?{" "}
                    <button
                      type="button"
                      onClick={handleSendResetEmail}
                      className="text-[#FFFFFF] hover:text-[#9CA3AF]"
                    >
                      Resend
                    </button>
                  </p>
                </div>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-semibold text-[#FFFFFF] mb-1">
                Reset Password
              </h2>
              <p className="text-sm text-[#9CA3AF] mb-6">
                Create a new secure password for your account.
              </p>

              <form onSubmit={handleResetPassword} className="space-y-5">
                {error && (
                  <div className="bg-stone-950 border border-stone-900 rounded-md p-3 mb-4">
                    <p className="text-xs text-[#EF4444]">{error}</p>
                  </div>
                )}
                {success && (
                  <div className="bg-stone-950 border border-stone-900 rounded-md p-3 mb-4">
                    <p className="text-xs text-[#10B981]">
                      Password reset successful! Redirecting to login...
                    </p>
                  </div>
                )}
                <div>
                  <label
                    htmlFor="newPassword"
                    className="block text-xs font-medium text-[#9CA3AF] mb-1.5"
                  >
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full px-3 py-2 rounded-md border border-stone-900 bg-stone-950 text-[#FFFFFF] text-sm transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-stone-900"
                    placeholder="New password"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-xs font-medium text-[#9CA3AF] mb-1.5"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full px-3 py-2 rounded-md border border-stone-900 bg-stone-950 text-[#FFFFFF] text-sm transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-stone-900"
                    placeholder="Confirm new password"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-full"
                  isLoading={isLoading}
                >
                  Reset Password
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
