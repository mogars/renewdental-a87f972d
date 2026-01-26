import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, Clock, Check, X } from "lucide-react";
import type { TreatmentType } from "@/types/database";

const TreatmentTypesSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDuration, setNewDuration] = useState("60");

  const { data: treatmentTypes, isLoading } = useQuery({
    queryKey: ["treatmentTypes"],
    queryFn: async () => {
      return apiGet<TreatmentType[]>("/treatment-types");
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ name, duration }: { name: string; duration: number }) => {
      return apiPost<TreatmentType>("/treatment-types", { name, duration_minutes: duration });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatmentTypes"] });
      setIsAdding(false);
      setNewName("");
      setNewDuration("60");
      toast({ title: "Succes", description: "Tip de tratament adăugat." });
    },
    onError: (error) => {
      toast({ title: "Eroare", description: "Nu s-a putut adăuga tipul de tratament.", variant: "destructive" });
      console.error(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, duration }: { id: string; name: string; duration: number }) => {
      return apiPut<TreatmentType>(`/treatment-types/${id}`, { name, duration_minutes: duration });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatmentTypes"] });
      setEditingId(null);
      toast({ title: "Succes", description: "Tip de tratament actualizat." });
    },
    onError: (error) => {
      toast({ title: "Eroare", description: "Nu s-a putut actualiza tipul de tratament.", variant: "destructive" });
      console.error(error);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiPut<TreatmentType>(`/treatment-types/${id}`, { is_active: isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatmentTypes"] });
    },
    onError: (error) => {
      toast({ title: "Eroare", description: "Nu s-a putut actualiza starea.", variant: "destructive" });
      console.error(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiDelete(`/treatment-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatmentTypes"] });
      toast({ title: "Succes", description: "Tip de tratament șters." });
    },
    onError: (error) => {
      toast({ title: "Eroare", description: "Nu s-a putut șterge tipul de tratament.", variant: "destructive" });
      console.error(error);
    },
  });

  const startEditing = (type: TreatmentType) => {
    setEditingId(type.id);
    setEditName(type.name);
    setEditDuration(type.duration_minutes.toString());
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName("");
    setEditDuration("");
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim() || !editDuration) return;
    updateMutation.mutate({ id: editingId, name: editName.trim(), duration: parseInt(editDuration) });
  };

  const handleAdd = () => {
    if (!newName.trim() || !newDuration) return;
    createMutation.mutate({ name: newName.trim(), duration: parseInt(newDuration) });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add new treatment type */}
      {isAdding ? (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
          <div className="flex-1">
            <Input
              placeholder="Nume tratament"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <div className="w-24">
            <Input
              type="number"
              placeholder="Min"
              value={newDuration}
              onChange={(e) => setNewDuration(e.target.value)}
              min={5}
              max={480}
            />
          </div>
          <span className="text-sm text-muted-foreground">min</span>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleAdd}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setIsAdding(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setIsAdding(true)} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Adaugă tip de tratament
        </Button>
      )}

      {/* List of treatment types */}
      <div className="space-y-2">
        {treatmentTypes?.map((type) => (
          <div
            key={type.id}
            className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            {editingId === type.id ? (
              <>
                <div className="flex-1">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="w-24">
                  <Input
                    type="number"
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                    min={5}
                    max={480}
                  />
                </div>
                <span className="text-sm text-muted-foreground">min</span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={saveEdit}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={cancelEditing}>
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <div className="flex-1">
                  <span className={type.is_active ? "" : "text-muted-foreground line-through"}>
                    {type.name}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{type.duration_minutes} min</span>
                </div>
                <Switch
                  checked={type.is_active}
                  onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: type.id, isActive: checked })}
                />
                <Button size="icon" variant="ghost" onClick={() => startEditing(type)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => deleteMutation.mutate(type.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TreatmentTypesSettings;
