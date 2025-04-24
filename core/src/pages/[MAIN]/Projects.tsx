import React, { useState } from "react";
import { Plus, Pencil, Trash2, Server, AlertCircle } from "lucide-react";
import { useProjects } from "../../contexts/ProjectContext";
import { Button } from "@/components/UI";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// Dialog for creating/editing projects
interface ProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  initialName: string;
  initialDescription: string;
  onSubmit: (name: string, description: string) => void;
  isSubmitting: boolean;
  error?: string | null;
}

const ProjectDialog: React.FC<ProjectDialogProps> = ({
  isOpen,
  onClose,
  title,
  initialName,
  initialDescription,
  onSubmit,
  isSubmitting,
  error,
}) => {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [formError, setFormError] = useState<string | null>(error || null);

  React.useEffect(() => {
    setName(initialName);
    setDescription(initialDescription);
    setFormError(error ?? null);
  }, [initialName, initialDescription, error, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setFormError("Project name is required");
      return;
    }

    onSubmit(name, description);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Project Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Project"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description (optional)
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this project"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Main Projects Page Component
const ProjectsPage: React.FC = () => {
  const {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
  } = useProjects();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Handler for creating a project
  const handleCreateProject = async (name: string, description: string) => {
    setIsSubmitting(true);
    setActionError(null);

    try {
      await createProject(name, description);
      setCreateDialogOpen(false);
    } catch (err: any) {
      setActionError(err.message || "Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for updating a project
  const handleUpdateProject = async (name: string, description: string) => {
    if (!currentProject) return;

    setIsSubmitting(true);
    setActionError(null);

    try {
      await updateProject(currentProject.id, name, description);
      setEditDialogOpen(false);
    } catch (err: any) {
      setActionError(err.message || "Failed to update project");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for deleting a project
  const handleDeleteProject = async () => {
    if (!currentProject) return;

    setIsSubmitting(true);
    setActionError(null);

    try {
      await deleteProject(currentProject.id);
      setDeleteDialogOpen(false);
    } catch (err: any) {
      setActionError(err.message || "Failed to delete project");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error
              ? (error as any).message || String(error)
              : "Failed to load projects"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#0E0E0F] min-h-screen">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-[#FFFFFF]">Projects</h1>
            <p className="text-sm text-[#9CA3AF]">
              Create and manage your projects
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </Button>
        </div>

        {/* Project grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: any) => (
            <Card
              key={project.id}
              className="bg-[#0E0E0F] border border-[#1E1E20]"
            >
              <CardHeader>
                <div className="flex items-start">
                  <div className="h-10 w-10 bg-[#1A1A1A] rounded-lg flex items-center justify-center mr-3">
                    <span className="text-lg font-semibold text-[#9CA3AF]">
                      {project.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <CardTitle className="flex items-center text-[#FFFFFF]">
                      {project.name}
                      {project.isDefault && (
                        <Badge
                          variant="secondary"
                          className="ml-2 bg-[#1A1A1A] text-[#9CA3AF]"
                        >
                          Default
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-[#9CA3AF]">
                      {project.serverCount} server
                      {project.serverCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {project.description && (
                  <p className="text-sm text-[#9CA3AF]">
                    {project.description}
                  </p>
                )}

                <div className="mt-6 flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => (window.location.href = `/servers`)}
                  >
                    <Server className="w-3 h-3 mr-2" />
                    Servers
                  </Button>
                  {!project.isDefault && (
                    <div className="flex space-x-2 ml-auto">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setCurrentProject(project);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        className="text-[#9CA3AF] hover:text-[#FFFFFF] hover:bg-[#1A1A1A]"
                        onClick={() => {
                          setCurrentProject(project);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Create Project Dialog */}
      <ProjectDialog
        isOpen={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        title="Create Project"
        initialName=""
        initialDescription=""
        onSubmit={handleCreateProject}
        isSubmitting={isSubmitting}
        error={actionError}
      />

      {/* Edit Project Dialog */}
      <ProjectDialog
        isOpen={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        title="Edit Project"
        initialName={currentProject?.name || ""}
        initialDescription={currentProject?.description || ""}
        onSubmit={handleUpdateProject}
        isSubmitting={isSubmitting}
        error={actionError}
      />

      {/* Delete Project Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this project? This action cannot be
            undone.
          </p>
          <DialogFooter>
            <Button
              variant="danger"
              onClick={handleDeleteProject}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectsPage;
