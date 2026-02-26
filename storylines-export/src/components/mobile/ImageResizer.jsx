/**
 * Resizes an image file to a maximum dimension on the longest side
 * @param {File} file - The image file to resize
 * @param {number} maxSize - Maximum size for the longest side (default: 800px)
 * @returns {Promise<File>} - Resized image file
 */
export async function resizeImage(file, maxSize = 800) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                let width = img.width;
                let height = img.height;
                
                // Calculate new dimensions
                if (width > height) {
                    if (width > maxSize) {
                        height = (height * maxSize) / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width = (width * maxSize) / height;
                        height = maxSize;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw resized image
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to blob
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Failed to create blob'));
                            return;
                        }
                        
                        // Create new file with same name
                        const resizedFile = new File([blob], file.name, {
                            type: file.type,
                            lastModified: Date.now()
                        });
                        
                        resolve(resizedFile);
                    },
                    file.type,
                    0.85 // Quality (0.85 = 85% quality)
                );
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target.result;
        };
        
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}