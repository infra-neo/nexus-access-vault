import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Building2 } from 'lucide-react';

interface CreateOrganizationDialogProps {
  onCreated: () => void;
}

export function CreateOrganizationDialog({ onCreated }: CreateOrganizationDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    logo_url: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name: formData.name.trim(),
          logo_url: formData.logo_url.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Organización creada',
        description: `${formData.name} ha sido creada exitosamente`,
      });

      setOpen(false);
      setFormData({ name: '', logo_url: '' });
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
        <Button className="glow-neon">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Organización
        </Button>
      </DialogTrigger>
      <DialogContent className="glass">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Nueva Organización</DialogTitle>
              <DialogDescription>
                Crea una organización para gestionar usuarios y recursos
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la Organización *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Mi Empresa S.A."
              required
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logo_url">URL del Logo (opcional)</Label>
            <Input
              id="logo_url"
              type="url"
              value={formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              placeholder="https://ejemplo.com/logo.png"
            />
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
              {loading ? 'Creando...' : 'Crear Organización'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}