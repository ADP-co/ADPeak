import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, PlusCircle, Trash2, GripVertical } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { toast } from 'sonner';

export const IndicatorConfigForm = ({ onBack }: { onBack?: () => void }) => {
  const { code } = useParams();
  const navigate = useNavigate();
  
  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };
  
  const [indicatorName, setIndicatorName] = useState('Nombre del indicador (Ejemplo)');
  const [columns, setColumns] = useState([
    { id: '1', label: 'Delegación', type: 'readonly' },
    { id: '2', label: 'Plantel', type: 'readonly' },
    { id: '3', label: 'Programa Educativo', type: 'readonly' },
    { id: '4', label: 'Hombres', type: 'number' },
    { id: '5', label: 'Mujeres', type: 'number' },
  ]);

  const handleAddColumn = () => {
    const newCol = { id: Date.now().toString(), label: 'Nueva Columna', type: 'number' };
    setColumns([...columns, newCol]);
  };

  const handleRemoveColumn = (id: string) => {
    setColumns(columns.filter(col => col.id !== id));
  };

  const handleChangeColumn = (id: string, field: string, value: string) => {
    setColumns(columns.map(col => col.id === id ? { ...col, [field]: value } : col));
  };

  const handleSave = () => {
    // En un futuro, aquí se enviará la estructura dinámica del indicador (template) al backend
    toast.success('Configuración guardada', {
      description: 'La estructura de campos del indicador se ha actualizado correctamente.'
    });
    handleBack();
  };

  return (
    <div className="w-full max-w-[1000px] mx-auto bg-brand-Blanco rounded-lg shadow-md border border-brand-Gris_bajo/20 p-6">
      {/* Cabecera */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <span className="text-sm font-accent text-brand-Gris_oscuro/60 font-bold tracking-wider">
            CONFIGURACIÓN DE INDICADOR
          </span>
          <h1 className="font-title text-2xl font-bold text-brand-Gris_oscuro mt-1">
            {code}
          </h1>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={handleBack}
          className="flex items-center gap-2 text-xs py-1.5 px-4 border-transparent"
        >
          <ArrowLeft size={18} strokeWidth={2.5} />
          Volver
        </Button>
      </div>

      <div className="space-y-6">
        {/* Nombre General */}
        <div>
          <label className="block text-sm font-bold font-accent text-brand-Gris_oscuro mb-1">
            Nombre del Indicador
          </label>
          <Input 
            label="" 
            value={indicatorName}
            onChange={(e) => setIndicatorName(e.target.value)}
          />
        </div>

        {/* Constructor de Columnas */}
        <div className="border border-brand-Gris_bajo/40 rounded-lg p-6 bg-brand-Gris_bajo/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-title font-bold text-brand-Gris_oscuro">Campos a Capturar (Columnas)</h3>
            <Button type="button" variant="secondary" onClick={handleAddColumn} className="flex items-center gap-2 text-xs py-1.5 border-brand-Verde_principal text-brand-Verde_principal hover:bg-brand-Verde_principal/10">
              <PlusCircle size={16} />
              Agregar Campo
            </Button>
          </div>

          <div className="space-y-3">
            {columns.map((col) => (
              <div key={col.id} className="flex items-center gap-4 bg-brand-Blanco p-3 rounded-md border border-brand-Gris_bajo/20 shadow-sm transition-all hover:shadow-md">
                <GripVertical size={20} className="text-brand-Gris_oscuro/30 cursor-grab hover:text-brand-Gris_oscuro/60" />
                
                <div className="flex-1">
                  <Input 
                    label="" 
                    placeholder="Nombre de la columna"
                    value={col.label}
                    onChange={(e) => handleChangeColumn(col.id, 'label', e.target.value)}
                    className="w-full !p-2 h-10 mb-0"
                  />
                </div>

                <div className="w-48">
                  <select 
                    className="w-full h-10 rounded-md border border-brand-Gris_bajo/50 px-3 text-sm text-brand-Gris_oscuro font-body bg-brand-Blanco outline-none focus:border-brand-Verde_principal focus:ring-1 focus:ring-brand-Verde_principal"
                    value={col.type}
                    onChange={(e) => handleChangeColumn(col.id, 'type', e.target.value)}
                  >
                    <option value="readonly">Solo Lectura (Fijo)</option>
                    <option value="number">Número</option>
                    <option value="text">Texto</option>
                    <option value="calculated">Calculado</option>
                  </select>
                </div>

                <button 
                  onClick={() => handleRemoveColumn(col.id)}
                  className="p-2 text-brand-Gris_oscuro/40 hover:text-brand-Status_rojo transition-colors rounded-md hover:bg-brand-Status_rojo/10"
                  title="Eliminar campo"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {columns.length === 0 && (
              <p className="text-sm text-brand-Gris_oscuro/60 text-center py-4 bg-brand-Blanco rounded-md border border-brand-Gris_bajo/20 border-dashed">
                No hay campos configurados. Agrega uno nuevo para que el plantel pueda capturar.
              </p>
            )}
          </div>
        </div>

        {/* Guardar */}
        <div className="flex justify-end pt-4 border-t border-brand-Gris_bajo/20">
          <Button type="button" variant="primary" onClick={handleSave} className="px-8">
            Guardar Configuración
          </Button>
        </div>
      </div>
    </div>
  );
};