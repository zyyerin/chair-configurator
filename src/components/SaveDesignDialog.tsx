import { useState } from 'react';
import { X } from 'lucide-react';
import { useTableStore } from '../store/tableStore';

interface SaveDesignDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (designId: string) => void;
}

export function SaveDesignDialog({ isOpen, onClose, onSaved }: SaveDesignDialogProps) {
  const [designName, setDesignName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const { saveDesign } = useTableStore();
  
  // 重置表单
  const resetForm = () => {
    setDesignName('');
    setDescription('');
    setError(null);
  };
  
  // 关闭对话框
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  // 保存设计
  const handleSave = () => {
    // 验证表单
    if (!designName.trim()) {
      setError('请输入设计名称');
      return;
    }
    
    try {
      setIsSaving(true);
      
      // 保存设计
      const newDesign = saveDesign(designName, description);
      
      // 重置表单并关闭对话框
      resetForm();
      onClose();
      
      // 通知父组件保存成功
      if (onSaved && newDesign) {
        onSaved(newDesign.id);
      }
    } catch (error) {
      console.error('保存设计失败:', error);
      setError('保存设计失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded p-6 w-full max-w-md card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">保存设计</h2>
          <button 
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            设计名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={designName}
            onChange={(e) => setDesignName(e.target.value)}
            className="w-full input-field px-3 py-2"
            placeholder="例如：我的现代办公桌"
            disabled={isSaving}
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            描述（可选）
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full input-field px-3 py-2"
            placeholder="简单描述一下你的设计..."
            rows={3}
            disabled={isSaving}
          />
        </div>
        
        <div className="flex justify-end space-x-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 btn-secondary"
            disabled={isSaving}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 btn-primary focus:ring-2 focus:ring-[color:var(--primary-color)] focus:ring-offset-2"
            disabled={isSaving}
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
} 