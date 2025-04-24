import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/UI";

interface GeneralErrorProps extends React.HTMLAttributes<HTMLDivElement> {
  minimal?: boolean;
}

export default function GeneralError({
  className,
  minimal = false,
}: GeneralErrorProps) {
  const navigate = useNavigate();
  return (
    <div className={cn("h-svh w-full", className)}>
      <div className="m-auto flex h-full w-full flex-col items-center justify-center gap-2">
        {!minimal && (
          <h1 className="text-[7rem] leading-tight font-bold text-white">
            500
          </h1>
        )}
        <span className="font-medium text-gray-400">
          Oops! Something went wrong {`:')`}
        </span>
        <p className="text-muted-foreground text-center">
          We apologize for the inconvenience. <br /> Please try again later.
        </p>
        {!minimal && (
          <div className="mt-6 flex gap-4">
            <Button variant="secondary" onClick={() => navigate("/")}>
              Back to Home
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
