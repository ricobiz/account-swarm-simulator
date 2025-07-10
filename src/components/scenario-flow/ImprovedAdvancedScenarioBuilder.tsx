
import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  ConnectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Save, Play, Download, Upload, Layers, Settings } from 'lucide-react';
import { AdvancedActionNode } from './AdvancedActionNode';
import { ImprovedBlocksSidebar } from './ImprovedBlocksSidebar';
import { PresetsSidebar } from './PresetsSidebar';
import { BlockConfigPanel } from './BlockConfigPanel';
import { SCENARIO_PRESETS } from './PresetTemplates';
import { useIsMobile } from '@/hooks/use-mobile';

const nodeTypes = {
  action: AdvancedActionNode,
};

const initialNodes: Node[] = [
  {
    id: 'start',
    type: 'input',
    data: { label: 'Начало сценария' },
    position: { x: 250, y: 50 },
    style: { 
      background: '#4ade80', 
      color: 'white',
      border: '2px solid #22c55e',
      borderRadius: '8px'
    }
  }
];

interface ImprovedAdvancedScenarioBuilderContentProps {
  onSave: (nodes: Node[], edges: Edge[]) => void;
}

const ImprovedAdvancedScenarioBuilderContent: React.FC<ImprovedAdvancedScenarioBuilderContentProps> = ({ onSave }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [activeTab, setActiveTab] = useState<'blocks' | 'presets'>('blocks');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [configPanelVisible, setConfigPanelVisible] = useState(false);
  const { screenToFlowPosition } = useReactFlow();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  // Слушаем события добавления блоков для мобильных устройств
  useEffect(() => {
    const handleAddBlock = (event: CustomEvent) => {
      const { blockType } = event.detail;
      
      import('./BlockTypes').then(({ getBlockTypeById }) => {
        const blockTypeData = getBlockTypeById(blockType);
        if (!blockTypeData) return;

        const newNode: Node = {
          id: `${blockTypeData.id}-${Date.now()}`,
          type: 'action',
          position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
          data: {
            id: `${blockTypeData.id}-${Date.now()}`,
            type: blockTypeData.id,
            label: blockTypeData.name,
            icon: blockTypeData.icon.name,
            config: {},
            isConfigured: false,
            blockType: blockTypeData,
          },
        };

        setNodes((nds) => [...nds, newNode]);
      });
    };

    window.addEventListener('addBlock', handleAddBlock as EventListener);
    return () => {
      window.removeEventListener('addBlock', handleAddBlock as EventListener);
    };
  }, [setNodes]);

  // Обработчик создания соединений между блоками
  const onConnect = useCallback(
    (params: Connection) => {
      console.log('Creating connection:', params);
      setEdges((eds) => addEdge({
        ...params,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#6366f1', strokeWidth: 2 }
      }, eds));
    },
    [setEdges]
  );

  // Проверка возможности соединения
  const isValidConnection = useCallback((connection: Connection) => {
    // Предотвращаем самосоединение
    if (connection.source === connection.target) {
      return false;
    }
    
    // Проверяем, что соединение не дублируется
    const existingEdge = edges.find(
      edge => edge.source === connection.source && edge.target === connection.target
    );
    
    return !existingEdge;
  }, [edges]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const blockTypeId = event.dataTransfer.getData('application/reactflow');
      if (!blockTypeId) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      import('./BlockTypes').then(({ getBlockTypeById }) => {
        const blockType = getBlockTypeById(blockTypeId);
        if (!blockType) return;

        const newNode: Node = {
          id: `${blockType.id}-${Date.now()}`,
          type: 'action',
          position,
          data: {
            id: `${blockType.id}-${Date.now()}`,
            type: blockType.id,
            label: blockType.name,
            icon: blockType.icon.name,
            config: {},
            isConfigured: false,
            blockType: blockType,
          },
        };

        setNodes((nds) => [...nds, newNode]);
      });
    },
    [screenToFlowPosition, setNodes]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.type === 'action') {
      setSelectedNode(node);
      setConfigPanelVisible(true);
    }
  }, []);

  const updateNodeConfig = useCallback((nodeId: string, config: Record<string, any>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              config,
              isConfigured: Object.keys(config).length > 0,
            },
          };
        }
        return node;
      })
    );
    setSelectedNode(null);
    setConfigPanelVisible(false);
  }, [setNodes]);

  const handleSave = () => {
    onSave(nodes, edges);
  };

  const handleExportJSON = () => {
    const scenarioData = {
      nodes,
      edges,
      metadata: {
        name: 'Экспортированный сценарий',
        version: '1.0',
        exportedAt: new Date().toISOString(),
      }
    };

    const dataStr = JSON.stringify(scenarioData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `scenario_${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportJSON = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const scenarioData = JSON.parse(e.target?.result as string);
        if (scenarioData.nodes && scenarioData.edges) {
          setNodes(scenarioData.nodes);
          setEdges(scenarioData.edges);
        }
      } catch (error) {
        console.error('Ошибка при импорте сценария:', error);
        alert('Ошибка при импорте файла сценария');
      }
    };
    reader.readAsText(file);
    
    event.target.value = '';
  };

  const loadPreset = useCallback((presetId: string) => {
    const preset = SCENARIO_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setNodes(preset.nodes);
      setEdges(preset.edges);
    }
  }, [setNodes, setEdges]);

  return (
    <div className="flex h-full bg-gray-900 rounded-lg overflow-hidden relative">
      {/* Боковая панель с блоками */}
      {activeTab === 'blocks' && (
        <ImprovedBlocksSidebar 
          isVisible={sidebarVisible}
          onToggle={() => setSidebarVisible(!sidebarVisible)}
          isMobile={isMobile}
        />
      )}

      {/* Боковая панель с пресетами */}
      {activeTab === 'presets' && sidebarVisible && (
        <div className={`
          ${isMobile 
            ? 'fixed inset-0 z-50 bg-gray-900' 
            : 'w-80 bg-gray-800 border-r border-gray-700'
          } 
          flex flex-col
        `}>
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-white font-medium">Пресеты</h3>
            <Button
              onClick={() => setSidebarVisible(false)}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-gray-700"
            >
              {isMobile ? '×' : '←'}
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            <PresetsSidebar onLoadPreset={loadPreset} />
          </div>
        </div>
      )}

      {/* Основная область конструктора */}
      <div 
        className="flex-1 relative" 
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          isValidConnection={isValidConnection}
          connectionMode={ConnectionMode.Loose}
          fitView
          style={{ backgroundColor: '#1f2937' }}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#6366f1', strokeWidth: 2 }
          }}
        >
          <Controls />
          {!isMobile && (
            <MiniMap 
              style={{ backgroundColor: '#374151' }}
              maskColor="rgba(0, 0, 0, 0.2)"
            />
          )}
          <Background gap={20} size={1} color="#374151" />
          
          {/* Панель управления - только для десктопа */}
          {!isMobile && (
            <Panel position="top-left" className="space-y-2">
              {/* Переключатель вкладок */}
              <div className="flex bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <button
                  onClick={() => {
                    setActiveTab('blocks');
                    setSidebarVisible(true);
                  }}
                  className={`px-3 py-2 text-sm font-medium flex items-center gap-2 ${
                    activeTab === 'blocks' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  Блоки
                </button>
                <button
                  onClick={() => {
                    setActiveTab('presets');
                    setSidebarVisible(true);
                  }}
                  className={`px-3 py-2 text-sm font-medium ${
                    activeTab === 'presets' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  Пресеты
                </button>
              </div>
            </Panel>
          )}

          {/* Мобильная панель управления */}
          {isMobile && (
            <Panel position="bottom-center" className="w-full">
              <div className="flex justify-center items-center gap-2 bg-gray-800 rounded-lg border border-gray-700 p-2">
                <button
                  onClick={() => {
                    setActiveTab('blocks');
                    setSidebarVisible(true);
                  }}
                  className={`px-3 py-2 text-xs font-medium rounded ${
                    activeTab === 'blocks' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  Блоки
                </button>
                <button
                  onClick={() => {
                    setActiveTab('presets');
                    setSidebarVisible(true);
                  }}
                  className={`px-3 py-2 text-xs font-medium rounded ${
                    activeTab === 'presets' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  Пресеты
                </button>
                <Button onClick={handleImportJSON} variant="ghost" size="sm" className="p-2">
                  <Upload className="w-4 h-4" />
                </Button>
                <Button onClick={handleExportJSON} variant="ghost" size="sm" className="p-2">
                  <Download className="w-4 h-4" />
                </Button>
                <Button onClick={handleSave} variant="ghost" size="sm" className="p-2">
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            </Panel>
          )}

          {/* Десктопная панель действий */}
          {!isMobile && (
            <Panel position="top-right" className="space-x-2">
              <Button onClick={handleImportJSON} className="bg-purple-600 hover:bg-purple-700">
                <Upload className="mr-2 h-4 w-4" />
                Импорт
              </Button>
              <Button onClick={handleExportJSON} className="bg-orange-600 hover:bg-orange-700">
                <Download className="mr-2 h-4 w-4" />
                Экспорт
              </Button>
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                <Save className="mr-2 h-4 w-4" />
                Сохранить
              </Button>
            </Panel>
          )}
        </ReactFlow>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
      </div>

      {/* Панель настроек выбранного блока - только для десктопа */}
      {selectedNode && configPanelVisible && !isMobile && (
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-white font-medium flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Настройки блока
            </h3>
            <Button
              onClick={() => {
                setSelectedNode(null);
                setConfigPanelVisible(false);
              }}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-gray-700"
            >
              ×
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <BlockConfigPanel
              node={selectedNode}
              onSave={(config) => updateNodeConfig(selectedNode.id, config)}
              onCancel={() => {
                setSelectedNode(null);
                setConfigPanelVisible(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Мобильная панель настроек */}
      {selectedNode && configPanelVisible && isMobile && (
        <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-white font-medium flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Настройки блока
            </h3>
            <Button
              onClick={() => {
                setSelectedNode(null);
                setConfigPanelVisible(false);
              }}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-gray-700"
            >
              ×
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <BlockConfigPanel
              node={selectedNode}
              onSave={(config) => updateNodeConfig(selectedNode.id, config)}
              onCancel={() => {
                setSelectedNode(null);
                setConfigPanelVisible(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export const ImprovedAdvancedScenarioBuilder: React.FC<ImprovedAdvancedScenarioBuilderContentProps> = ({ onSave }) => {
  return (
    <ReactFlowProvider>
      <ImprovedAdvancedScenarioBuilderContent onSave={onSave} />
    </ReactFlowProvider>
  );
};
