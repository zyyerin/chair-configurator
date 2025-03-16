import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useChairStore } from '../store/chairStore';
import * as THREE from 'three';

export function ChairModel() {
  const meshRef = useRef<THREE.Mesh>(null);
  const parameters = useChairStore((state) => state.parameters);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
    }
  });

  // 根据材质类型返回相应的材质属性
  const getMaterialProps = () => {
    switch (parameters.material) {
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
          color: '#2C2C2C',
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

  return (
    <mesh ref={meshRef} position={[0, -0.5, 0]}>
      {/* Environment light for better material visualization */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} />
      <hemisphereLight intensity={0.3} />

      {/* Seat */}
      <mesh position={[0, parameters.seatHeight / 100, 0]}>
        <boxGeometry 
          args={[
            parameters.seatWidth / 100,
            0.05,
            parameters.seatDepth / 100
          ]} 
        />
        <meshStandardMaterial {...materialProps} />
      </mesh>

      {/* Backrest */}
      <mesh
        position={[
          0,
          parameters.seatHeight / 100 + parameters.backrestHeight / 200,
          -parameters.seatDepth / 200
        ]}
        rotation={[Math.PI * (90 - parameters.backrestAngle) / 180, 0, 0]}
      >
        <boxGeometry
          args={[
            parameters.seatWidth / 100,
            parameters.backrestHeight / 100,
            0.05
          ]}
        />
        <meshStandardMaterial {...materialProps} />
      </mesh>

      {/* Legs */}
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([x, z], index) => (
        <mesh
          key={index}
          position={[
            (x * parameters.seatWidth) / 250,
            parameters.seatHeight / 200,
            (z * parameters.seatDepth) / 250
          ]}
        >
          <cylinderGeometry args={[0.03, 0.03, parameters.seatHeight / 100]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      ))}
    </mesh>
  );
}