import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Shield } from 'lucide-react';

interface CreatePolicyDialogProps {
  onCreated: () => void;
}

export function CreatePolicyDialog({ onCreated }: CreatePolicyDialogProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    policy_type: 'access',
    status: 'draft',
  });
  const [conditions, setConditions] = useState<string[]>(['']);

  const handleAddCondition = () => {
    setConditions([...conditions, '']);
  };

  const handleConditionChange = (index: number, value: string) => {
    const newConditions = [...conditions];
    newConditions[index] = value;
    setConditions(newConditions);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id) {
      toast({
        title: 'Error',
        description: 'No se encontró la organización',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const validConditions = conditions.filter(c => c.trim() !== '');
      
      const { error } = await supabase
        .from('policies')
        .insert({
          organization_id: profile.organization_id,
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          policy_type: formData.policy_type,
          status: formData.status,
          conditions: validConditions,
          applies_to: 0,
        });

      if (error) throw error;

      toast({
        title: 'Política creada',
        description: `${formData.name} ha sido creada exitosamente`,
      });

      setOpen(false);
      setFormData({ name: '', description: '', policy_type: 'access', status: 'draft' });
      setConditions(['']);
      onCreated();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Crear Política
        </Button>
      </DialogTrigger>
      <DialogContent className="glass max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Nueva Política Zero Trust</DialogTitle>
              <DialogDescription>
                Define reglas de acceso y seguridad
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la Política *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="MFA Obligatorio para Producción"
              required
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe qué hace esta política..."
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select 
                value={formData.policy_type} 
                onValueChange={(value) => setFormData({ ...formData, policy_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="access">Acceso</SelectItem>
                  <SelectItem value="device">Dispositivo</SelectItem>
                  <SelectItem value="network">Red</SelectItem>
                  <SelectItem value="authentication">Autenticación</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Condiciones</Label>
            <div className="space-y-2">
              {conditions.map((condition, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={condition}
                    onChange={(e) => handleConditionChange(index, e.target.value)}
                    placeholder="Ej: Solo dispositivos enrollados"
                  />
                  {conditions.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleRemoveCondition(index)}
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCondition}
              >
                + Agregar condición
              </Button>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 glow-neon" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Política'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}