import React, { useState, useEffect } from "react";
import { useNavigate, Navigate, useLocation } from "react-router-dom";
import { Button } from "../../components/UI";
import { APP_NAME } from "@/config";

interface VerificationState {
  userId: string | null;
  token: string | null;
  requiresVerification: boolean;
}


const VerifyEmail: React.FC = () => {
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [verificationState, setVerificationState] = useState<VerificationState>(
    {
      userId: null,
      token: null,
      requiresVerification: true,
    },
  );

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    const token = localStorage.getItem("token");
    const requiresVerification =
      localStorage.getItem("requiresVerification") === "true";

    if (location.state?.userId) {
      setVerificationState({
        userId: location.state.userId,
        token: location.state.token,
        requiresVerification: location.state.requiresVerification,
      });
    } else if (userId && token && requiresVerification) {
      setVerificationState({
        userId,
        token,
        requiresVerification,
      });
    } else {
      navigate("/login");
    }
  }, [location, navigate]);

  const inputRefs = Array(6)
    .fill(0)
    .map(() => React.createRef<HTMLInputElement>());

  useEffect(() => {
    if (code.every((digit) => digit !== "") && !isLoading) {
      handleSubmit();
    }
  }, [code]);

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

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();

    if (/^\d+$/.test(pastedData)) {
      const digits = pastedData.split("").slice(0, 6);
      const newCode = [...code];

      digits.forEach((digit, index) => {
        if (index < 6) {
          newCode[index] = digit;
        }
      });

      setCode(newCode);

      if (digits.length < 6) {
        inputRefs[digits.length].current?.focus();
      } else {
        inputRefs[5].current?.focus();
      }
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (code.some((digit) => !digit)) {
      setError("Please enter all digits of the verification code");
      return;
    }

    if (!verificationState.userId) {
      setError("Unable to verify: missing user information");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: verificationState.userId,
          code: code.join(""),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to verify email");
      }

      localStorage.setItem("token", data.token);
      localStorage.removeItem("requiresVerification");
      localStorage.removeItem("userId");

      setSuccess(true);

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
      <div className="w-2/5 p-10 flex flex-col justify-center border-r border-stone-900">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">{APP_NAME}</h1>
        </div>

        <div className="my-6">
          <h2 className="text-2xl font-semibold text-white">
            Verify your email
          </h2>
          <p className="text-lg mt-2 text-gray-400">
            We've sent a 6-digit code to your email address.
          </p>
        </div>
      </div>

      <div className="w-3/5 flex items-center justify-center bg-stone-950">
        <div className="w-full max-w-md p-8 bg-stone-950 border border-stone-900 rounded-xl">
          <h2 className="text-2xl font-semibold mb-1 text-white">
            Email verification
          </h2>
          <p className="text-sm mb-6 text-gray-400">
            Enter the 6-digit code sent to your email to verify your account.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 mb-4 rounded-md bg-stone-950 border border-stone-900">
                <p className="text-xs text-red-500">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 mb-4 rounded-md bg-stone-950 border border-stone-900">
                <p className="text-xs text-green-500">
                  Email verified successfully! Redirecting...
                </p>
              </div>
            )}

            {resendSuccess && (
              <div className="p-3 mb-4 rounded-md bg-stone-950 border border-stone-900">
                <p className="text-xs text-white">
                  A new verification code has been sent to your email.
                </p>
              </div>
            )}

            <div className="flex justify-between space-x-2">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={inputRefs[index]}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-12 h-12 text-center text-lg rounded-md bg-stone-950 border border-stone-900 text-white focus:outline-none disabled:opacity-50"
                  disabled={isLoading}
                />
              ))}
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
