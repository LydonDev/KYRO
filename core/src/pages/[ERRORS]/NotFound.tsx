import { Link } from "react-router-dom";
import { HomeIcon } from "@heroicons/react/24/outline";
import { Button } from "../../components/UI";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center p-6 mt-48">
      <div className="w-full max-w-md text-center space-y-5">
        {/* Error Code */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-500 tracking-wide">
            ERROR 404
          </p>
          <h1 className="text-lg font-medium text-white">Page not found</h1>
          <p className="text-xs text-gray-500">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Action Button */}
        <div>
          <Link to="/">
            <Button
              variant="secondary"
              icon={<HomeIcon className="mr-2 h-3.5 w-3.5" />}
            >
              Return home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
