import React, { useState } from 'react';
import { TransmittalItem, TableColumn, ColumnId } from './types';
import { Trash2, Plus, GripVertical } from 'lucide-react';

interface TransmittalTableProps {
  items: TransmittalItem[];
  onUpdate: (id: string, field: keyof TransmittalItem, value: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  columns: TableColumn[];
  onColumnReorder: (columns: TableColumn[]) => void;
}

export const TransmittalTable: React.FC<TransmittalTableProps> = ({ 
  items, 
  onUpdate, 
  onDelete, 
  onAdd, 
  columns, 
  onColumnReorder 
}) => {
  const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedColumnIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedColumnIndex === null || draggedColumnIndex === index) return;
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    if (draggedColumnIndex === null) return;
    
    const newColumns = [...columns];
    const [movedColumn] = newColumns.splice(draggedColumnIndex, 1);
    newColumns.splice(dropIndex, 0, movedColumn);
    
    onColumnReorder(newColumns);
    setDraggedColumnIndex(null);
  };

  // Helper to render the correct input based on column ID
  const renderCellInput = (item: TransmittalItem, colId: ColumnId) => {
    switch (colId) {
      case 'documentType':
        return (
          <input 
            type="text" 
            value={item.documentType}
            onChange={(e) => onUpdate(item.id, 'documentType', e.target.value)}
            className="w-full text-sm border-slate-200 bg-transparent focus:ring-1 focus:ring-blue-500 rounded p-1"
          />
        );
      case 'description':
        return (
          <>
            <textarea 
              value={item.description}
              onChange={(e) => onUpdate(item.id, 'description', e.target.value)}
              rows={2}
              className="w-full text-sm border-slate-200 bg-transparent focus:ring-1 focus:ring-blue-500 rounded p-1 resize-y"
            />
            <div className="text-[10px] text-slate-400 px-1 truncate print:hidden" title={item.originalFilename}>
              src: {item.originalFilename}
            </div>
          </>
        );
      case 'qty':
        return (
          <input 
            type="text" 
            value={item.qty}
            onChange={(e) => onUpdate(item.id, 'qty', e.target.value)}
            className="w-full text-center border-none bg-transparent focus:ring-1 focus:ring-blue-500 rounded p-1"
          />
        );
      case 'remarks':
        return (
          <input 
            type="text" 
            value={item.remarks}
            onChange={(e) => onUpdate(item.id, 'remarks', e.target.value)}
            className="w-full text-sm border-none bg-transparent focus:ring-1 focus:ring-blue-500 rounded p-1"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="text-xs text-slate-500 uppercase bg-slate-100 border-b border-slate-200">
            <tr>
              {columns.map((col, index) => (
                <th 
                  key={col.id} 
                  className={`px-4 py-3 font-semibold ${col.width} cursor-move relative group border-r border-transparent hover:border-slate-300 transition-colors`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  <div className="flex items-center gap-1 justify-center md:justify-start">
                    <GripVertical className="w-3 h-3 text-slate-300 group-hover:text-slate-500 no-print" />
                    <span>{col.label}</span>
                  </div>
                </th>
              ))}
              <th className="px-2 py-3 w-[7%] text-center no-print">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id} className="bg-white hover:bg-slate-50 transition-colors group">
                {columns.map((col) => (
                  <td key={col.id} className="p-2 align-top">
                    {renderCellInput(item, col.id)}
                  </td>
                ))}
                
                <td className="p-2 text-center align-middle no-print">
                  <button 
                    onClick={() => onDelete(item.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Remove Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
                <tr>
                    <td colSpan={columns.length + 1} className="p-8 text-center text-slate-400 italic">
                        No items yet. Scan a drive or add a row manually.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="p-4 bg-slate-50 border-t border-slate-200 no-print flex justify-center">
        <button 
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-colors shadow-sm text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Manual Row
        </button>
      </div>
    </div>
  );
};