// src/mockData.ts
import { ITreeNode, TreeData } from './types';

let nextId = 100; // Starting ID for new nodes, for unique IDs

export const generateId = () => `node-${nextId++}`;

// Initial raw tree data structure
const rawInitialTreeData: TreeData = [
  {
    id: generateId(),
    name: "Root A (Lazy Children)",
    children: true, // Indicates lazy loading
    isExpanded: false,
    hasChildren: true,
    parentId: null,
  },
  {
    id: generateId(),
    name: "Root B",
    children: [
      {
        id: generateId(),
        name: "Child B1 (Lazy Children)",
        children: true, // Lazy loading for B1's children
        isExpanded: false,
        hasChildren: true,
        parentId: null, // Will be set by setParentIds
      },
      {
        id: generateId(),
        name: "Child B2",
        children: [],
        isExpanded: false,
        hasChildren: false,
        parentId: null,
      },
    ],
    isExpanded: false,
    hasChildren: true,
    parentId: null,
  },
  {
    id: generateId(),
    name: "Root C (No Children)",
    children: [],
    isExpanded: false,
    hasChildren: false,
    parentId: null,
  },
];

// Recursive function to ensure parentId is correctly set for all children
export const setParentIds = (nodes: TreeData, parentId: string | null = null): TreeData => {
  return nodes.map(node => {
    const newNode = { ...node, parentId };
    if (newNode.children && Array.isArray(newNode.children)) {
      newNode.children = setParentIds(newNode.children, newNode.id);
    }
    return newNode;
  });
};

export const createInitialTree = (): TreeData => {
  return setParentIds(rawInitialTreeData);
};

// Simulate an API call to fetch children
export const simulateApiCall = (nodeId: string, currentLevel: number): Promise<ITreeNode[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Limit depth for simulation to prevent infinite lazy loading
      if (currentLevel > 2 && Math.random() < 0.7) { // Higher chance of no children deeper down
        resolve([]);
        return;
      }

      const newChildren: ITreeNode[] = [];
      const numChildren = Math.floor(Math.random() * 3) + 1; // 1 to 3 children
      for (let i = 0; i < numChildren; i++) {
        const hasGrandchildren = Math.random() > 0.5 && currentLevel < 3; // 50% chance for grandchildren, max depth 3-4
        newChildren.push({
          id: generateId(),
          name: `Lazy Child ${nodeId}-${i + 1}`,
          children: hasGrandchildren ? true : [], // true for potential further lazy loading
          isExpanded: false,
          hasChildren: hasGrandchildren,
          parentId: nodeId,
        });
      }
      resolve(newChildren);
    }, Math.random() * 800 + 300); // Simulate network delay
  });
};
