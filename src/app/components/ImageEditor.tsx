'use client'; // Necessário para usar hooks do React no Next.js App Router

import React, { useState, useRef, useEffect, useCallback, CSSProperties } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useCSVReader } from 'react-papaparse';
// Para a funcionalidade de ZIP, a biblioteca JSZip é necessária.
// Em um projeto real, você a instalaria via npm/yarn: npm install jszip
// E a importaria: import JSZip from 'jszip';
// Para este exemplo, vamos carregá-la via tag de script.

// --- Componente CanvasRenderer ---
// Responsável por renderizar um único canvas para visualização.
interface CanvasRendererProps {
    imageDataUrl: string;
    textToAdd: string;
    textColor: string;
    fontSize: string;
    completedCrop?: PixelCrop;
    headers: string[];
    rowData: string[];
    rowIndex: number;
}

const CanvasRenderer: React.FC<CanvasRendererProps> = ({
    imageDataUrl,
    textToAdd,
    textColor,
    fontSize,
    completedCrop,
    headers,
    rowData,
    rowIndex
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);

    const substituteText = useCallback(() => {
        if (!headers.length) return textToAdd;
        let processedText = textToAdd;
        const regex = /\*([^*]+)\*/g;
        processedText = processedText.replace(regex, (match, placeholder) => {
            const headerIndex = headers.findIndex(h => h.trim() === placeholder.trim());
            if (headerIndex !== -1 && rowData[headerIndex]) {
                return rowData[headerIndex];
            }
            return match;
        });
        return processedText;
    }, [textToAdd, headers, rowData]);

    useEffect(() => {
        const image = new Image();
        image.src = imageDataUrl;
        image.crossOrigin = "anonymous"; // Necessário se a imagem vier de outra origem
        image.onload = () => {
            imageRef.current = image;
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (!canvas || !ctx || !imageRef.current || !completedCrop) return;
            
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight);

            const finalText = substituteText();
            if (finalText) {
                const scaleX = image.naturalWidth / image.width;
                const scaleY = image.naturalHeight / image.height;
                const textX = completedCrop.x * scaleX;
                const textY = completedCrop.y * scaleY;
                const textWidth = completedCrop.width * scaleX;

                ctx.fillStyle = textColor;
                ctx.font = `${fontSize}px Times New Roman`;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';

                const words = finalText.split(' ');
                let currentLine = '';
                let currentY = textY;
                const lineHeight = parseInt(fontSize) * 1.2;

                for (let i = 0; i < words.length; i++) {
                    const testLine = currentLine + words[i] + ' ';
                    const metrics = ctx.measureText(testLine);
                    if (metrics.width > textWidth && i > 0) {
                        ctx.fillText(currentLine, textX, currentY);
                        currentY += lineHeight;
                        currentLine = words[i] + ' ';
                    } else {
                        currentLine = testLine;
                    }
                }
                ctx.fillText(currentLine, textX, currentY);
            }
        };
    }, [imageDataUrl, completedCrop, textToAdd, textColor, fontSize, headers, rowData, substituteText]);

    const handleDownload = () => {
        if (canvasRef.current) {
            const dataURL = canvasRef.current.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataURL;
            link.download = `imagem-gerada-${rowIndex + 1}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div style={{ marginBottom: '20px', border: '1px solid #ddd', padding: '10px', borderRadius: '8px' }}>
            <h4>Imagem Gerada {rowIndex + 1}</h4>
            <canvas
                ref={canvasRef}
                style={{ maxWidth: '100%', height: 'auto', display: 'block', margin: '10px auto' }}
            />
            <button onClick={handleDownload} style={{ padding: '8px 16px', cursor: 'pointer', width: '100%' }}>
                Baixar Imagem {rowIndex + 1}
            </button>
        </div>
    );
};

// --- Componente ImageEditor ---
interface ImageEditorProps {
    imageDataUrl: string;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ imageDataUrl }) => {
    const imgRef = useRef<HTMLImageElement>(null);
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [textToAdd, setTextToAdd] = useState<string>('Olá *NOME*, seu código é *CODIGO*.');
    const [textColor, setTextColor] = useState<string>('#FFFFFF');
    const [fontSize, setFontSize] = useState<string>('30');
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvData, setCsvData] = useState<string[][]>([]);
    const [isZipping, setIsZipping] = useState(false); // Estado de carregamento para o ZIP

    const { CSVReader } = useCSVReader();

    // Efeito para carregar o script do JSZip
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.async = true;
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const addPlaceholder = (header: string) => {
        setTextToAdd(prev => `${prev} *${header.trim()}*`);
    };

    // Função para baixar todos os canvas como um arquivo ZIP
    const handleDownloadAllAsZip = async () => {
        // @ts-ignore
        if (typeof JSZip === 'undefined') {
            alert('A biblioteca de compressão (JSZip) ainda não foi carregada. Tente novamente em alguns segundos.');
            return;
        }
        if (!completedCrop || csvData.length === 0) {
            alert('Por favor, selecione uma área na imagem e carregue um CSV.');
            return;
        }

        setIsZipping(true);
        // @ts-ignore
        const zip = new JSZip();
        
        const image = new Image();
        image.src = imageDataUrl;
        image.crossOrigin = "anonymous";

        image.onload = async () => {
            for (let i = 0; i < csvData.length; i++) {
                const rowData = csvData[i];
                const tempCanvas = document.createElement('canvas');
                const ctx = tempCanvas.getContext('2d');
                if (!ctx) continue;

                // Lógica de desenho replicada aqui para o canvas temporário
                tempCanvas.width = image.naturalWidth;
                tempCanvas.height = image.naturalHeight;
                ctx.drawImage(image, 0, 0);

                let finalText = textToAdd;
                const regex = /\*([^*]+)\*/g;
                finalText = finalText.replace(regex, (match, placeholder) => {
                    const headerIndex = csvHeaders.findIndex(h => h.trim() === placeholder.trim());
                    return headerIndex !== -1 && rowData[headerIndex] ? rowData[headerIndex] : match;
                });

                const scaleX = image.naturalWidth / (imgRef.current?.width || 1);
                const scaleY = image.naturalHeight / (imgRef.current?.height || 1);
                const textX = completedCrop.x * scaleX;
                const textY = completedCrop.y * scaleY;
                const textWidth = completedCrop.width * scaleX;

                ctx.fillStyle = textColor;
                ctx.font = `${fontSize}px Times New Roman`;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';

                const words = finalText.split(' ');
                let currentLine = '';
                let currentY = textY;
                const lineHeight = parseInt(fontSize) * 1.2;

                for (let j = 0; j < words.length; j++) {
                    const testLine = currentLine + words[j] + ' ';
                    if (ctx.measureText(testLine).width > textWidth && j > 0) {
                        ctx.fillText(currentLine, textX, currentY);
                        currentY += lineHeight;
                        currentLine = words[j] + ' ';
                    } else {
                        currentLine = testLine;
                    }
                }
                ctx.fillText(currentLine, textX, currentY);

                // Adiciona o canvas como um blob ao arquivo zip
                const blob = await new Promise<Blob | null>(resolve => tempCanvas.toBlob(resolve, 'image/png'));
                if (blob) {
                    zip.file(`certificado-${i + 1}.png`, blob);
                }
            }

            // Gera o ZIP e inicia o download
            zip.generateAsync({ type: 'blob' }).then((content: Blob | MediaSource) => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = 'certificados.zip';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setIsZipping(false);
            });
        };
         image.onerror = () => {
            setIsZipping(false);
            alert("Não foi possível carregar a imagem de fundo para gerar o ZIP. Verifique se a imagem está acessível.");
        };
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
            {/* Seção de Controles e Edição */}
            <div style={{ border: '2px dashed #ccc', padding: '20px', borderRadius: '10px', marginBottom: '30px', width: '100%', maxWidth: '900px' }}>
                <h3>1. Selecione a Área do Texto</h3>
                <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto 20px auto' }}>
                    <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)}>
                        <img ref={imgRef} alt="Imagem para seleção" src={imageDataUrl} style={{ maxWidth: '100%', height: 'auto' }} crossOrigin="anonymous" />
                    </ReactCrop>
                </div>
                
                <h3>2. Configure o Texto e as Variáveis</h3>
                <div style={{ marginBottom: '20px', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
                    <textarea
                        value={textToAdd}
                        onChange={(e) => setTextToAdd(e.target.value)}
                        placeholder="Use *variavel* para substituir com dados do CSV."
                        rows={4}
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box', marginBottom: '10px' }}
                    />
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center' }}>
                        <div>
                            <label htmlFor="textColor">Cor:</label>
                            <input type="color" id="textColor" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="fontSize">Tamanho:</label>
                            <input type="number" id="fontSize" value={fontSize} onChange={(e) => setFontSize(e.target.value)} min="10" max="100" step="1" style={{ width: '80px' }}/>
                        </div>
                    </div>
                    {csvHeaders.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                            {csvHeaders.map((header, index) => (
                                <button key={index} onClick={() => addPlaceholder(header)} style={{padding: '5px 10px', background: '#e0e0e0', border: '1px solid #ccc', borderRadius: '5px'}}>
                                    {header}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <h3>3. Carregue o arquivo CSV</h3>
                <CSVReader
                    onUploadAccepted={(results: any) => {
                        const data = results.data;
                        if (data && data.length > 1) {
                            setCsvHeaders(data[0]);
                            setCsvData(data.slice(1).filter((row: string[]) => row.some(cell => cell.trim() !== '')));
                        }
                    }}
                >
                    {({ getRootProps, acceptedFile, ProgressBar, getRemoveFileProps }: any) => (
                        <>
                            <div style={{display: 'flex', flexDirection: 'row', marginBottom: 10}}>
                                <button type='button' {...getRootProps()} style={{width: '20%'}}>Procurar CSV</button>
                                <div style={{border: '1px solid #ccc', height: 45, lineHeight: 2.5, paddingLeft: 10, width: '80%'}}>{acceptedFile && acceptedFile.name}</div>
                                <button {...getRemoveFileProps()} style={{borderRadius: 0, padding: '0 20px'}} onClick={() => { setCsvData([]); setCsvHeaders([]); }}>Remover</button>
                            </div>
                            <ProgressBar style={{backgroundColor: 'red'}} />
                        </>
                    )}
                </CSVReader>
            </div>

            {/* Seção de Visualização e Download */}
            {csvData.length > 0 && (
                 <div style={{ width: '100%', maxWidth: '900px' }}>
                    <h2 style={{textAlign: 'center', marginBottom: '20px'}}>4. Imagens Geradas</h2>
                    <button onClick={handleDownloadAllAsZip} disabled={isZipping} style={{width: '100%', padding: '15px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', marginBottom: '20px'}}>
                        {isZipping ? 'Compactando...' : 'Baixar Todos (ZIP)'}
                    </button>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                        {csvData.map((row, index) => (
                            <CanvasRenderer
                                key={index}
                                rowIndex={index}
                                imageDataUrl={imageDataUrl}
                                textToAdd={textToAdd}
                                textColor={textColor}
                                fontSize={fontSize}
                                completedCrop={completedCrop}
                                headers={csvHeaders}
                                rowData={row}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageEditor;
