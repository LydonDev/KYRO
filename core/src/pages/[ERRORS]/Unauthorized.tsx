import { useNavigate } from "react-router-dom";
import { Button } from "@/components/UI";

export default function UnauthorisedError() {
  const navigate = useNavigate();
  return (
    <div className="h-svh">
      <div className="m-auto flex h-full w-full flex-col items-center justify-center gap-2">
        <h1 className="text-[7rem] leading-tight font-bold text-white">401</h1>
        <span className="font-medium text-gray-400">Unauthorized Access</span>
        <p className="text-muted-foreground text-center">
          Please log in with the appropriate credentials <br /> to access this
          resource.
        </p>
        <div className="mt-6 flex gap-4">
          <Button onClick={() => navigate("/")} variant="secondary">
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
