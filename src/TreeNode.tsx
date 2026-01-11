// src/TreeNode.tsx
import React, { useState, useRef, useEffect } from 'react';
import { ITreeNode, DragItem } from './types';
import { FaChevronRight, FaChevronDown, FaPlus, FaSpinner, FaEdit, FaTrash } from 'react-icons/fa';

interface TreeNodeProps {
  node: ITreeNode;
  level: number;
  onToggleExpand: (nodeId: string, currentIsExpanded: boolean, currentChildren: ITreeNode[] | true | undefined, currentLevel: number) => void;
  onAddNode: (parentId: string | null) => void;
  onRemoveNode: (nodeId: string) => void;
  onEditNodeName: (nodeId: string, newName: string) => void;
  onDragStart: (item: DragItem) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>, targetNodeId: string | null, dropPosition: 'above' | 'below' | 'child') => void;
  onDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>, targetNodeId: string | null, dropPosition: 'above' | 'below' | 'child') => void;
  draggedItemId: string | null;
}

const DRAG_OFFSET_THRESHOLD = 0.3; // Percentage of element height for 'above'/'below' vs 'child'

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  level,
  onToggleExpand,
  onAddNode,
  onRemoveNode,
  onEditNodeName,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  draggedItemId,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(node.name);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dropPosition, setDropPosition] = useState<'above' | 'below' | 'child' | null>(null);

  const nodeRef = useRef<HTMLDivElement>(null);

  const isExpanded = node.isExpanded ?? false;
  // If children is 'true' (lazy-loaded state) or an empty array, and hasChildren is explicitly false, then no children.
  // Otherwise, assume it has children or might have children (if lazy loaded).
  const hasChildren = node.hasChildren ?? (node.children === true || (Array.isArray(node.children) && node.children.length > 0));
  const isLoadingChildren = isExpanded && node.children === true;

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedName(e.target.value);
  };

  const handleEditBlur = () => {
    if (editedName.trim() !== node.name) {
      onEditNodeName(node.id, editedName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleEditBlur();
    }
    if (e.key === 'Escape') {
      setEditedName(node.name); // Revert to original
      setIsEditing(false);
    }
  };

  // --- Drag and Drop Handlers ---
  const handleLocalDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', node.id); // Set data for IE/Edge compatibility
    onDragStart({ id: node.id, parentId: node.parentId });
  };

  const handleLocalDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Do not allow dropping on self
    if (draggedItemId === node.id) {
        setDropPosition(null);
        setIsDraggingOver(false);
        return;
    }

    const targetRect = nodeRef.current?.getBoundingClientRect();
    if (!targetRect) return;

    const mouseY = e.clientY;
    const offset = mouseY - targetRect.top;
    const height = targetRect.height;

    let newDropPosition: 'above' | 'below' | 'child' | null = null;
    if (offset < height * DRAG_OFFSET_THRESHOLD) {
      newDropPosition = 'above';
    } else if (offset > height * (1 - DRAG_OFFSET_THRESHOLD)) {
      newDropPosition = 'below';
    } else {
      newDropPosition = 'child';
    }

    if (newDropPosition !== dropPosition) {
      setDropPosition(newDropPosition);
    }
    setIsDraggingOver(true);
    onDragOver(e, node.id, newDropPosition); // Propagate to TreeView for global state
  };

  const handleLocalDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsDraggingOver(false);
    setDropPosition(null);
    onDragLeave(e); // Propagate
  };

  const handleLocalDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsDraggingOver(false);
    setDropPosition(null);
    onDrop(e, node.id, dropPosition || 'child'); // Propagate to TreeView, default to 'child'
  };

  // Clear drag-over styling if the dragged item is no longer active
  useEffect(() => {
    if (!draggedItemId) {
      setIsDraggingOver(false);
      setDropPosition(null);
    }
  }, [draggedItemId]);

  const isBeingDragged = draggedItemId === node.id;

  // CSS class determination for drop indicators
  const dropIndicatorClass = isDraggingOver && dropPosition ? `drop-indicator-${dropPosition}` : '';

  // Determine the first character for the icon circle
  const nodeChar = node.name.charAt(0).toUpperCase();

  return (
    <div
      className={`tree-node-wrapper level-${level}`}
      style={{ '--level': level } as React.CSSProperties} // Pass level as CSS variable for styling
    >
      {/* Drop indicator for 'above' */}
      {isDraggingOver && dropPosition === 'above' && <div className="drop-indicator drop-indicator-above" />}

      <div
        ref={nodeRef}
        className={`tree-node ${isExpanded ? 'expanded' : ''} ${isBeingDragged ? 'is-being-dragged' : ''} ${dropIndicatorClass}`}
        onDragStart={handleLocalDragStart}
        onDragOver={handleLocalDragOver}
        onDragLeave={handleLocalDragLeave}
        onDrop={handleLocalDrop}
        onDoubleClick={handleDoubleClick}
        draggable="true"
      >
        <div className="node-content">
          {/* Expand/Collapse Toggle */}
          {hasChildren && (
            <span
              className="expand-toggle"
              onClick={() => onToggleExpand(node.id, isExpanded, node.children, level)}
            >
              {isLoadingChildren ? <FaSpinner className="spinner" /> : (isExpanded ? <FaChevronDown /> : <FaChevronRight />)}
            </span>
          )}

          {/* Node Type Circle (A, B, C, D) */}
          <div className={`node-icon-circle type-${nodeChar}`}>
            {nodeChar}
          </div>

          {/* Node Name and Add Button */}
          <div className="node-label-actions">
            {isEditing ? (
              <input
                type="text"
                value={editedName}
                onChange={handleEditChange}
                onBlur={handleEditBlur}
                onKeyDown={handleKeyDown}
                autoFocus
                className="node-edit-input"
              />
            ) : (
              <span className="node-name">{node.name}</span>
            )}
            <button onClick={() => onAddNode(node.id)} className="add-child-button" title="Add child node">
              <FaPlus />
            </button>
          </div>

          {/* Other actions (Edit, Remove) - These are not in the image but were in requirements, kept separate for clarity */}
          <div className="node-actions-right">
            <button onClick={() => setIsEditing(true)} className="icon-button" title="Edit node name"><FaEdit /></button>
            <button onClick={() => onRemoveNode(node.id)} className="icon-button remove-button" title="Remove node"><FaTrash /></button>
          </div>
        </div>
      </div>

      {/* Drop indicator for 'below' */}
      {isDraggingOver && dropPosition === 'below' && <div className="drop-indicator drop-indicator-below" />}

      {isExpanded && Array.isArray(node.children) && node.children.map(child => (
        <TreeNode
          key={child.id}
          node={{ ...child, parentId: node.id }} // Ensure parentId is passed down
          level={level + 1}
          onToggleExpand={onToggleExpand}
          onAddNode={onAddNode}
          onRemoveNode={onRemoveNode}
          onEditNodeName={onEditNodeName}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          draggedItemId={draggedItemId}
        />
      ))}
    </div>
  );
};

export default TreeNode;
