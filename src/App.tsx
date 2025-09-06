import React, { useState, useCallback } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";

const App: React.FC = () => {
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [description, setDescription] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [copyButtonText, setCopyButtonText] = useState('Copy Description');
    const [shareButtonText, setShareButtonText] = useState('Share');

    const handleImageChange = (file: File | null) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSourceImage(reader.result as string);
                setResultImage(null);
                setDescription(null);
                setError(null);
            };
            reader.readAsDataURL(file);
        } else {
            setError("Please upload a valid image file.");
        }
    };
    
    const removeImage = () => {
        setSourceImage(null);
        setResultImage(null);
        setDescription(null);
        setError(null);
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            handleImageChange(file);
        }
    };
    
    const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, isOver: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(isOver);
    };

    const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
        const file = event.dataTransfer.files?.[0];
        if (file) {
            handleImageChange(file);
        }
    }, []);

    const segmentClothing = async () => {
        if (!sourceImage) {
            setError("Please upload an image first.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setResultImage(null);
        setDescription(null);
        setCopyButtonText('Copy Description');
        setShareButtonText('Share');

        try {
            const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY as string });
            
            const imagePart = {
                inlineData: {
                    data: sourceImage.split(',')[1],
                    mimeType: sourceImage.substring(sourceImage.indexOf(':') + 1, sourceImage.indexOf(';')),
                },
            };

            const textPart = {
                text: "Analyze the provided image of a person. Your task is to isolate their complete outfit. 1. **Image Generation:** Create a new image with a transparent background. In this image, include all articles of clothing and any distinct accessories (like handbags, hats, scarves, or prominent jewelry). The person and original background must be completely removed. Arrange all the extracted items neatly as if they were laid out for a photograph (a 'knolling' or flat-lay style). 2. **Textual Description:** Provide a detailed textual description of each clothing item and accessory you've identified and included in the new image.",
            };
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image-preview',
                contents: { parts: [imagePart, textPart] },
                config: {
                    responseModalities: [Modality.IMAGE, Modality.TEXT],
                },
            });
            
            let foundImage = false;
            let foundText = '';
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    const base64ImageBytes = part.inlineData.data;
                    const imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
                    setResultImage(imageUrl);
                    foundImage = true;
                } else if (part.text) {
                    foundText += part.text;
                }
            }
            
            if (foundText) {
                setDescription(foundText.trim());
            }

            if (!foundImage) {
                setError("The AI could not generate an image for this request. Please try a different photo.");
            }

        } catch (e) {
            console.error(e);
            setError("An error occurred while processing the image. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCopy = () => {
        if (description) {
            navigator.clipboard.writeText(description);
            setCopyButtonText('Copied!');
            setTimeout(() => setCopyButtonText('Copy Description'), 2000);
        }
    };

    const handleShare = async () => {
        const shareData = {
            title: 'NGUYEN CHINH AI - Fashion Segmenter',
            text: 'Check out this AI tool that analyzes and isolates outfits from photos!',
            url: window.location.href,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.error('Error sharing:', err);
            }
        } else {
            navigator.clipboard.writeText(window.location.href).then(() => {
                setShareButtonText('Link Copied!');
                setTimeout(() => setShareButtonText('Share'), 2000);
            }).catch(err => {
                console.error('Failed to copy URL:', err);
                setError('Failed to copy link to clipboard.');
            });
        }
    };

    return (
        <div className="container">
            <header>
                <h1>NGUYEN CHINH AI</h1>
                <p>zalo: 0835080088</p>
            </header>
            {error && <div className="error-message">{error}</div>}
            <div className="content-grid">
                <div className={`panel input-panel ${isDragging ? 'dragging' : ''}`}>
                    <h2>tải ảnh lên</h2>
                    {!sourceImage ? (
                         <div
                            className="drop-zone"
                            onDragEnter={(e) => handleDragEvents(e, true)}
                            onDragLeave={(e) => handleDragEvents(e, false)}
                            onDragOver={(e) => handleDragEvents(e, true)}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById('file-input')?.click()}
                        >
                            <input type="file" id="file-input" accept="image/*" onChange={handleFileSelect} />
                            <label htmlFor="file-input">
                               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg>
                                <span>Drag & drop or click to upload</span>
                            </label>
                        </div>
                    ) : (
                        <div className="image-preview-container">
                            <img src={sourceImage} alt="Uploaded preview" className="preview-image" />
                            <button onClick={removeImage} className="remove-btn" aria-label="Remove image">&times;</button>
                        </div>
                    )}
                    <button onClick={segmentClothing} disabled={!sourceImage || isLoading} className="action-button">
                        {isLoading ? 'Analyzing...' : 'Analyze Outfit'}
                    </button>
                </div>
                <div className="panel output-panel">
                    <h2>load kết quả</h2>
                    {isLoading ? (
                        <div className="loader">
                            <div className="spinner"></div>
                            <p>AI is analyzing your image...</p>
                        </div>
                    ) : resultImage || description ? (
                       <>
                           {resultImage && (
                                <div className="image-preview-container">
                                    <img src={resultImage} alt="Segmented clothing" className="preview-image" />
                                </div>
                            )}
                            {description && (
                                <div className="description-box">
                                    <h3>Fashion Analysis</h3>
                                    <p>{description}</p>
                                </div>
                            )}
                            <div className="result-actions">
                                {resultImage && (
                                    <a href={resultImage} download="segmented_clothing.png" className="action-button">
                                        Download Image
                                    </a>
                                )}
                                <button onClick={handleShare} className="action-button secondary">
                                    {shareButtonText}
                                </button>
                                {description && (
                                    <button onClick={handleCopy} className="action-button secondary">
                                        {copyButtonText}
                                    </button>
                                )}
                            </div>
                       </>
                    ) : (
                        <div className="placeholder">
                           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M22 13h-4v4h-2v-4h-4v-2h4V7h2v4h4v2zm-8-3V4.08C14 3.53 13.55 3 13 3H4.99C3.89 3 3 3.9 3 5v14c0 1.1.89 2 1.99 2H13c.55 0 1-.45 1-1v-6.08c0-.55-.45-1-1-1H9.5L14 5v5zM6 15h5v2H6v-2z"/></svg>
                            <p>Your segmented clothing will appear here</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;