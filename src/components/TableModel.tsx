import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTableStore } from '../store/tableStore';
import * as THREE from 'three';

export function TableModel() {
  const meshRef = useRef<THREE.Group>(null);
  
  // 使用单独的selectors获取各个参数，确保更新触发重渲染
  const tableWidth = useTableStore((state) => state.parameters.tableWidth);
  const tableLength = useTableStore((state) => state.parameters.tableLength);
  const tableThickness = useTableStore((state) => state.parameters.tableThickness);
  const legHeight = useTableStore((state) => state.parameters.legHeight);
  const legWidth = useTableStore((state) => state.parameters.legWidth);
  const legMinWidth = useTableStore((state) => state.parameters.legMinWidth);
  const legTiltAngle = useTableStore((state) => state.parameters.legTiltAngle);
  const material = useTableStore((state) => state.parameters.material);
  const plasticColor = useTableStore((state) => state.parameters.plasticColor);
  const roundedCorners = useTableStore((state) => state.parameters.roundedCorners);
  
  // 将所有参数合并供其他函数使用
  const parameters = {
    tableWidth,
    tableLength,
    tableThickness,
    legHeight,
    legWidth,
    legMinWidth,
    legTiltAngle,
    material,
    plasticColor,
    roundedCorners
  };

  console.log('TableModel重新渲染，roundedCorners =', roundedCorners);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
    }
  });

  // 根据材质类型返回相应的材质属性
  const getMaterialProps = () => {
    switch (material) {
      case 'titanium':
        return {
          metalness: 0.9,
          roughness: 0.2,
          color: '#A6A8AB',
          envMapIntensity: 1.5
        };
      case 'bronze':
        return {
          metalness: 0.9,
          roughness: 0.3,
          color: '#CD7F32',
          envMapIntensity: 1.2
        };
      case 'plastic':
        return {
          metalness: 0.0,
          roughness: 0.8,
          color: plasticColor, // 使用用户选择的塑料颜色
          envMapIntensity: 0.5
        };
      case 'stainless_steel':
        return {
          metalness: 1.0,
          roughness: 0.1,
          color: '#E8E8E8',
          envMapIntensity: 2.0
        };
      default:
        return {
          metalness: 0.5,
          roughness: 0.5,
          color: '#808080',
          envMapIntensity: 1.0
        };
    }
  };

  const materialProps = getMaterialProps();

  // 计算桌腿位置，根据圆角百分比调整位置
  const legPositions = useMemo(() => {
    const width = tableWidth / 100;
    const length = tableLength / 100;
    
    // 计算桌腿位置的X和Z坐标
    const halfWidth = width / 2;
    const halfLength = length / 2;
    
    // 固定的内缩比例，不随圆角变化
    // 使用固定的内缩距离确保桌腿始终位于桌面下方
    // 这里使用0.65的内缩比例，距离边缘约35%
    const insetRatio = 0.65;
    
    // 桌腿内缩的距离
    const insetX = halfWidth * insetRatio;
    const insetZ = halfLength * insetRatio;
    
    return [
      [-insetX, -insetZ], // 左后
      [-insetX, insetZ],  // 左前
      [insetX, -insetZ],  // 右后
      [insetX, insetZ]    // 右前
    ];
  }, [tableWidth, tableLength]);

  // 创建带圆角的桌面几何体
  const tableGeometry = useMemo(() => {
    console.log('重新计算桌面几何体，roundedCorners =', roundedCorners);
    // 将参数转换为适合Three.js的单位
    const width = tableWidth / 100;
    const length = tableLength / 100;
    const thickness = tableThickness / 100;
    const roundedPercent = roundedCorners / 100; // 使用专门的selector获取的值
    
    // 如果圆角为0，直接使用BoxGeometry
    if (roundedPercent < 0.05) {
      return new THREE.BoxGeometry(width, thickness, length);
    }
    
    // 创建2D形状
    const shape = new THREE.Shape();
    
    // 选择短边作为计算圆角的基准
    const shortSide = Math.min(width, length);
    
    // 计算圆角半径，确保不超过短边的一半
    const maxRadius = shortSide / 2;
    const radius = maxRadius * Math.min(roundedPercent, 0.95);
    
    // 正常的圆角矩形逻辑
    const halfWidth = width / 2;
    const halfLength = length / 2;
    
    // 矩形的有效尺寸（去除圆角部分）
    const rectWidth = halfWidth - radius;
    const rectLength = halfLength - radius;
    
    // 绘制带圆角的矩形 - 从左下角开始，顺时针
    shape.moveTo(-rectWidth, -halfLength);
    shape.lineTo(rectWidth, -halfLength);
    shape.absarc(rectWidth, -rectLength, radius, Math.PI * 1.5, Math.PI * 2, false);
    shape.lineTo(halfWidth, rectLength);
    shape.absarc(rectWidth, rectLength, radius, 0, Math.PI * 0.5, false);
    shape.lineTo(-rectWidth, halfLength);
    shape.absarc(-rectWidth, rectLength, radius, Math.PI * 0.5, Math.PI, false);
    shape.lineTo(-halfWidth, -rectLength);
    shape.absarc(-rectWidth, -rectLength, radius, Math.PI, Math.PI * 1.5, false);
    
    // 挤出设置
    const extrudeSettings = {
      steps: 1,
      depth: thickness,
      bevelEnabled: false
    };
    
    // 返回挤出几何体
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [tableWidth, tableLength, tableThickness, roundedCorners]);

  // 计算桌腿倾斜偏移量
  const calculateLegTilt = (x: number, z: number) => {
    // 将倾斜角度从度数转换为弧度
    const tiltRadians = (legTiltAngle / 180) * Math.PI;
    
    // 计算倾斜偏移量 - 正值表示向内倾斜，负值表示向外倾斜
    const heightMeters = legHeight / 100;
    
    // 计算倾斜距离 (sin(倾斜角) * 高度)
    const tiltOffset = Math.sin(tiltRadians) * heightMeters;
    
    // 根据桌腿位置计算X和Z方向的偏移
    // 如果x为正，则X方向偏移为负（向内倾斜），反之为正
    // 如果z为正，则Z方向偏移为负（向内倾斜），反之为正
    const offsetX = x > 0 ? -tiltOffset : tiltOffset;
    const offsetZ = z > 0 ? -tiltOffset : tiltOffset;
    
    return [offsetX, offsetZ];
  };

  // 计算顶部和底部的正确位置和旋转
  const calculateLegTransform = (x: number, z: number) => {
    // 计算倾斜偏移量
    const [tiltX, tiltZ] = calculateLegTilt(x, z);
    
    // 桌腿顶部位置不变
    const topX = x;
    const topZ = z;
    
    // 桌腿底部位置根据倾斜角度偏移
    const bottomX = x + tiltX;
    const bottomZ = z + tiltZ;
    
    // 计算桌腿倾斜方向和角度
    // 首先计算从顶部到底部的向量
    const dx = bottomX - topX;
    const dz = bottomZ - topZ;
    
    // 计算桌腿的倾斜弧度和方向
    const angle = Math.atan2(Math.sqrt(dx * dx + dz * dz), legHeight / 100);
    const direction = Math.atan2(dz, dx);
    
    return {
      position: [
        (topX + bottomX) / 2,  // X坐标中心点
        legHeight / 200,       // Y坐标
        (topZ + bottomZ) / 2   // Z坐标中心点
      ],
      rotation: [
        // 绕X轴旋转
        Math.sin(direction) * angle,
        // 不需要绕Y轴旋转
        0,
        // 绕Z轴旋转
        -Math.cos(direction) * angle
      ],
      bottom: [bottomX, bottomZ]
    };
  };

  return (
    <group ref={meshRef} position={[0, -0.5, 0]}>
      {/* Environment light for better material visualization */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} />
      <hemisphereLight intensity={0.3} />

      {/* 桌面 */}
      <mesh position={[0, legHeight / 100, -tableThickness / 200]} rotation={[Math.PI / 2, 0, 0]}>
        <primitive object={tableGeometry} />
        <meshStandardMaterial {...materialProps} />
      </mesh>

      {/* 桌腿 */}
      {legPositions.map(([x, z], index) => {
        // 计算桌腿变换参数
        const legTransform = calculateLegTransform(x, z);
        
        // 转换宽度从厘米到米
        const topRadius = legWidth / 200;  // 顶部半径
        const bottomRadius = legMinWidth / 200;  // 底部半径
        
        return (
          <group key={index}>
            {/* 使用锥形圆柱体表示桌腿 */}
            <mesh 
              position={legTransform.position as [number, number, number]} 
              rotation={legTransform.rotation as [number, number, number]}
            >
              <cylinderGeometry 
                args={[
                  topRadius,           // 顶部半径
                  bottomRadius,        // 底部半径
                  legHeight / 100,     // 高度
                  16,                  // 径向分段
                  1,                   // 高度分段
                  false                // 是否开放端
                ]} 
              />
              <meshStandardMaterial {...materialProps} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
} 