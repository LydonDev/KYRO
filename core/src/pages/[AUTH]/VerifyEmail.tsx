import React, { useState, useEffect } from "react";
import { useNavigate, Navigate, useLocation } from "react-router-dom";
import { Button } from "../../components/UI";
import { APP_NAME } from "@/config";
import { Link } from "react-router-dom";

interface VerificationState {
  userId: string | null;
  token: string | null;
  requiresVerification: boolean;
}

const VerifyEmail: React.FC = () => {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const [verificationState, setVerificationState] = useState<VerificationState>({
    userId: null,
    token: null,
    requiresVerification: false,
  });

  useEffect(() => {
    const state = location.state as VerificationState;
    if (state) {
      setVerificationState(state);
    } else {
      const requiresVerification = localStorage.getItem("requiresVerification") === "true";
      const userId = localStorage.getItem("userId");
      const token = localStorage.getItem("token");

      if (requiresVerification && userId && token) {
        setVerificationState({
          userId,
          token,
          requiresVerification: true,
        });
      }
    }
  }, [location]);

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

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (code.some((digit) => !digit)) {
      setError("Please enter all digits of the verification code");
      return;
    }

    if (!verificationState.token || !verificationState.userId) {
      setError("Verification information is missing");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${verificationState.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: verificationState.userId,
          code: code.join(""),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Invalid verification code");
      }

      setSuccess(true);
      localStorage.removeItem("requiresVerification");
      localStorage.removeItem("userId");

      setTimeout(() => {
        navigate("/servers");
      }, 2000);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!verificationState.token || !verificationState.userId) return;

    setResendLoading(true);
    setResendSuccess(false);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${verificationState.token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to resend code");
      }

      setResendSuccess(true);
      setError("");

      setTimeout(() => {
        setResendSuccess(false);
      }, 5000);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to resend verification code",
      );
    } finally {
      setResendLoading(false);
    }
  };

  if (!verificationState.requiresVerification) {
    return <Navigate to="/servers" />;
  }

  return (
    <div className="min-h-screen flex bg-stone-950">
      {/* Left panel */}
      <div className="w-2/5 p-10 flex flex-col justify-center border-r border-stone-900">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">{APP_NAME}</h1>
        </div>

        <div className="my-6">
          <h2 className="text-2xl font-semibold text-white">Verify your email</h2>
          <p className="text-lg mt-2 text-gray-400">
            We've sent a 6-digit code to your email address.
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
          <h2 className="text-2xl font-semibold mb-1 text-white">Email verification</h2>
          <p className="text-sm mb-6 text-gray-400">
            Enter the 6-digit code sent to your email to verify your account.
          </p>

          <form onSubmit={handleVerifyCode} className="space-y-5">
            {error && (
              <div className="rounded-md p-3 mb-4 bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-500">{error}</p>
              </div>
            )}
            {success && (
              <div className="rounded-md p-3 mb-4 bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-green-500">
                  Email verified successfully! Redirecting...
                </p>
              </div>
            )}
            {resendSuccess && (
              <div className="rounded-md p-3 mb-4 bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-green-500">
                  Verification code resent! Please check your email.
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

            <div className="flex flex-col space-y-4">
              <Button
                type="submit"
                variant="secondary"
                className="w-full py-3"
                disabled={isLoading}
              >
                {isLoading ? "Verifying..." : "Verify Email"}
              </Button>

              <Button
                type="button"
                variant="primary"
                onClick={handleResendCode}
                className="w-full py-3"
                disabled={resendLoading}
              >
                {resendLoading ? "Sending..." : "Resend Code"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
