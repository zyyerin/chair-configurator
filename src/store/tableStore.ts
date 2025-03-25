import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 桌子参数接口
interface TableParameters {
  tableWidth: number;  // 桌子宽度
  tableLength: number; // 桌子长度
  legHeight: number;   // 桌腿高度
  legWidth: number;    // 桌腿宽度
  legMinWidth: number; // 桌腿底部最小宽度
  legTiltAngle: number; // 桌腿倾斜角度
  tableThickness: number; // 桌面厚度
  roundedCorners: number; // 桌面圆角百分比 (0-100)
  material: 'titanium' | 'bronze' | 'plastic' | 'stainless_steel';
  plasticColor: string; // 塑料颜色RGB值
}

// 已保存设计接口
interface SavedDesign {
  id: string;
  name: string;
  description?: string;
  parameters: TableParameters;
  createdAt: string;
  updatedAt: string;
}

// 桌子状态接口
interface TableState {
  parameters: TableParameters;
  savedDesigns: SavedDesign[];
  updateParameter: <K extends keyof TableParameters>(parameter: K, value: TableParameters[K]) => void;
  calculatePrice: () => number;
  saveDesign: (name: string, description?: string) => SavedDesign;
  loadDesign: (id: string) => void;
  deleteDesign: (id: string) => void;
}

// 默认值
const defaultParameters: TableParameters = {
  tableWidth: 60,  // 60cm 宽
  tableLength: 120, // 120cm 长
  legHeight: 75,    // 75cm 高
  legWidth: 4,      // 4cm 宽
  legMinWidth: 2,   // 2cm 底部宽度
  legTiltAngle: 0,  // 默认0度倾斜角度
  tableThickness: 3, // 3cm 厚
  roundedCorners: 5, // 默认5%圆角
  material: 'stainless_steel',
  plasticColor: '#2C2C2C'  // 默认黑色
};

// 创建存储
export const useTableStore = create<TableState>()(
  persist(
    (set, get) => ({
      parameters: { ...defaultParameters },
      savedDesigns: [],
      
      // 更新参数
      updateParameter: (parameter, value) => {
        set((state) => ({
          parameters: {
            ...state.parameters,
            [parameter]: value
          }
        }));
      },
      
      // 计算价格
      calculatePrice: () => {
        const { parameters } = get();
        
        // 基础价格
        let price = 10000;
        
        // 根据尺寸调整价格
        price += (parameters.tableWidth - 60) * 200;
        price += (parameters.tableLength - 120) * 150;
        price += (parameters.legHeight - 75) * 100;
        price += (parameters.tableThickness - 3) * 500;
        price += (parameters.legWidth - 4) * 200;
        price += (parameters.legMinWidth - 2) * 150;
        price += Math.abs(parameters.legTiltAngle) * 50; // 倾斜角度加工费
        
        // 圆角加工费用
        price += parameters.roundedCorners * 30; // 圆角程度越高，加工费用越高
        
        // 根据材质调整价格
        const materialMultiplier = {
          'titanium': 1.8,
          'bronze': 1.5,
          'plastic': 0.8,
          'stainless_steel': 1.2
        };
        
        price *= materialMultiplier[parameters.material];
        
        return Math.max(5000, Math.round(price));
      },
      
      // 保存设计
      saveDesign: (name, description = '') => {
        const { parameters, savedDesigns } = get();
        const now = new Date().toISOString();
        
        const newDesign: SavedDesign = {
          id: Date.now().toString(),
          name,
          description,
          parameters: { ...parameters },
          createdAt: now,
          updatedAt: now
        };
        
        set({ savedDesigns: [...savedDesigns, newDesign] });
        return newDesign;
      },
      
      // 加载设计
      loadDesign: (id) => {
        const { savedDesigns } = get();
        const design = savedDesigns.find(d => d.id === id);
        
        if (design) {
          set({ parameters: { ...design.parameters } });
        }
      },
      
      // 删除设计
      deleteDesign: (id) => {
        const { savedDesigns } = get();
        set({ savedDesigns: savedDesigns.filter(d => d.id !== id) });
      }
    }),
    {
      name: 'table-design-storage', // localStorage的键名
      partialize: (state) => ({ savedDesigns: state.savedDesigns }), // 只持久化已保存的设计
    }
  )
); 