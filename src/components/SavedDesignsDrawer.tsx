import { useState } from 'react';
import { X, Trash, Clock, Edit } from 'lucide-react';
import { useTableStore } from '../store/tableStore';

interface SavedDesignsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SavedDesignsDrawer({ isOpen, onClose }: SavedDesignsDrawerProps) {
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  
  const { savedDesigns, loadDesign, deleteDesign } = useTableStore();
  
  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // 加载设计
  const handleLoadDesign = (id: string) => {
    loadDesign(id);
    onClose();
  };
  
  // 确认删除设计
  const handleConfirmDelete = (id: string) => {
    setConfirmDelete(id);
  };
  
  // 删除设计
  const handleDeleteDesign = (id: string) => {
    deleteDesign(id);
    setConfirmDelete(null);
    
    // 如果删除的是当前选中的设计，取消选中
    if (selectedDesignId === id) {
      setSelectedDesignId(null);
    }
  };
  
  // 取消删除
  const handleCancelDelete = () => {
    setConfirmDelete(null);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-50">
      <div className="bg-white h-full w-full max-w-md overflow-auto">
        <div className="sticky top-0 bg-white z-10 border-b px-4 py-3 flex justify-between items-center">
          <h2 className="text-xl font-semibold">我的保存设计</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4">
          {savedDesigns.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>你还没有保存任何设计</p>
              <p className="mt-2 text-sm">创建一个设计并点击"保存"按钮</p>
            </div>
          ) : (
            <div className="space-y-4">
              {savedDesigns.map((design) => (
                <div 
                  key={design.id}
                  className={`border rounded p-4 transition-colors ${
                    selectedDesignId === design.id ? 'border-[color:var(--primary-color)] bg-blue-50' : 'hover:border-gray-400'
                  }`}
                  onClick={() => setSelectedDesignId(design.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-lg">{design.name}</h3>
                      {design.description && (
                        <p className="text-gray-600 mt-1 text-sm">{design.description}</p>
                      )}
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                        <Clock size={12} className="mr-1" />
                        创建于 {formatDate(design.createdAt)}
                      </div>
                    </div>
                    
                    {confirmDelete === design.id ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelDelete();
                          }}
                          className="px-2 py-1 text-xs btn-secondary"
                        >
                          取消
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDesign(design.id);
                          }}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded"
                        >
                          确认删除
                        </button>
                      </div>
                    ) : (
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmDelete(design.id);
                          }}
                          className="p-1 text-gray-500 hover:text-red-600"
                          title="删除设计"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {selectedDesignId === design.id && (
                    <div className="mt-4 pt-3 border-t flex justify-end">
                      <button
                        onClick={() => handleLoadDesign(design.id)}
                        className="flex items-center px-3 py-1.5 btn-primary"
                      >
                        <Edit size={14} className="mr-1" />
                        加载此设计
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 