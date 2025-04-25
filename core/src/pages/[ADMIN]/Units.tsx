import React, { useState, useEffect } from "react";
import {
  ChevronRightIcon,
  TrashIcon,
  PencilIcon,
  ArrowLeftIcon,
  PackageIcon,
  PlusIcon,
  DownloadIcon,
} from "lucide-react";
import { z } from "zod";
import LoadingSpinner from "../../components/LoadingSpinner";
import { saveAs } from "file-saver";
import { Button } from "@/components/UI";
import { Card } from "@/components/ui/card";
import { useAuth } from "../[AUTH]/SignIn";
import { useNavigate } from "react-router-dom";

// Schemas matching backend validation
const environmentVariableSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  defaultValue: z.string(),
  required: z.boolean().default(false),
  userViewable: z.boolean().default(true),
  userEditable: z.boolean().default(false),
  rules: z.string(),
});

const configFileSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
});

const installScriptSchema = z.object({
  dockerImage: z.string(),
  entrypoint: z.string().default("bash"),
  script: z.string(),
});

const unitSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100),
  shortName: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[a-z0-9-]+$/),
  description: z.string(),
  dockerImage: z.string(),
  defaultStartupCommand: z.string(),
  configFiles: z.array(configFileSchema).default([]),
  environmentVariables: z.array(environmentVariableSchema).default([]),
  installScript: installScriptSchema,
  startup: z
    .object({
      userEditable: z.boolean().default(false),
    })
    .default({}),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Container schema
const containerSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  items: z.array(
    z.object({
      cargoId: z.string(),
      targetPath: z.string(),
    }),
  ),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

type Unit = z.infer<typeof unitSchema>;
type Container = z.infer<typeof containerSchema>;
type View = "list" | "create" | "view" | "edit";


// Environment Variables Form Component
const EnvironmentVariableForm: React.FC<{
  variables: Unit["environmentVariables"];
  onChange: (variables: Unit["environmentVariables"]) => void;
}> = ({ variables, onChange }) => {
  const addVariable = () => {
    onChange([
      ...variables,
      {
        name: "",
        description: "",
        defaultValue: "",
        required: false,
        userViewable: true,
        userEditable: false,
        rules: "string",
      },
    ]);
  };

  const removeVariable = (index: number) => {
    onChange(variables.filter((_, i) => i !== index));
  };

  const updateVariable = (
    index: number,
    field: keyof (typeof variables)[0],
    value: any,
  ) => {
    onChange(
      variables.map((v, i) => (i === index ? { ...v, [field]: value } : v)),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-white">
          Environment Variables
        </label>
        <button
          type="button"
          onClick={addVariable}
          className="px-2 py-1 text-xs font-medium text-gray-600 bg-[#0E0E0F] border border-[#1E1E20] rounded-md hover:bg-gray-50"
        >
          Add Variable
        </button>
      </div>

      {variables.map((variable, index) => (
        <div key={index} className="border-t border-[#1E1E20] p-3 space-y-3">
          <div className="flex justify-between items-start">
            <div className="grow space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={variable.name}
                  onChange={(e) =>
                    updateVariable(index, "name", e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-md bg-[#0E0E0F] border border-[#1E1E20]
                    text-sm text-[#FFFFFF]
                    focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
                    transition-colors duration-200"
                  placeholder="Variable Name"
                />
                <input
                  type="text"
                  value={variable.defaultValue}
                  onChange={(e) =>
                    updateVariable(index, "defaultValue", e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-md bg-[#0E0E0F] border border-[#1E1E20]
                    text-sm text-[#FFFFFF]
                    focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
                    transition-colors duration-200"
                  placeholder="Default Value"
                />
              </div>

              <input
                type="text"
                value={variable.description || ""}
                onChange={(e) =>
                  updateVariable(index, "description", e.target.value)
                }
                className="w-full px-3 py-2 rounded-md bg-[#0E0E0F] border border-[#1E1E20]
                  text-sm text-[#FFFFFF]
                  focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
                  transition-colors duration-200"
                placeholder="Description (optional)"
              />

              <input
                type="text"
                value={variable.rules}
                onChange={(e) => updateVariable(index, "rules", e.target.value)}
                className="block w-full px-3 py-2 rounded-md bg-[#0E0E0F] border border-[#1E1E20]
                  text-sm text-[#FFFFFF]
                  focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
                  transition-colors duration-200"
                placeholder="Validation Rules (e.g., string|max:20)"
              />

              <div className="flex space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={variable.required}
                    onChange={(e) =>
                      updateVariable(index, "required", e.target.checked)
                    }
                    className="text-xs"
                  />
                  <span className="text-xs text-gray-400">Required</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={variable.userViewable}
                    onChange={(e) =>
                      updateVariable(index, "userViewable", e.target.checked)
                    }
                    className="text-xs"
                  />
                  <span className="text-xs text-gray-400">User Viewable</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={variable.userEditable}
                    onChange={(e) =>
                      updateVariable(index, "userEditable", e.target.checked)
                    }
                    className="text-xs"
                  />
                  <span className="text-xs text-gray-400">User Editable</span>
                </label>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => removeVariable(index)}
              variant="danger"
              size="sm"
              className="ml-4"
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}

      {variables.length === 0 && (
        <div className="text-center py-4 border border-[#1E1E20] border-dashed rounded-md">
          <p className="text-xs text-gray-500">No variables defined</p>
        </div>
      )}
    </div>
  );
};

// Config Files Form Component
const ConfigFilesForm: React.FC<{
  files: Unit["configFiles"];
  onChange: (files: Unit["configFiles"]) => void;
}> = ({ files, onChange }) => {
  const addFile = () => {
    onChange([
      ...files,
      {
        path: "",
        content: "",
      },
    ]);
  };

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  const updateFile = (
    index: number,
    field: keyof (typeof files)[0],
    value: string,
  ) => {
    onChange(files.map((f, i) => (i === index ? { ...f, [field]: value } : f)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-white">
          Configuration Files
        </label>
        <Button
          type="button"
          onClick={addFile}
          icon={<PlusIcon className="w-4 h-4" />}
          variant="secondary"
        >
          Add File
        </Button>
      </div>

      {files.map((file, index) => (
        <div
          key={index}
          className="border border-[#1E1E20] rounded-md p-3 space-y-3"
        >
          <div className="flex justify-between items-start">
            <div className="grow space-y-3">
              <input
                type="text"
                value={file.path}
                onChange={(e) => updateFile(index, "path", e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[#0E0E0F] border border-[#1E1E20]
                    text-sm text-[#FFFFFF]
                    focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
                    transition-colors duration-200"
                placeholder="File Path (e.g., server.properties)"
              />

              <textarea
                value={file.content}
                onChange={(e) => updateFile(index, "content", e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[#0E0E0F] border border-[#1E1E20]
                  text-sm text-[#FFFFFF]
                  focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
                  transition-colors duration-200 font-mono"
                placeholder="File Content"
                rows={5}
              />
            </div>

            <Button
              type="button"
              onClick={() => removeFile(index)}
              icon={<TrashIcon className="w-4 h-4" />}
              variant="danger"
            >
              Remove
            </Button>
          </div>
        </div>
      ))}

      {files.length === 0 && (
        <div className="text-center py-4 border border-[#1E1E20] border-dashed rounded-md">
          <p className="text-xs text-gray-500">
            No configuration files defined
          </p>
        </div>
      )}
    </div>
  );
};

// Container List Component
const ContainerList: React.FC<{
  unitId: string | undefined;
  assignedContainers: Container[];
  onRefresh: () => void;
}> = ({ unitId, assignedContainers, onRefresh }) => {
  const [allContainers, setAllContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showContainerSelector, setShowContainerSelector] = useState(false);

  useEffect(() => {
    if (showContainerSelector) {
      fetchAllContainers();
    }
  }, [showContainerSelector]);

  const fetchAllContainers = async () => {
    if (!unitId) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/cargo/container", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // If we get a 404, it might be that there are no containers yet
          setAllContainers([]);
          return [];
        }
        throw new Error("Failed to fetch containers");
      }

      const data = await response.json();
      setAllContainers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const assignContainer = async (containerId: string) => {
    if (!unitId) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/units/${unitId}/containers/${containerId}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) throw new Error("Failed to assign container");

      onRefresh();
      setShowContainerSelector(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to assign container",
      );
    }
  };

  const removeContainer = async (containerId: string) => {
    if (!unitId) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/units/${unitId}/containers/${containerId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) throw new Error("Failed to remove container");

      onRefresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to remove container",
      );
    }
  };

  // Filter out already assigned containers
  const availableContainers = allContainers.filter(
    (container) => !assignedContainers.some((ac) => ac.id === container.id),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-gray-400">
          Cargo Containers
        </label>
        <Button
          type="button"
          onClick={() => setShowContainerSelector(!showContainerSelector)}
          icon={<PlusIcon className="w-3 h-3 mr-1" />}
          variant="secondary"
        >
          Add Container
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-2 rounded-md text-xs">
          {error}
        </div>
      )}

      {/* Container Selector */}
      {showContainerSelector && (
        <div className="border border-gray-200 rounded-md p-3">
          <h4 className="text-xs font-medium mb-2">
            Select a container to add
          </h4>
          {loading ? (
            <div className="text-center py-4">
              <span className="text-xs text-gray-500">Loading...</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableContainers.length > 0 ? (
                availableContainers.map((container) => (
                  <div
                    key={container.id}
                    className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-md border border-gray-100"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        {container.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {container.items.length} items
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={() => assignContainer(container.id)}
                      icon={<PlusIcon className="w-3 h-3 mr-1" />}
                      variant="secondary"
                    >
                      Add
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-gray-500">
                    No available containers
                  </p>
                </div>
              )}
            </div>
          )}
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              onClick={() => setShowContainerSelector(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Assigned Containers List */}
      <div>
        {assignedContainers.length > 0 ? (
          <div className="space-y-2">
            {assignedContainers.map((container) => (
              <div
                key={container.id}
                className="border border-gray-200 rounded-md p-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-medium">{container.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {container.description}
                    </div>

                    {container.items && container.items.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs font-medium text-white mb-1">
                          Items:
                        </div>
                        <div className="space-y-1 ml-2">
                          {container.items.map((item, idx) => (
                            <div key={idx} className="text-xs">
                              →{" "}
                              <span className="font-mono">
                                {item.targetPath}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => removeContainer(container.id)}
                    icon={<TrashIcon className="w-4 h-4" />}
                    variant="danger"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 border border-[#1E1E20] border-dashed rounded-md">
            <div className="flex flex-col items-center justify-center">
              <PackageIcon className="w-5 h-5 text-gray-400 mb-1" />
              <p className="text-xs text-gray-500">No containers assigned</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminUnitsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Restrict access to admin only
  useEffect(() => {
    if (!user || !user.permissions.includes("admin")) {
      navigate("/unauthorized", { replace: true });
    }
  }, [user, navigate]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("list");
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [assignedContainers, setAssignedContainers] = useState<Container[]>([]);
  const [formData, setFormData] = useState<
    Omit<Unit, "id" | "createdAt" | "updatedAt">
  >({
    name: "",
    shortName: "",
    description: "",
    dockerImage: "",
    defaultStartupCommand: "",
    configFiles: [],
    environmentVariables: [],
    installScript: {
      dockerImage: "",
      entrypoint: "bash",
      script: "",
    },
    startup: {
      userEditable: false,
    },
  });
  const [formError, setFormError] = useState<string | null>(null);
  console.log(error);
  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/units", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch units");

      const data = await response.json();
      setUnits(data);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  const fetchUnitContainers = async (unitId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/units/${unitId}/containers`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch unit containers");

      const data = await response.json();
      setAssignedContainers(data);
    } catch (err) {
      console.error("Failed to fetch containers:", err);
      setAssignedContainers([]);
    }
  };

  useEffect(() => {
    if (selectedUnit?.id && (view === "view" || view === "edit")) {
      fetchUnitContainers(selectedUnit.id);
    }
  }, [selectedUnit, view]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      const validatedData = unitSchema
        .omit({ id: true, createdAt: true, updatedAt: true })
        .parse(formData);

      const token = localStorage.getItem("token");
      const response = await fetch("/api/units", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validatedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create unit");
      }

      await fetchUnits();
      setView("list");
      resetForm();
    } catch (err) {
      if (err instanceof z.ZodError) {
        setFormError("Invalid input. Please check your data.");
      } else {
        setFormError(
          err instanceof Error ? err.message : "Failed to create unit",
        );
      }
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnit) return;
    setFormError(null);

    try {
      const validatedData = unitSchema
        .partial()
        .omit({ id: true, createdAt: true, updatedAt: true })
        .parse(formData);

      const token = localStorage.getItem("token");
      const response = await fetch(`/api/units/${selectedUnit.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validatedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update unit");
      }

      await fetchUnits();
      setView("list");
      resetForm();
    } catch (err) {
      if (err instanceof z.ZodError) {
        setFormError("Invalid input. Please check your data.");
      } else {
        setFormError(
          err instanceof Error ? err.message : "Failed to update unit",
        );
      }
    }
  };

  const handleDelete = async (unitId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/units/${unitId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete unit");
      }

      await fetchUnits();
      if (selectedUnit?.id === unitId) {
        setView("list");
        setSelectedUnit(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete unit");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      shortName: "",
      description: "",
      dockerImage: "",
      defaultStartupCommand: "",
      configFiles: [],
      environmentVariables: [],
      installScript: {
        dockerImage: "",
        entrypoint: "bash",
        script: "",
      },
      startup: {
        userEditable: false,
      },
    });
    setSelectedUnit(null);
    setAssignedContainers([]);
  };

  const handleExport = (unit: Unit) => {
    const exportData = {
      name: unit.name,
      shortName: unit.shortName,
      description: unit.description,
      dockerImage: unit.dockerImage,
      defaultStartupCommand: unit.defaultStartupCommand,
      configFiles: unit.configFiles,
      environmentVariables: unit.environmentVariables,
      installScript: unit.installScript,
      startup: unit.startup,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    saveAs(blob, `unit-${unit.shortName}.json`);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const importedUnit = JSON.parse(content);

        const token = localStorage.getItem("token");
        const response = await fetch("/api/units", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(importedUnit),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Import failed");
        }

        await fetchUnits();
        setView("list");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to import unit");
      }
    };

    reader.readAsText(file);
  };

  const handleImportEgg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        let rawegg = JSON.parse(content);

        // Clean it
        if (typeof rawegg === "string") {
          rawegg = rawegg.replace("{{", "%").replace("}}", "%");
          rawegg = JSON.parse(rawegg);
        }

        const unit = {
          name: rawegg.name,
          shortName: rawegg.name.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
          description: rawegg.description,
          dockerImage: Object.values(rawegg.docker_images)[0] as string,
          defaultStartupCommand: rawegg.startup,
          configFiles: [],
          environmentVariables: rawegg.variables.map((v: any) => ({
            name: v.env_variable,
            description: v.description,
            defaultValue: v.default_value,
            required: v.rules.includes("required"),
            userViewable: v.user_viewable,
            userEditable: v.user_editable,
            rules: v.rules,
          })),
          installScript: {
            dockerImage: rawegg.scripts.installation.container,
            entrypoint: rawegg.scripts.installation.entrypoint,
            script: rawegg.scripts.installation.script,
          },
          startup: {
            userEditable: true,
          },
        };

        const token = localStorage.getItem("token");
        const response = await fetch("/api/units", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(unit),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Import failed");
        }

        await fetchUnits();
        setView("list");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to import Pterodactyl egg",
        );
      }
    };

    reader.readAsText(file);
  };

  const renderUnitForm = (type: "create" | "edit") => (
    <form
      onSubmit={type === "create" ? handleCreate : handleUpdate}
      className="space-y-4 max-w-lg"
    >
      {formError && (
        <div className="bg-red-50 border border-red-100 rounded-md p-3">
          <p className="text-xs text-red-600">{formError}</p>
        </div>
      )}

      {/* Basic Unit Information */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-white">Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="block w-full px-3 py-2 rounded-md bg-[#0E0E0F] border border-[#1E1E20]
            text-sm text-[#FFFFFF]
            focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
            transition-colors duration-200"
          placeholder="Minecraft Java Server"
          required
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-white">
          Short Name (lowercase, numbers, hyphens)
        </label>
        <input
          type="text"
          value={formData.shortName}
          onChange={(e) =>
            setFormData({
              ...formData,
              shortName: e.target.value.toLowerCase(),
            })
          }
          className="w-full px-3 py-2 rounded-md bg-[#0E0E0F] border border-[#1E1E20]
                    text-sm text-[#FFFFFF]
                    focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
                    transition-colors duration-200"
          placeholder="minecraft-java"
          pattern="[a-z0-9-]+"
          required
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-white">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          className="w-full px-3 py-2 rounded-md bg-[#0E0E0F] border border-[#1E1E20]
            text-sm text-[#FFFFFF]
            focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
            transition-colors duration-200"
          placeholder="Detailed description of the unit..."
          rows={3}
          required
        />
      </div>

      {/* Docker Configuration */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-white">
          Docker Image
        </label>
        <input
          type="text"
          value={formData.dockerImage}
          onChange={(e) =>
            setFormData({ ...formData, dockerImage: e.target.value })
          }
          className="w-full px-3 py-2 rounded-md bg-[#0E0E0F] border border-[#1E1E20]
            text-sm text-[#FFFFFF]
            focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
            transition-colors duration-200"
          placeholder="itzg/minecraft-server:java17"
          required
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-white">
          Default Startup Command
        </label>
        <input
          type="text"
          value={formData.defaultStartupCommand}
          onChange={(e) =>
            setFormData({ ...formData, defaultStartupCommand: e.target.value })
          }
          className="w-full px-3 py-2 rounded-md bg-[#0E0E0F] border border-[#1E1E20]
            text-sm text-[#FFFFFF]
            focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
            transition-colors duration-200"
          placeholder="java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar server.jar"
          required
        />
      </div>

      {/* Environment Variables */}
      <EnvironmentVariableForm
        variables={formData.environmentVariables}
        onChange={(variables) =>
          setFormData({ ...formData, environmentVariables: variables })
        }
      />

      {/* Config Files */}
      <ConfigFilesForm
        files={formData.configFiles}
        onChange={(files) => setFormData({ ...formData, configFiles: files })}
      />

      {/* Install Script */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-white">
          Install Script Details
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={formData.installScript.dockerImage}
            onChange={(e) =>
              setFormData({
                ...formData,
                installScript: {
                  ...formData.installScript,
                  dockerImage: e.target.value,
                },
              })
            }
            className="w-full px-3 py-2 rounded-md bg-[#0E0E0F] border border-[#1E1E20]
              text-sm text-[#FFFFFF]
              focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
              transition-colors duration-200"
            placeholder="Install Docker Image"
            required
          />
          <input
            type="text"
            value={formData.installScript.entrypoint}
            onChange={(e) =>
              setFormData({
                ...formData,
                installScript: {
                  ...formData.installScript,
                  entrypoint: e.target.value,
                },
              })
            }
            className="w-full px-3 py-2 rounded-md bg-[#0E0E0F] border border-[#1E1E20]
              text-sm text-[#FFFFFF]
              focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
              transition-colors duration-200"
            placeholder="Entrypoint (default: bash)"
            defaultValue="bash"
          />
        </div>
        <textarea
          value={formData.installScript.script}
          onChange={(e) =>
            setFormData({
              ...formData,
              installScript: {
                ...formData.installScript,
                script: e.target.value,
              },
            })
          }
          className="mt-2 w-full px-3 py-2 rounded-md bg-[#0E0E0F] border border-[#1E1E20]
            text-sm text-[#FFFFFF]
            focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
            transition-colors duration-200 font-mono"
          placeholder="Install script commands..."
          rows={4}
          required
        />
      </div>

      {/* Startup Configuration */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-400">
          Startup Configuration
        </label>
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.startup.userEditable}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  startup: {
                    ...formData.startup,
                    userEditable: e.target.checked,
                  },
                })
              }
              className="text-sm"
            />
            <span className="text-sm text-gray-400">User Editable</span>
          </label>
        </div>
      </div>

      {/* Cargo Containers Section */}
      {type === "edit" && selectedUnit?.id && (
        <div className="pt-4 border-t border-[#1E1E20]">
          <ContainerList
            unitId={selectedUnit.id}
            assignedContainers={assignedContainers}
            onRefresh={() => fetchUnitContainers(selectedUnit.id!)}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center space-x-3">
        <Button
          type="button"
          onClick={() => {
            setView(type === "edit" ? "view" : "list");
            resetForm();
          }}
        >
          Cancel
        </Button>
        <Button type="submit" variant="secondary">
          {type === "create" ? "Create Unit" : "Update Unit"}
        </Button>
      </div>
    </form>
  );

  const renderUnitDetails = () => {
    if (!selectedUnit) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => {
                setView("list");
                setSelectedUnit(null);
              }}
              variant="secondary"
              icon={<ArrowLeftIcon className="w-3.5 h-3.5 mr-1.5" />}
            ></Button>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {selectedUnit.name}
              </h2>
              <p className="text-xs text-gray-500">{selectedUnit.shortName}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => {
                setFormData({
                  name: selectedUnit.name,
                  shortName: selectedUnit.shortName,
                  description: selectedUnit.description,
                  dockerImage: selectedUnit.dockerImage,
                  defaultStartupCommand: selectedUnit.defaultStartupCommand,
                  configFiles: selectedUnit.configFiles || [],
                  environmentVariables: selectedUnit.environmentVariables || [],
                  installScript: selectedUnit.installScript,
                  startup: selectedUnit.startup,
                });
                setView("edit");
              }}
              variant="secondary"
              icon={<PencilIcon className="w-3.5 h-3.5 mr-1.5" />}
            >
              Edit
            </Button>
            <Button
              onClick={() => handleDelete(selectedUnit.id!)}
              icon={<TrashIcon className="w-3.5 h-3.5 mr-1.5" />}
              variant="danger"
            >
              Delete
            </Button>
            <Button
              onClick={() => handleExport(selectedUnit)}
              icon={<DownloadIcon className="w-3.5 h-3.5 mr-1.5" />}
              variant="secondary"
            >
              Export
            </Button>
          </div>
        </div>

        <Card className="bg-[#0E0E0F] border border-[#1E1E20] rounded-md shadow-xs p-6 space-y-4">
          <div>
            <div className="text-xs text-[#FFFFFF]">Description</div>
            <div className="text-sm mt-1 text-gray-400">
              {selectedUnit.description}
            </div>
          </div>

          <div className="pt-4 border-t border-[#1E1E20]">
            <div className="text-xs font-medium text-[#FFFFFF] mb-3">
              Docker Configuration
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-xs text-[#FFFFFF]">Image</div>
                <div className="text-sm font-mono mt-1 text-gray-400">
                  {selectedUnit.dockerImage}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#FFFFFF]">
                  Default Startup Command
                </div>
                <div className="text-sm font-mono mt-1 break-all text-gray-400">
                  {selectedUnit.defaultStartupCommand}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#1E1E20]">
            <div className="text-xs font-medium text-[#FFFFFF] mb-3">
              Environment Variables
            </div>
            {selectedUnit.environmentVariables.length > 0 ? (
              <div className="space-y-3">
                {selectedUnit.environmentVariables.map((variable, index) => (
                  <Card
                    key={index}
                    className="bg-[#0E0E0F] border border-[#1E1E20] p-3"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-[#FFFFFF]">Name</div>
                        <div className="text-sm font-mono mt-1 text-gray-400">
                          {variable.name}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">
                          Default Value
                        </div>
                        <div className="text-sm font-mono mt-1 text-gray-400">
                          {variable.defaultValue}
                        </div>
                      </div>
                    </div>
                    {variable.description && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-500">Description</div>
                        <div className="text-sm mt-1 text-gray-400">
                          {variable.description}
                        </div>
                      </div>
                    )}
                    <div className="mt-2 flex space-x-4">
                      <div className="text-xs text-gray-500">
                        {variable.required ? "Required" : "Optional"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {variable.userViewable ? "User Viewable" : "Hidden"}
                      </div>
                      <div className="text-xs text-gray-400">
                        {variable.userEditable ? "User Editable" : "Locked"}
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="text-xs text-gray-500">
                        Validation Rules
                      </div>
                      <div className="text-sm font-mono mt-1 text-gray-400">
                        {variable.rules}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500">
                No environment variables defined
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#1E1E20]">
            <div className="text-xs font-medium text-[#FFFFFF] mb-3">
              Configuration Files
            </div>
            {selectedUnit.configFiles.length > 0 ? (
              <div className="space-y-3">
                {selectedUnit.configFiles.map((file, index) => (
                  <div key={index} className="border-t border-[#1E1E20] p-3">
                    <div>
                      <div className="text-xs text-gray-500">Path</div>
                      <div className="text-sm font-mono mt-1 text-gray-400">
                        {file.path}
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="text-xs text-gray-500">Content</div>
                      <pre className="mt-1 p-2 bg-[#0E0E0F] rounded text-xs font-mono whitespace-pre-wrap text-gray-400">
                        {file.content}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500">
                No configuration files defined
              </div>
            )}
          </div>

          {/* Cargo Containers Section */}
          <div className="pt-4 border-t border-[#1E1E20]">
            <ContainerList
              unitId={selectedUnit.id}
              assignedContainers={assignedContainers}
              onRefresh={() => fetchUnitContainers(selectedUnit.id!)}
            />
          </div>

          <div className="pt-4 border-t border-[#1E1E20]">
            <div className="text-xs font-medium text-gray-400 mb-3">
              Install Script
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-xs text-gray-500">Docker Image</div>
                <div className="text-sm font-mono mt-1 text-gray-400">
                  {selectedUnit.installScript.dockerImage}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Entrypoint</div>
                <div className="text-sm font-mono mt-1 text-gray-400">
                  {selectedUnit.installScript.entrypoint}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Script</div>
                <pre className="mt-2 p-3 bg-[#0E0E0F] rounded-md text-xs font-mono overflow-auto text-gray-400">
                  {selectedUnit.installScript.script}
                </pre>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#1E1E20]">
            <div className="text-xs font-medium text-gray-400 mb-3">
              Startup Configuration
            </div>
            <div className="text-xs text-gray-500">
              {selectedUnit.startup.userEditable
                ? "Users can modify startup command"
                : "Startup command is locked"}
            </div>
          </div>

          {selectedUnit.createdAt && selectedUnit.updatedAt && (
            <div className="pt-4 border-t border-[#1E1E20] grid grid-cols-2">
              <div>
                <div className="text-xs text-gray-500">Created At</div>
                <div className="text-sm mt-1 text-gray-400">
                  {new Date(selectedUnit.createdAt).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Updated At</div>
                <div className="text-sm mt-1 text-gray-400">
                  {new Date(selectedUnit.updatedAt).toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  };

  // Main render
  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-[#0E0E0F]">
      <div className="p-6">
        {view === "list" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-[#FFFFFF]">Units</h1>
                <p className="text-xs text-gray-400 mt-1">
                  Manage units and their configuration for accessing the panel.
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="file"
                  id="importFile"
                  className="hidden"
                  accept=".json"
                  onChange={handleImportFile}
                />
                <Button
                  onClick={() => document.getElementById("importFile")?.click()}
                  variant="secondary"
                >
                  Import Unit
                </Button>
                <input
                  type="file"
                  id="importEgg"
                  className="hidden"
                  accept=".json"
                  onChange={handleImportEgg}
                />
                <Button
                  onClick={() => document.getElementById("importEgg")?.click()}
                  variant="secondary"
                >
                  Import Pterodactyl Egg
                </Button>
                <input
                  type="file"
                  id="importEgg"
                  className="hidden"
                  accept=".json"
                  onChange={handleImportEgg}
                />
                <Button onClick={() => setView("create")} variant="secondary">
                  Create Unit
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {units.map((unit) => (
                <Card
                  key={unit.id}
                  className="bg-[#0E0E0F] border-t border-[#1E1E20] cursor-pointer"
                  onClick={() => {
                    setSelectedUnit(unit);
                    setView("view");
                  }}
                >
                  <div className="px-6 h-20 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-[#FFFFFF]">
                        {unit.name}
                      </div>
                      <div className="text-xs mt-1 text-gray-400">
                        {unit.shortName} • {unit.dockerImage}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </Card>
              ))}

              {units.length === 0 && (
                <div className="text-center py-6 bg-[#0E0E0F] rounded-md border border-[#1E1E20]">
                  <p className="text-xs text-[#FFFFFF]">No units found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {view === "create" && renderUnitForm("create")}
        {view === "edit" && renderUnitForm("edit")}
        {view === "view" && renderUnitDetails()}
      </div>
    </div>
  );
};

export default AdminUnitsPage;
