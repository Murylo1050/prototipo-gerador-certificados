'use client';

import React, { useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Text } from 'react-konva';
import useImage from 'use-image';

type TextItem = {
  x: number;
  y: number;
  text: string;
};

export default function ImageEditor() {
  const [imageURL, setImageURL] = useState<string | null>(null);
  const [textItems, setTextItems] = useState<TextItem[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const stageRef = useRef<any>(null);

  const [konvaImage] = useImage(imageURL || '');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImageURL(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleMouseDown = (e: any) => {
    const pos = e.target.getStage().getPointerPosition();
    setSelectionBox({ x: pos.x, y: pos.y, width: 0, height: 0 });
    setIsSelecting(true);
  };

  const handleMouseMove = (e: any) => {
    if (!isSelecting) return;
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    const { x, y } = selectionBox;
    setSelectionBox({
      x,
      y,
      width: pos.x - x,
      height: pos.y - y,
    });
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
    const text = prompt('Digite o texto para essa área:');
    if (text) {
      setTextItems([...textItems, { x: selectionBox.x, y: selectionBox.y, text }]);
    }
    setSelectionBox({ x: 0, y: 0, width: 0, height: 0 });
  };

  return (
    <div className="p-4">
      <input type="file" accept="image/*" onChange={handleImageUpload} />
      <div className="mt-4 border shadow inline-block">
        <Stage
          width={800}
          height={600}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          ref={stageRef}
        >
          <Layer>
            {konvaImage && <KonvaImage image={konvaImage} width={800} height={600} />}
            {textItems.map((item, index) => (
              <Text key={index} x={item.x} y={item.y} text={item.text} fontSize={16} fill="black" />
            ))}
            {isSelecting && (
              <Rect
                x={selectionBox.x}
                y={selectionBox.y}
                width={selectionBox.width}
                height={selectionBox.height}
                fill="rgba(0,0,255,0.2)"
                stroke="blue"
                dash={[4, 4]}
              />
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
