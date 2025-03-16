# MeshRare Chair Configurator

一个基于Three.js的3D椅子配置器，允许用户自定义椅子的材质、尺寸等参数，并通过AI助手获取设计建议。

## 功能特点

- 实时3D预览
- 多种材质选择（钛金属、青铜、塑料、不锈钢）
- 可调节的椅子尺寸（座椅宽度、高度、靠背高度）
- 智能AI设计助手（基于智谱AI）
- 实时价格计算

## 技术栈

- React
- TypeScript
- Three.js (@react-three/fiber)
- Tailwind CSS
- 智谱AI API

## 开始使用

1. 克隆仓库：
```bash
git clone [repository-url]
cd chair-configurator
```

2. 安装依赖：
```bash
npm install
```

3. 创建环境变量文件：
创建 `.env.local` 文件并添加您的智谱AI API密钥：
```
VITE_ZHIPU_API_KEY=your_api_key_here
```

4. 启动开发服务器：
```bash
npm run dev
```

## 使用说明

1. 在右侧面板中调整椅子的参数（材质、尺寸等）
2. 使用鼠标拖动来旋转查看3D模型
3. 在聊天框中输入需求，获取AI的设计建议
4. 点击"保存设计"或"立即购买"来处理您的设计

## 贡献

欢迎提交问题和拉取请求。

## 许可证

MIT 