export const analyzeImageBrightness = (imageUrl: string): Promise<'light' | 'dark'> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('dark'); // Default fallback
        return;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      let r = 0, g = 0, b = 0;
      let count = 0;
      
      // Analyze every 10th pixel for performance
      for (let i = 0; i < data.length; i += 40) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
      
      r = Math.floor(r / count);
      g = Math.floor(g / count);
      b = Math.floor(b / count);
      
      // Calculate relative luminance (W3C formula)
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      
      resolve(luminance > 0.5 ? 'light' : 'dark');
    };
    
    img.onerror = () => {
      resolve('dark'); // Fallback on error
    };
    
    img.src = imageUrl;
  });
};
