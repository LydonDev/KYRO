import { useParams, useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/UI";
import { CheckIcon, ExclamationCircleIcon } from "@heroicons/react/24/solid";

interface Node {
  id: string;
  name: string;
  fqdn: string;
  port: number;
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
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error";
}

interface Plugin {
  id: string;
  title: string;
  description: string;
  icon_url: string;
  author: string;
  downloads: number;
  follows: number;
  slug: string;
  project_id?: string;
}

interface VersionFile {
  url: string;
  filename: string;
  primary: boolean;
  size: number;
  file_type?: string;
  hashes: Record<string, string>;
}

interface Version {
  id: string;
  project_id: string;
  author_id: string;
  featured: boolean;
  name: string;
  version_number: string;
  changelog: string;
  changelog_url: string | null;
  date_published: string;
  downloads: number;
  version_type: string;
  files: VersionFile[];
  dependencies: any[];
  game_versions: string[];
  loaders: string[];
}

export default function Plugins() {
  const [server, setServer] = useState<ServerDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [pluginVersions, setPluginVersions] = useState<Record<string, any>>({});
  const [installedPlugins, setInstalledPlugins] = useState<string[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const Toast: React.FC<{ toast: Toast }> = ({ toast }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg flex items-center space-x-2 
        ${toast.type === "success" ? "bg-[#141415] text-[#FFFFFF]" : "bg-[#1E1E20] text-[#EF4444] border border-[#232325]"}`}
    >
      {toast.type === "success" ? (
        <CheckIcon className="w-4 h-4" />
      ) : (
        <ExclamationCircleIcon className="w-4 h-4" />
      )}
      <span className="text-sm font-medium">{toast.message}</span>
    </motion.div>
  );

  const showToast = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      const id = Math.random().toString(36).substring(7);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    },
    []
  );

  const fetchInstalledPlugins = useCallback(async () => {
    if (!server) return;

    try {
      const response = await fetch(
        `http://${server.node.fqdn}:${server.node.port}/api/v1/filesystem/${server.internalId}/list/plugins`,
        { headers: { Authorization: `Bearer ${server?.validationToken}` } }
      );

      if (!response.ok) throw new Error("Failed to fetch installed plugins");
      const data = await response.json();
      setInstalledPlugins(data.contents?.map((file: any) => file.name) || []);
    } catch (err) {
      console.error("Error fetching installed plugins:", err);
    }
  }, [server]);

  const handleUninstall = async (pluginName: string) => {
    if (!server) return;

    try {
      const response = await fetch(
        `http://${server.node.fqdn}:${server.node.port}/api/v1/filesystem/${server.internalId}/delete/plugins/${pluginName}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${server?.validationToken}` }
        }
      );

      if (!response.ok) throw new Error('Failed to uninstall plugin');

      showToast(`Plugin ${pluginName} uninstalled successfully!`);
      await fetchInstalledPlugins();
    } catch (error) {
      console.error('Error uninstalling plugin:', error);
      showToast('Failed to uninstall plugin. Please try again.', 'error');
    }
  };

  useEffect(() => {
    const fetchPlugins = async () => {
      try {
        const params = new URLSearchParams({
          query: "",
          index: "relevance",
          limit: "24",
          offset: "0",
          facets: JSON.stringify([["project_type:plugin"]]),
        });

        const response = await fetch(`https://api.modrinth.com/v2/search?${params.toString()}`, {
          method: "GET",
        });

        if (!response.ok) throw new Error("Failed to fetch plugins");
        const data = await response.json();
        setPlugins(data.hits);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchPlugins();
  }, [id, token]);

  useEffect(() => {
    const fetchServer = async () => {
      try {
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
      } finally {
        setLoading(false);
      }
    };

    fetchServer();
  }, [id, token]);

  useEffect(() => {
    if (server) {
      fetchInstalledPlugins();
    }
  }, [server, fetchInstalledPlugins]);

  useEffect(() => {
    const fetchPluginVersions = async () => {
      try {
        // Create a new object to store versions
        const newVersionMap: Record<string, Version[]> = {};
        
        // Process plugins one by one to avoid race conditions
        for (const plugin of plugins) {
          try {
            // For Modrinth API, we need to use the project_id or slug
            // The slug is more reliable than the internal id
            const projectId = plugin.project_id || plugin.slug;
            
            if (!projectId) {
              console.error(`Missing project ID for plugin: ${plugin.title}`);
              newVersionMap[plugin.id] = [];
              continue;
            }
            
            console.log(`Fetching versions for plugin: ${plugin.title} (ID: ${projectId})`);
            
            // Use the correct Modrinth API endpoint for versions
            const response = await fetch(`https://api.modrinth.com/v2/project/${projectId}/version`);
            
            if (!response.ok) {
              console.error(`Failed to fetch versions for ${plugin.title}: ${response.status}`);
              newVersionMap[plugin.id] = [];
              continue;
            }
            
            const versions = await response.json() as Version[];
            
            if (!Array.isArray(versions)) {
              console.error(`Invalid versions response for ${plugin.title}:`, versions);
              newVersionMap[plugin.id] = [];
              continue;
            }
            
            console.log(`Got ${versions.length} versions for ${plugin.title}`);
            
            // Debug the first version's files if available
            if (versions.length > 0 && versions[0].files) {
              console.log(`Files for ${plugin.title} version ${versions[0].version_number}:`, 
                versions[0].files.map(f => ({ filename: f.filename, url: f.url, primary: f.primary }))
              );
            }
            
            // Store versions in the map with the plugin's ID as the key
            newVersionMap[plugin.id] = versions;
          } catch (err) {
            console.error(`Error fetching versions for ${plugin.title}:`, err);
            newVersionMap[plugin.id] = [];
          }
        }
        
        console.log('Finished fetching all plugin versions');
        setPluginVersions(newVersionMap);
      } catch (err) {
        console.error('Failed to fetch plugin versions:', err);
        setError("Failed to fetch plugin versions");
      }
    };

    if (plugins.length > 0) {
      fetchPluginVersions();
    }
  }, [plugins]);

  // Helper function to check if a file is likely a valid Minecraft plugin
  const isValidPluginFile = (filename: string): boolean => {
    if (!filename) return false;
    
    const lowerFilename = filename.toLowerCase();
    
    // Check if it's a JAR file (most common plugin format)
    if (lowerFilename.endsWith('.jar')) {
      // Exclude known non-plugin JAR files
      if (lowerFilename.includes('sources') || 
          lowerFilename.includes('javadoc') || 
          lowerFilename.includes('-dev')) {
        return false;
      }
      return true;
    }
    
    return false;
  };
  
  const getPluginJarFile = (plugin: Plugin) => {
    // Check if we have versions for this specific plugin
    if (!pluginVersions[plugin.id] || !Array.isArray(pluginVersions[plugin.id]) || pluginVersions[plugin.id].length === 0) {
      console.log(`No versions found for plugin: ${plugin.title} (ID: ${plugin.id})`);
      return null;
    }

    // Get the latest version (first in the array)
    const latestVersion = pluginVersions[plugin.id][0] as Version;
    console.log(`Latest version for ${plugin.title}:`, latestVersion.version_number);

    // Check if this version has files
    if (!latestVersion.files || !Array.isArray(latestVersion.files) || latestVersion.files.length === 0) {
      console.log(`No files found for ${plugin.title} version ${latestVersion.version_number}`);
      return null;
    }

    console.log(`Available files for ${plugin.title}:`, JSON.stringify(latestVersion.files));
    
    // First try to find the primary file that's a valid plugin
    let jarFile = latestVersion.files.find(f => 
      f.primary === true && 
      f.filename && 
      isValidPluginFile(f.filename)
    );
    console.log(`Primary plugin file for ${plugin.title}:`, jarFile);
    
    // If no primary plugin file is found, look for any valid plugin JAR file
    if (!jarFile) {
      jarFile = latestVersion.files.find(f => 
        f.filename && 
        typeof f.filename === 'string' && 
        isValidPluginFile(f.filename)
      );
      console.log(`Plugin JAR file for ${plugin.title}:`, jarFile);
    }
    
    // If still no plugin file, just use the first JAR file (even if it might not be a plugin)
    if (!jarFile) {
      jarFile = latestVersion.files.find(f => 
        f.filename && 
        typeof f.filename === 'string' && 
        f.filename.toLowerCase().endsWith('.jar')
      );
      console.log(`Any JAR file for ${plugin.title}:`, jarFile);
    }
    
    // Last resort: use the first file and convert it to JAR
    if (!jarFile && latestVersion.files.length > 0) {
      jarFile = latestVersion.files[0];
      console.log(`Using first available file for ${plugin.title}:`, jarFile);
    }
    
    if (jarFile) {
      console.log(`Found file for ${plugin.title}:`, jarFile.filename);
    } else {
      console.log(`No suitable file found for ${plugin.title}`);
    }

    return jarFile || null;
  };

  const handleInstall = async (plugin: Plugin) => {
    if (!server) {
      showToast("Server information not available", "error");
      return;
    }

    try {
      // Get the file for this specific plugin
      console.log(`Attempting to install plugin: ${plugin.title}`);
      console.log(`Plugin versions:`, pluginVersions[plugin.id]);
      
      const pluginFile = getPluginJarFile(plugin);
      console.log(`File found for ${plugin.title}:`, pluginFile);

      if (!pluginFile || !pluginFile.url || !pluginFile.filename) {
        // Try to get raw version data to debug
        const versions = pluginVersions[plugin.id];
        if (versions && versions.length > 0) {
          console.log(`Raw version data for ${plugin.title}:`, versions[0]);
        }
        
        showToast(`No file found for ${plugin.title}`, "error");
        return;
      }

      // Download the plugin file
      console.log(`Downloading from: ${pluginFile.url}`);
      const pluginResponse = await fetch(pluginFile.url);
      
      if (!pluginResponse.ok) {
        throw new Error(`Failed to download ${plugin.title} file: ${pluginResponse.status}`);
      }
      
      const pluginBlob = await pluginResponse.blob();
      console.log(`Downloaded ${plugin.title}: ${pluginFile.filename}, size: ${pluginBlob.size} bytes`);

      // We need to ensure this is actually a plugin JAR file, not a ZIP or other format
      // Minecraft plugins must be valid JAR files with plugin.yml or similar metadata
      
      // First, check if this is already a JAR file
      const lowerFilename = pluginFile.filename.toLowerCase();
      const isJarFile = lowerFilename.endsWith('.jar');
      
      // Create a unique filename for the plugin
      const version = pluginVersions[plugin.id]?.[0]?.version_number || 'latest';
      const safePluginName = plugin.title.replace(/[^a-zA-Z0-9]/g, '');
      const safeFilename = `${safePluginName}-${version}.jar`;
      
      console.log(`Using safe filename for upload: ${safeFilename}`);
      
      // If it's not a JAR file, we need to warn the user
      if (!isJarFile) {
        console.warn(`Warning: ${pluginFile.filename} is not a JAR file. Converting to JAR format, but it may not work as a plugin.`);
      }
      
      // Create form data with the file
      const formData = new FormData();
      const file = new File([pluginBlob], safeFilename, { type: 'application/java-archive' });
      formData.append('files', file);
      
      // Show a warning to the user if this might not be a valid plugin
      if (!isJarFile) {
        showToast(`Warning: ${plugin.title} may not be a valid plugin. It will be installed but might not work.`, "error");
      }

      // Upload to the server
      console.log(`Uploading ${safeFilename} to server ${server.name}`);
      const response = await fetch(
        `http://${server.node.fqdn}:${server.node.port}/api/v1/filesystem/${server.internalId}/upload/plugins`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${server.validationToken}` },
          body: formData
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to install ${plugin.title}: ${response.status}`);
      }

      showToast(`Plugin ${plugin.title} installed successfully!`);
      await fetchInstalledPlugins();
    } catch (error) {
      console.error(`Error installing ${plugin.title}:`, error);
      showToast(`Failed to install ${plugin.title}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error && !server) return <div className="text-red-400">{error}</div>;

  return (
    <div className="bg-[#0E0E0F] min-h-screen p-6">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
      <div className="flex flex-col h-full max-w-[1500px] mx-auto">
        <div className="mb-6">
          <div className="flex items-center text-sm text-gray-400 mb-4">
            <button onClick={() => navigate("/servers")} className="transition-colors duration-100">
              Servers
            </button>
            <ChevronRight className="w-4 h-4 mx-1" />
            <button onClick={() => navigate(`/servers/${id}`)} className="transition-colors duration-100">
              {server?.name}
            </button>
            <ChevronRight className="w-4 h-4 mx-1" />
            <span className="text-white font-medium">Plugins</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-xl font-semibold text-white mr-4">Plugins</h1>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
          {plugins.map((plugin) => (
            <Card
              key={plugin.id}
              className="p-4 bg-[#141415] border border-[#1E1E20] text-white max-w-[450px]"
            >
              <div className="flex gap-1">
                <div className="flex flex-col">
                  <div className="flex items-center gap-4">
                    <img
                      src={plugin.icon_url}
                      alt={`${plugin.title} icon`}
                      className="w-12 h-12 rounded-lg"
                    />
                    <div className="flex flex-col mt-2">
                      <h2 className="text-lg font-semibold">{plugin.title}</h2>
                      <span className="text-sm text-muted-foreground">by {plugin.author}</span>
                    </div>
                  </div>
                  <p className="text-sm line-clamp-3 mt-1">{plugin.description}</p>
                  <div className="flex gap-2 mt-2 text-muted-foreground">
                    <span>{plugin.follows?.toLocaleString() ?? 'N/A'} reviews</span>
                    <span>{plugin.downloads?.toLocaleString() ?? 'N/A'} downloads</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-2">
                {(() => {
                  // Check if this plugin is installed by looking for its filename in installed plugins
                  const pluginFile = getPluginJarFile(plugin);
                  if (!pluginFile) return false;
                  
                  // Get the version to create the expected filename
                  const version = pluginVersions[plugin.id]?.[0]?.version_number || 'latest';
                  const safePluginName = plugin.title.replace(/[^a-zA-Z0-9]/g, '');
                  const expectedFilename = `${safePluginName}-${version}.jar`;
                  
                  // Check if any installed plugin matches our expected filename
                  return installedPlugins.some(installedPlugin => 
                    installedPlugin.toLowerCase() === expectedFilename.toLowerCase()
                  );
                })() ? (
                  <Button
                    onClick={() => {
                      const jarFile = getPluginJarFile(plugin);
                      if (jarFile) handleUninstall(jarFile.filename);
                    }}
                    variant="danger"
                    className="w-full"
                  >
                    Uninstall
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleInstall(plugin)}
                    className="w-full"
                  >
                    Install
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
