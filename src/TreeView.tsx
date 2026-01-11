// src/TreeView.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { ITreeNode, TreeData, DragItem } from './types';
import { createInitialTree, simulateApiCall, generateId } from './mockData';
import TreeNode from './TreeNode';
import './styles.css';

// Helper to find a node and its location (node, parent, siblings, index) recursively
interface NodeLocation {
  node: ITreeNode;
  parent: ITreeNode | null;
  index: number;
  siblings: ITreeNode[];
}

const findNodeAndLocation = (tree: TreeData, nodeId: string | null, parent: ITreeNode | null = null, siblings: ITreeNode[] = []): NodeLocation | null => {
  if (!nodeId) return null; // Handle null nodeId for root-level drops

  for (let i = 0; i < tree.length; i++) {
    const node = tree[i];
    if (node.id === nodeId) {
      return { node, parent, index: i, siblings };
    }
    if (node.children && Array.isArray(node.children) && node.isExpanded) {
      const found = findNodeAndLocation(node.children, nodeId, node, node.children);
      if (found) return found;
    }
  }
  return null;
};

// Helper to update a node immutably
const updateNodeInTree = (tree: TreeData, nodeId: string, updater: (node: ITreeNode) => ITreeNode): TreeData => {
  return tree.map(node => {
    if (node.id === nodeId) {
      return updater(node);
    }
    if (node.children && Array.isArray(node.children)) {
      return {
        ...node,
        children: updateNodeInTree(node.children, nodeId, updater),
      };
    }
    return node;
  });
};

// Helper to add a node immutably
const addNodeToTree = (tree: TreeData, parentId: string | null, newNode: ITreeNode): TreeData => {
  if (parentId === null) { // Add to root
    return [...tree, { ...newNode, parentId: null }];
  }

  return updateNodeInTree(tree, parentId, parentNode => {
    const childrenArray = Array.isArray(parentNode.children) ? parentNode.children : [];
    return {
      ...parentNode,
      children: [...childrenArray, { ...newNode, parentId: parentNode.id }],
      hasChildren: true,
      isExpanded: true, // Expand parent when adding a child
    };
  });
};

// Helper to remove a node immutably
const removeNodeFromTree = (tree: TreeData, nodeIdToRemove: string): TreeData => {
  const newTree = tree.filter(node => node.id !== nodeIdToRemove).map(node => {
    if (node.children && Array.isArray(node.children)) {
      const updatedChildren = removeNodeFromTree(node.children, nodeIdToRemove);
      return {
        ...node,
        children: updatedChildren,
        hasChildren: updatedChildren.length > 0,
      };
    }
    return node;
  });
  return newTree;
};

// Helper to check if a node is an ancestor of another node
const isAncestor = (ancestorId: string, descendantId: string, nodes: TreeData): boolean => {
    const findDescendant = (currentNodes: TreeData): boolean => {
        for (const node of currentNodes) {
            if (node.id === descendantId) return true;
            if (node.children && Array.isArray(node.children)) {
                if (findDescendant(node.children)) return true;
            }
        }
        return false;
    };

    const ancestorNode = findNodeAndLocation(nodes, ancestorId)?.node;
    if (!ancestorNode || !ancestorNode.children || !Array.isArray(ancestorNode.children)) return false;

    return findDescendant(ancestorNode.children);
};


const TreeView: React.FC = () => {
  const [treeData, setTreeData] = useState<TreeData>(createInitialTree);
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);

  // --- Tree Manipulation Actions ---

  const handleToggleExpand = useCallback(async (nodeId: string, currentIsExpanded: boolean, currentChildren: ITreeNode[] | true | undefined, currentLevel: number) => {
    setTreeData(prevTreeData => updateNodeInTree(prevTreeData, nodeId, node => {
      return { ...node, isExpanded: !currentIsExpanded };
    }));

    // Lazy loading logic
    if (!currentIsExpanded && currentChildren === true) {
      const loadedChildren = await simulateApiCall(nodeId, currentLevel);
      setTreeData(prevTreeData => updateNodeInTree(prevTreeData, nodeId, node => {
        return {
          ...node,
          children: loadedChildren,
          hasChildren: loadedChildren.length > 0,
        };
      }));
    }
  }, []);

  const handleAddNode = useCallback((parentId: string | null) => {
    const nodeName = prompt('Enter new node name:');
    if (nodeName) {
      const newNode: ITreeNode = {
        id: generateId(),
        name: nodeName,
        children: [],
        isExpanded: false,
        hasChildren: false,
        parentId: parentId, // Temporary, will be set correctly by addNodeToTree
      };
      setTreeData(prevTreeData => addNodeToTree(prevTreeData, parentId, newNode));
    }
  }, []);

  const handleRemoveNode = useCallback((nodeId: string) => {
    if (window.confirm('Are you sure you want to delete this node and all its children?')) {
      setTreeData(prevTreeData => removeNodeFromTree(prevTreeData, nodeId));
    }
  }, []);

  const handleEditNodeName = useCallback((nodeId: string, newName: string) => {
    setTreeData(prevTreeData => updateNodeInTree(prevTreeData, nodeId, node => {
      return { ...node, name: newName };
    }));
  }, []);

  // --- Drag and Drop Logic ---

  const handleDragStart = useCallback((item: DragItem) => {
    setDraggedItem(item);
  }, []);

  // Visual feedback for drag-over is handled in TreeNode itself
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>, targetNodeId: string | null, dropPosition: 'above' | 'below' | 'child') => {
    event.preventDefault(); // Crucial to allow drops
    // Further global drag-over logic if needed (e.g., highlighting entire root area)
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    // Global drag-leave logic
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>, targetNodeId: string | null, dropPosition: 'above' | 'below' | 'child') => {
    event.preventDefault();
    if (!draggedItem || draggedItem.id === targetNodeId) {
      setDraggedItem(null);
      return;
    }

    setTreeData(prevTreeData => {
      // 1. Find the actual dragged node object (deep copy it to avoid mutation issues during removal)
      const findNodeDeepCopy = (nodes: TreeData, id: string): ITreeNode | null => {
        for (const node of nodes) {
          if (node.id === id) return JSON.parse(JSON.stringify(node));
          if (node.children && Array.isArray(node.children)) {
            const found = findNodeDeepCopy(node.children, id);
            if (found) return found;
          }
        }
        return null;
      };
      const draggedNode = findNodeDeepCopy(prevTreeData, draggedItem.id);
      if (!draggedNode) return prevTreeData;

      // Check for dropping a node into its own descendant
      if (targetNodeId && isAncestor(draggedItem.id, targetNodeId, prevTreeData)) {
          console.warn("Cannot drop a node into its own descendant.");
          setDraggedItem(null);
          return prevTreeData;
      }

      // 2. Remove dragged node from its original position (creates a new tree state)
      let treeAfterRemoval = removeNodeFromTree(prevTreeData, draggedItem.id);

      // 3. Insert dragged node into new position
      const nodeToInsert = { ...draggedNode }; // Ensure parentId is reset for re-insertion

      if (dropPosition === 'child' && targetNodeId) {
        // Drop as a child of the target node
        const targetParentLocation = findNodeAndLocation(treeAfterRemoval, targetNodeId);
        if (targetParentLocation) {
            return updateNodeInTree(treeAfterRemoval, targetNodeId, node => {
                const childrenArray = Array.isArray(node.children) ? node.children : [];
                return {
                    ...node,
                    children: [...childrenArray, { ...nodeToInsert, parentId: node.id }],
                    hasChildren: true,
                    isExpanded: true, // Auto-expand parent when dropping a child
                };
            });
        }
      } else { // 'above' or 'below' target sibling OR dropping at root level
        let newSiblings: ITreeNode[] = [];
        let newParentId: string | null = null;
        let insertIndex = 0;

        if (targetNodeId) { // Dropping near an existing sibling node
          const targetSiblingLocation = findNodeAndLocation(treeAfterRemoval, targetNodeId);
          if (targetSiblingLocation) {
            newParentId = targetSiblingLocation.parent?.id || null;
            newSiblings = newParentId === null ? [...treeAfterRemoval] : [...(targetSiblingLocation.parent?.children as ITreeNode[] || [])];
            insertIndex = dropPosition === 'above' ? targetSiblingLocation.index : targetSiblingLocation.index + 1;
          }
        } else { // Dropping at root level (targetNodeId is null)
          newParentId = null;
          newSiblings = [...treeAfterRemoval];
          insertIndex = newSiblings.length; // Append to end of root
        }

        const newNodeWithCorrectParent = { ...nodeToInsert, parentId: newParentId };
        newSiblings.splice(insertIndex, 0, newNodeWithCorrectParent);

        if (newParentId) {
            return updateNodeInTree(treeAfterRemoval, newParentId, parentNode => ({
                ...parentNode,
                children: newSiblings,
                hasChildren: true,
            }));
        } else {
            return newSiblings; // New root level array
        }
      }
      return treeAfterRemoval; // Fallback
    });

    setDraggedItem(null); // Clear dragged item after drop
  }, [draggedItem]);

  // --- Render ---

  return (
    <div
      className="tree-view-container"
      onDragOver={(e) => handleDragOver(e, null, 'child')} // Allow global drops, target null for root
      onDrop={(e) => handleDrop(e, null, 'child')} // Handles drops onto the root container
    >
      {treeData.length === 0 && (
          <div className="tree-view-empty-message">
              No nodes. Drag and drop a node here or click 'Add Root Node' to start.
          </div>
      )}
      {treeData.map(node => (
        <TreeNode
          key={node.id}
          node={node}
          level={0} // Root level
          onToggleExpand={handleToggleExpand}
          onAddNode={handleAddNode}
          onRemoveNode={handleRemoveNode}
          onEditNodeName={handleEditNodeName}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          draggedItemId={draggedItem?.id || null}
        />
      ))}
      <button onClick={() => handleAddNode(null)} className="add-root-node-button">Add Root Node</button>
    </div>
  );
};

export default TreeView;
