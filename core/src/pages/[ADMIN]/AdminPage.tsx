import {
  QuestionMarkCircleIcon,
  BookOpenIcon,
  HeartIcon,
} from "@heroicons/react/24/solid";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/UI";
import { useEffect, useState } from "react";
import { useAuth } from "../[AUTH]/SignIn";
import { useNavigate } from "react-router-dom";

const appName = import.meta.env.VITE_APP_NAME ?? "Kyro";

const AdminPage = () => {
  const currentVersion = import.meta.env.VITE_KYRO_VERSION || "0.0.0";
  const [versionStatus, setVersionStatus] = useState<
    "latest" | "outdated" | "ahead"
  >("latest");
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !user.permissions.includes("admin")) {
      navigate("/unauthorized", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const response = await fetch(
          "https://raw.githubusercontent.com/LydonDev/KYRO-VERSION/main/VERSION.MD",
        );
        const latestVersion = (await response.text()).trim();

        const compareVersions = (v1: string, v2: string) => {
          const a = v1.split(".").map(Number);
          const b = v2.split(".").map(Number);
          for (let i = 0; i < Math.max(a.length, b.length); i++) {
            const n1 = a[i] || 0;
            const n2 = b[i] || 0;
            if (n1 > n2) return 1;
            if (n1 < n2) return -1;
          }
          return 0;
        };

        const result = compareVersions(currentVersion, latestVersion);

        if (result < 0) {
          setVersionStatus("outdated");
        } else if (result > 0) {
          setVersionStatus("ahead");
          throw new Error(
            `Current version (${currentVersion}) is ahead of GitHub version (${latestVersion})`,
          );
        } else {
          setVersionStatus("latest");
        }
      } catch (error) {
        console.error("Version check failed:", error);
      }
    };

    fetchVersion();
  }, [currentVersion]);

  return (
    <div>
      <div className="p-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-lg font-semibold text-white">Overview</h1>
            <p className="text-xs text-gray-500 mt-1 mb-8">
              A quick administrative overview of your {appName} panel.
            </p>
          </div>
          <div className="grid flex items-center justify-center">
            <Card className="bg-[#0E0E0F] border border-[#1E1E20] w-full h-full mb-8">
              <CardHeader className="w-full">
                <div className="flex items-start w-full">
                  <div className="w-full">
                    <CardTitle className="flex items-center text-[#FFFFFF] w-full">
                      <span className="text-lg font-semibold">
                        {appName} Panel
                      </span>
                      {versionStatus === "latest" && (
                        <Badge variant="success" className="ml-2">
                          {currentVersion} Latest
                        </Badge>
                      )}
                      {versionStatus === "outdated" && (
                        <Badge variant="danger" className="ml-2">
                          {currentVersion} Outdated
                        </Badge>
                      )}
                      {versionStatus === "ahead" && (
                        <Badge variant="warning" className="ml-2">
                          {currentVersion} Unsupported Version
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-2 w-full">
                      {appName} is an open-source, self-hosted, web-based panel
                      for managing your servers and services. It is designed to
                      be easy to use, fast, and secure.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
            <Card className="bg-[#0E0E0F] border border-[#1E1E20] w-full h-full mb-6 mt-8">
              <CardHeader>
                <div className="flex items-start">
                  <div>
                    <CardTitle className="flex items-center text-[#FFFFFF]">
                      <span className="text-lg font-semibold">Competitor</span>
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {appName} was created to bring something new to the game
                      server management panel market as all the other
                      alternatives are no longer maintained, have
                      vulnerabilities, or just look horrible. Unlike traditional
                      options, {appName} focuses on modern design, security, and
                      performance to offer a superior user experience.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <a
              href="https://discord.gg/compute"
              className="bg-[#0E0E0F] border border-[#1E1E20] transition font-medium text-sm text-[#FFFFFF] py-2 px-4 rounded-md flex items-center space-x-2 hover:bg-[#1E1E20]"
            >
              <QuestionMarkCircleIcon className="w-4 h-4" />
              <span>Get Help</span>
            </a>
            <a
              href="https://github.com/lydondev/KYRO"
              className="bg-[#0E0E0F] border border-[#1E1E20] transition font-medium text-sm text-[#FFFFFF] py-2 px-4 rounded-md flex items-center space-x-2 hover:bg-[#1E1E20]"
            >
              <svg
                className="w-4 h-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span>GitHub</span>
            </a>
            <a
              href="https://docs.kyro.lol"
              className="bg-[#0E0E0F] border border-[#1E1E20] transition font-medium text-sm text-[#FFFFFF] py-2 px-4 rounded-md flex items-center space-x-2 hover:bg-[#1E1E20]"
            >
              <BookOpenIcon className="w-4 h-4" />
              <span>Documentation</span>
            </a>
            <button className="bg-[#0E0E0F] border border-[#1E1E20] transition font-medium text-sm text-[#FFFFFF] py-2 px-4 rounded-md flex items-center space-x-2 hover:bg-[#1E1E20]">
              <HeartIcon className="w-4 h-4" />
              <span>Support the Project</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
