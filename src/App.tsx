import React, { useState, useEffect, useRef, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Html,
  OrbitControls,
  GizmoHelper,
  GizmoViewport,
  PivotControls,
  Line,
  OrthographicCamera,
} from "@react-three/drei";
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Panel,
  // Node,
  Edge,
  NodeProps,
  MarkerType,
  MiniMap,

} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import * as THREE from "three";
import { cn } from "../utils/class-join";
import { RiDeleteBin6Line } from "react-icons/ri";

// Define TypeScript interfaces
interface FlowContextType {
  selectedNode: string | null;
  setSelectedNode: (id: string | null) => void;
  updateNodePosition: (id: string, newPos: { x: number; y: number }) => void;
  deleteNode: (id: string) => void;
}

interface Data {
  label: string;
}

interface Node3DProps {
  id: string;
  data: Data;
  selected: boolean;
  position: { x: number; y: number };
}

interface Edge3DProps {
  source: string;
  target: string;
  sourcePosition: { x: number; y: number };
  targetPosition: { x: number; y: number };
}

// Shared state context for synchronizing 2D and 3D views
const FlowContext = React.createContext<FlowContextType>({
  selectedNode: null,
  setSelectedNode: () => {},
  updateNodePosition: () => {},
  deleteNode: () => {},
});

// Custom node for 2D React Flow
const CustomNode = (props: NodeProps) => {
  const [optionMenuON, setOptionMenuON] = useState(false);
  const { selectedNode, setSelectedNode, deleteNode } = React.useContext(FlowContext);

  const handleNodeClick = () => {
    setSelectedNode(props.id);
    setOptionMenuON(!optionMenuON);
  };

  const handleDeleteNode = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    deleteNode(props.id);
    setOptionMenuON(false);
  };

  return (
    <div
      className={cn(
        "relative p-2.5 rounded text-white w-[150px] text-center font-medium shadow-md",
        selectedNode === props.id
          ? "bg-[#ff8800] border-2 border-[#ffcc00]"
          : "bg-[#2a2a2a] border border-[#444444]"
      )}
      onClick={handleNodeClick}
    >
      {optionMenuON && 
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs flex gap-2 p-1 bg-[#0f0f0f] rounded-sm z-50 whitespace-nowrap">
          <button 
            onClick={handleDeleteNode}
            className="hover:text-red-500 transition-colors"
          >
            <RiDeleteBin6Line />
          </button>
        </div>
      }
      <div>{props.data.label as string}</div>
    </div>
  );
};

// 3D node representation
const Node3D = ({ id, data, position }: Node3DProps) => {
  const [optionMenuON, setOptionMenuON] = useState(false);

  const groupRef = useRef<THREE.Group>(null);
  const initialPositionRef = useRef({ x: position.x / 50, y: -position.y / 50, z: 0.005 });
  const isDraggingRef = useRef(false);
  const { selectedNode, setSelectedNode, updateNodePosition, deleteNode } =
    React.useContext(FlowContext);

  // Handle transform changes in 3D environment
  const handleTransformChange = (matrix: THREE.Matrix4) => {
    if (groupRef.current) {
      if (!isDraggingRef.current) {
        // First drag - ensure we start from the correct position
        isDraggingRef.current = true;
        groupRef.current.position.copy(new THREE.Vector3(
          initialPositionRef.current.x,
          initialPositionRef.current.y,
          initialPositionRef.current.z
        ));
      }
      
      // Extract position from matrix
      const position = new THREE.Vector3();
      position.setFromMatrixPosition(matrix);
      
      // Update the node position in the flow context
      updateNodePosition(id, {
        x: position.x * 50,
        y: -position.y * 50,
      });
    }
  };

  const handleDeleteNode = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    deleteNode(id);
    setOptionMenuON(false);
  };

  // Set initial position when component mounts or position changes
  useEffect(() => {
    if (groupRef.current) {
      const x = position.x / 50;
      const y = -position.y / 50;
      groupRef.current.position.set(x, y, 0.005);
      initialPositionRef.current = { x, y, z: 0.005 };
      
      // Reset dragging state when position externally changes
      isDraggingRef.current = false;
    }
  }, [position.x, position.y]);

  const handleNodeClick = (id: string) => {
    setSelectedNode(id);
    setOptionMenuON(!optionMenuON);
  };

  return (
    <PivotControls
      anchor={[-1, -1, 0]} // Position at bottom-right
      offset={[-1.3, -0.9, 0]} // Slight offset from the mesh
      scale={selectedNode === id ? 1.2 : 0} // Scale of the controls
      lineWidth={2}
      activeAxes={[true, true, false]} // Only allow movement in X and Y
      disableRotations={true}
      disableSliders={false}
      matrix={new THREE.Matrix4().setPosition(
        initialPositionRef.current.x,
        initialPositionRef.current.y,
        initialPositionRef.current.z
      )}
      onDrag={(matrix) => {
        handleTransformChange(matrix);
        setSelectedNode(id);
      }}
    >
      <group
        ref={groupRef}
        onClick={(e) => {
          e.stopPropagation();
          console.log("Clicked node", id);
        }}
      >
        {/* 3D mesh representation */}
        <mesh>
          <planeGeometry args={[1, 0.5]} />
          <meshStandardMaterial
            color={selectedNode === id ? "#ff8800" : "#2a2a2a"}
          />

          {/* Put Html component as a child of mesh to tightly couple them */}
          <Html
            transform
            distanceFactor={10}
            position={[0, 0, 0.01]} // Tiny z offset to prevent z-fighting
            style={{
              width: "120px",
              height: "40px",
              // pointerEvents: "none",
              pointerEvents: "auto", // Enable pointer events for interaction
              transformStyle: "preserve-3d", // Improve transform performance
              willChange: "transform", // Hint to browser to optimize transforms
            }}
            className={cn("html-label", selectedNode === id ? "z-10" : "z-0")}
            occlude={false} // Don't hide HTML when behind other objects
          >
            <div
              onClick={() => handleNodeClick(id)}
              className={cn(
                "relative p-2.5 text-sm rounded text-white text-center",
                "shadow-md",
                selectedNode === id
                  ? "bg-[#ff8800] border-[2px] border-[#ffcc00]"
                  : "bg-[#2a2a2a] border-[1px] border-[#444444]"
              )}
            >
              {optionMenuON && 
              <div className="absolute -top-8 text-xs flex gap-2 p-1 bg-[#0f0f0f] rounded-sm">
                
                <button className="hover:text-red-500 ease-in-out divide-purple-200 rounded-sm" onClick={handleDeleteNode}><RiDeleteBin6Line /></button>
              </div>}
              <span>{data.label}</span>
            </div>
          </Html>
        </mesh>
      </group>
    </PivotControls>
  );
};

// Edge component for 3D with bezier curves
const Edge3D = ({
  // source,
  // target,
  sourcePosition,
  targetPosition,
}: Edge3DProps) => {
  const startPoint = new THREE.Vector3(
    sourcePosition.x/25,
    -sourcePosition.y/25,
    0.005
  );

  const endPoint = new THREE.Vector3(
    targetPosition.x/25,
    -targetPosition.y/25 + 0.5,
    0.005
  );

  const firstPivot = new THREE.Vector3(startPoint.x, startPoint.y-0.8, 0.005);
  const lastPivot = new THREE.Vector3(endPoint.x, endPoint.y+0.8, 0.005);


  const xAxisDistance = lastPivot.x - firstPivot.x;
  // const yAxisDistance = lastPivot.y - firstPivot.y;

  const mid1 = new THREE.Vector3(
    xAxisDistance/2,
    firstPivot.y, 
    0.005
  );

  const mid2 = new THREE.Vector3(
    xAxisDistance/2,
    lastPivot.y,
    0.005
  );

  const points = [
    startPoint,
    firstPivot,
    mid1, 
    mid2,
    lastPivot,
    endPoint
  ]
  
  return (
    <group>
      {/* Line from drei with consistent width */}
      <Line
        points={points}
        color="#ffffff"
        lineWidth={2}
        dashed={false}
      />

      {/* Arrow head */}
      <mesh
        position={[endPoint.x, endPoint.y+0.12, 0.005]}
        rotation={[0, 0, Math.PI]}
        scale={0.075}
      >
        <coneGeometry args={[1, 3, 10]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
};

// The main component that manages both views
const DualViewFlow = () => {
  // Initial nodes and edges
  const initialNodes = [
    {
      id: "1",
      data: { label: "Node 1" },
      position: { x: 0, y: 0 },
      type: "custom",
    },
    {
      id: "2",
      data: { label: "Node 2" },
      position: { x: 200, y: 100 },
      type: "custom",
    },
    {
      id: "3",
      data: { label: "Node 3" },
      position: { x: -100, y: 100 },
      type: "custom",
    },
  ];

  const initialEdges: Edge[] = [
    {
      id: "e1-2",
      source: "1",
      target: "2",
      type: "step",
      style: { stroke: "white", strokeWidth: 3 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "white" },
    },
    {
      id: "e1-3",
      source: "1",
      target: "3",
      type: "step",
      style: { stroke: "white", strokeWidth: 3 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "white" },
    },
  ];

  // State for both views
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d"); // '2d' or '3d'


  // Node types for React Flow
  const nodeTypes = {
    custom: CustomNode,
  };

  // Update node position from either view
  const updateNodePosition = (id: string, newPos: { x: number; y: number }) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            position: {
              x: newPos.x,
              y: newPos.y,
            },
          };
        }
        return node;
      })
    );
  };

  // Calculate positions for edges in 3D view
  const edgesWithPositions = edges.map((edge) => {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);

    console.log("EDGE", edge);

    if (!sourceNode || !targetNode) {
      console.warn(
        `Missing node for edge ${edge.id}: source=${edge.source}, target=${edge.target}`
      );
    }

    return {
      ...edge,
      sourcePosition: sourceNode?.position || { x: 0, y: 0 },
      targetPosition: targetNode?.position || { x: 0, y: 0 },
    };
  });

  const deleteNode = useCallback((id: string) => {
    setNodes((nodes) => nodes.filter((node => node.id !== id)));

    setEdges((edges) => 
      edges.filter((edge) => edge.source !== id && edge.target !== id)
    )

    if (selectedNode === id) {
      setSelectedNode(null);
    }
  }, [setNodes, setEdges, selectedNode]);
  

  // Context value for sharing state between components
  const contextValue = {
    selectedNode,
    setSelectedNode,
    updateNodePosition,
    deleteNode
  };

  return (
    <FlowContext.Provider value={contextValue}>
      <div className="w-screen h-screen">
        {/* View toggle buttons */}
        <div className="absolute top-2.5 left-2.5 z-10 flex gap-2.5">
          <button
            onClick={() => setViewMode("2d")}
            className={cn(
              "px-4 py-2 rounded cursor-pointer transition-colors",
              viewMode === "3d"
                ? "bg-gray-700 text-white"
                : "bg-gray-100 text-black"
            )}
          >
            2D View
          </button>
          <button
            onClick={() => setViewMode("3d")}
            className={cn(
              "px-4 py-2 rounded cursor-pointer transition-colors",
              viewMode === "2d"
                ? "bg-gray-700 text-white"
                : "bg-gray-100 text-black"
            )}
          >
            3D View
          </button>
        </div>

        {/* 2D View */}
        <div
          className={cn(
            "w-full h-full",
            viewMode === "2d" ? "block" : "hidden"
          )}
        >
          <ReactFlow
            style={{ backgroundColor: "#0f0f0f" }}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedNode(node.id)}
            onPaneClick={() => setSelectedNode(null)}
            fitView
          >
            <Background color="#444488" />
            <MiniMap />
            <Controls className="text-black scale-110" />
            <Panel position="top-right">
              <div className="p-2 bg-gray-800 text-white rounded">
                Selected: {selectedNode || "None"}
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* 3D View */}
        <div
          className={cn(
            "w-full h-full",
            viewMode === "3d" ? "block" : "hidden"
          )}
        >
          <Canvas
            onCreated={({ gl }) => {
              gl.setClearColor("#111111"); // Set a darker background for better contrast
            }}
          >
            <OrthographicCamera makeDefault position={[0, 0, 20]} zoom={50} />
            <ambientLight intensity={0.7} />
            <pointLight position={[10, 10, 10]} intensity={1.5} />

            <group rotation={[0, 0, 0]}>
            {/* Nodes */}
            {nodes.map((node) => (
              <Node3D
                key={node.id}
                id={node.id}
                data={node.data}
                position={node.position}
                selected={node.id === selectedNode}
              />
            ))}

            {/* Edges */}
            {edgesWithPositions.map((edge) => (
              <Edge3D
                key={edge.id}
                source={edge.source}
                target={edge.target}
                sourcePosition={edge.sourcePosition}
                targetPosition={edge.targetPosition}
              />
            ))}
            <GizmoHelper
              alignment="bottom-right"
              margin={[80, 80]}
              onUpdate={() => console.log("Gizmo updated")}
            >
              <GizmoViewport
                axisColors={["#e91e63", "#4caf50", "#2196f3"]}
                labelColor="#ffffff"
              />
            </GizmoHelper>
            </group>

            {/* Background grid */}
            {/* <gridHelper args={[20, 20, "#aaa", "#444"]} /> */}
            {/* <axesHelper args={[10]} /> */}

            {/* Controls */}
            <OrbitControls
              makeDefault
              enableRotate={false}
              enablePan={true}
              enableZoom={true}
              enableDamping={false}
              panSpeed={1.2}
              zoomSpeed={0.5}
              mouseButtons={{
                LEFT: THREE.MOUSE.PAN,
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: THREE.MOUSE.ROTATE,
              }}
            />
          </Canvas>
        </div>
      </div>
    </FlowContext.Provider>
  );
};

// Wrapper component with ReactFlow provider
const DualViewApp = () => {
  return (
    <ReactFlowProvider>
      <DualViewFlow />
    </ReactFlowProvider>
  );
};

export default DualViewApp;
