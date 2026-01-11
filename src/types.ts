// src/types.ts
export interface ITreeNode {
  id: string;
  name: string;
  children?: ITreeNode[] | true; // true means "has children, but not loaded yet"
  isExpanded?: boolean;
  hasChildren?: boolean; // Useful to show expand icon even if children are not loaded
  parentId: string | null; // Keep track of parent for easier updates
}

export type TreeData = ITreeNode[];

export interface DragItem {
  id: string;
  parentId: string | null;
}
