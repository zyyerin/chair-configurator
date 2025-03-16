import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Grid } from '@react-three/drei';
import { ChairModel } from './components/ChairModel';
import { ConfigPanel } from './components/ConfigPanel';

function App() {
  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="bg-black text-white p-4">
        <h1 className="text-xl font-semibold">MeshRare Chair Configurator</h1>
      </header>

      <div className="flex flex-1 p-8 gap-8">
        {/* 3D Viewer */}
        <div className="w-1/2 h-full bg-gray-200 rounded overflow-hidden">
          <Canvas>
            <color attach="background" args={['#f5f5f5']} />
            <PerspectiveCamera makeDefault position={[2, 1.5, 2]} />
            <OrbitControls enableDamping target={[0, 0.5, 0]} />
            <Environment preset="studio" />
            <Grid 
              position={[0, -0.51, 0]} 
              args={[10, 10]} 
              cellSize={0.2} 
              cellThickness={0.7} 
              cellColor="#808080" 
              sectionSize={1}
              sectionThickness={1}
              sectionColor="#808080"
              fadeDistance={10}
              infiniteGrid
            />
            <ChairModel />
          </Canvas>
        </div>

        {/* Configuration Panel */}
        <div className="w-1/2 h-full">
          <ConfigPanel />
        </div>
      </div>
    </div>
  );
}

export default App;