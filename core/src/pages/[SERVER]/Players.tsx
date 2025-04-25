import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";

interface Node {
  id: string;
  name: string;
  fqdn: string;
  port: number;
  isOnline: boolean;
  lastChecked: string;
}

interface ServerStatus {
  docker_id: string;
  name: string;
  image: string;
  state: string;
  memory_limit: number;
  cpu_limit: number;
  startup_command: string;
  allocation: string;
}

interface ServerDetails {
  id: string;
  internalId: string;
  name: string;
  memoryMiB: number;
  diskMiB: number;
  cpuPercent: number;
  state: string;
  createdAt: string;
  validationToken: string;
  node: Node;
  status: ServerStatus;
}

export default function Players() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [server, setServer] = useState<ServerDetails | null>(null);
  const { id } = useParams();

  useEffect(() => {
    const fetchServer = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `/api/servers/${id}?include[node]=true&include[status]=true`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) throw new Error("Failed to fetch server");
        const data = await response.json();

        if (!data.node?.fqdn || !data.node?.port) {
          throw new Error("Server node information is missing");
        }

        setServer(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    };

    fetchServer();
  }, [id]);

  useEffect(() => {
    if (!server && !error) return;

    if (error || (server && (!server.node?.fqdn || !server.node?.port))) {
      navigate("/unauthorized");
    }
  }, [server, error, navigate]);

  return (
    <div className="bg-[#0E0E0F] min-h-screen p-6">
      <div className="flex flex-col h-full max-w-[1500px] mx-auto">
        <div className="mb-6">
          <div className="flex items-center text-sm text-gray-400 mb-4">
            <button
              onClick={() => navigate("/servers")}
              className="transition-colors duration-100"
            >
              Servers
            </button>
            <ChevronRight className="w-4 h-4 mx-1" />
            <button
              onClick={() => navigate(`/servers/${id}`)}
              className="transition-colors duration-100"
            >
              {server?.name}
            </button>
            <ChevronRight className="w-4 h-4 mx-1" />
            <span className="text-white font-medium">Players</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-white mr-4">
                Players
              </h1>
            </div>
          </div>
        </div>

        <div className="h-svh flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center px-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="72"
              height="72"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="tabler-icon tabler-icon-planet"
            >
              <path d="M18.816 13.58c2.292 2.138 3.546 4 3.092 4.9c-.745 1.46 -5.783 -.259 -11.255 -3.838c-5.47 -3.579 -9.304 -7.664 -8.56 -9.123c.464 -.91 2.926 -.444 5.803 .805"></path>
              <path d="M12 12m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"></path>
            </svg>
            <h1 className="text-4xl font-bold text-white">Coming Soon 👀</h1>
            <p className="text-muted-foreground">
              This page hasn't been created yet. <br />
              Stay tuned though!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
