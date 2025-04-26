import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ExclamationCircleIcon,
  CheckIcon,
  TrashIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/solid";
import LoadingSpinner from "../../components/LoadingSpinner";
import { motion } from "framer-motion";
import { Button } from "../../components/UI";

interface Server {
  id: string;
  internalId: string;
  name: string;
  status: string;
  state?: string;
  nodeId: string;
  node?: {
    fqdn: string;
    port: number;
  };
  validationToken: string;
}

const ServerSettingsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [server, setServer] = useState<Server | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [renameFeedback, setRenameFeedback] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const fetchServer = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("token");
        const response = await fetch(
          `/api/servers/${id}?include[node]=true&include[status]=true`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );
        if (!response.ok) {
          throw new Error("Failed to fetch server details");
        }
        const data = await response.json();
        setServer(data);
        setNewName(data.name);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchServer();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [id]);

  const handleRename = async () => {
    if (!server || !newName.trim() || newName.trim() === server.name) return;

    setIsUpdating(true);
    setRenameFeedback(null);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/servers/${server.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!response.ok) throw new Error("Failed to update server name");

      setServer((prev) => (prev ? { ...prev, name: newName.trim() } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename server");
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!server) return;

    setIsDeleting(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/servers/${server.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.error || data.details || "Failed to delete server",
        );
      }

      navigate("/servers");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete server");
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    throw new Error(error);
  }

  if (!server) {
    navigate("/unauthorized");
  }

  return (
    <div className="card bg-stone-950 p-6 min-h-screen">
      <div className="flex flex-col h-full max-w-[1500px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          {/* Breadcrumb */}
          <div className="flex items-center text-sm text-[#9CA3AF] mb-4">
            <button
              onClick={() => navigate("/servers")}
              className="hover:text-[#FFFFFF] transition-colors duration-100"
            >
              Servers
            </button>
            <ChevronRightIcon className="w-4 h-4 mx-1" />
            <button
              onClick={() => navigate(`/servers/${id}`)}
              className="hover:text-[#FFFFFF] transition-colors duration-100"
            >
              {server?.name}
            </button>
            <ChevronRightIcon className="w-4 h-4 mx-1" />
            <span className="text-[#FFFFFF] font-medium">Settings</span>
          </div>

          {/* Title and Controls Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-[#FFFFFF] mr-4">
                Settings
              </h1>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center px-3 py-1.5 text-xs text-[#EF4444] bg-[#0E0E0F] border border-[#1E1E20] rounded-md"
                >
                  <ExclamationCircleIcon className="w-3.5 h-3.5 mr-1.5" />
                  {error}
                </motion.div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-stone-950 border border-stone-900 rounded-lg">
          <div className="p-6 space-y-6">
            {/* Server Name Section */}
            <div>
              <h2 className="text-lg font-medium text-[#FFFFFF] mb-4">
                Server Name
              </h2>
              <div className="space-y-4">
                <div className="flex flex-col space-y-3 md:flex-row md:space-y-0 md:space-x-4 md:items-center">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-stone-950 border border-stone-900
                    text-sm text-[#FFFFFF]
                    focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900
                    transition-colors duration-200"
                    placeholder="Enter server name"
                  />
                  <Button
                    variant="primary"
                    onClick={handleRename}
                    disabled={
                      isUpdating ||
                      newName.trim() === server?.name ||
                      !newName.trim()
                    }
                    isLoading={isUpdating}
                    icon={<CheckIcon className="w-4 h-4" />}
                  >
                    Save
                  </Button>
                </div>

                {renameFeedback && (
                  <div
                    className={`flex items-center p-3 text-sm rounded-md ${
                      renameFeedback.type === "success"
                        ? "bg-stone-950 border border-stone-900 text-[#10B981]"
                        : "bg-stone-950 border border-stone-900 text-[#EF4444]"
                    }`}
                  >
                    {renameFeedback.type === "success" ? (
                      <div className="w-4 h-4 mr-2">✓</div>
                    ) : (
                      <ExclamationCircleIcon className="w-4 h-4 mr-2" />
                    )}
                    {renameFeedback.message}
                  </div>
                )}
              </div>
            </div>

            {/* Danger Zone */}
            <div>
              <h2 className="text-lg font-medium text-[#FFFFFF] mb-4">
                Danger Zone
              </h2>
              <div className="bg-stone-950 p-4 rounded-md border border-stone-900">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div className="mb-4 md:mb-0">
                    <h3 className="text-sm font-medium text-[#FFFFFF]">
                      Delete Server
                    </h3>
                    <p className="text-sm text-[#9CA3AF] mt-1">
                      Once you delete a server, there is no going back. Please
                      be certain.
                    </p>
                  </div>
                  {!showDeleteConfirm ? (
                    <Button
                      onClick={() => setShowDeleteConfirm(true)}
                      variant="danger"
                      size="sm"
                      icon={<TrashIcon className="w-4 h-4" />}
                    >
                      Delete Server
                    </Button>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => setShowDeleteConfirm(false)}
                        variant="secondary"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        variant="danger"
                      >
                        {isDeleting ? (
                          <span className="flex items-center">
                            <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            Deleting...
                          </span>
                        ) : (
                          <>
                            <TrashIcon className="w-4 h-4" />
                            Confirm Delete
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServerSettingsPage;
