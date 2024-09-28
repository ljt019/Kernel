import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api";
import { ImageIcon } from "lucide-react";

export default function Index() {
  const [kernel, setKernel] = useState<Array<string>>(Array(9).fill("1"));
  const [kernelMultiplier, setKernelMultiplier] = useState<string>("1");
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [originalImageSize, setOriginalImageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement>(null);

  const handleKernelChange = (index: number, value: string) => {
    const newKernel = [...kernel];
    newKernel[index] = value;
    setKernel(newKernel);
  };

  const handleMultiplierChange = (value: string) => {
    setKernelMultiplier(value);
  };

  useEffect(() => {
    const img = originalImageRef.current;
    if (img) {
      const updateImageSize = () => {
        setOriginalImageSize({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.addEventListener("load", updateImageSize);
      if (img.complete) updateImageSize();
      return () => img.removeEventListener("load", updateImageSize);
    }
  }, []);

  const handleProcess = async () => {
    if (!originalImageSize) {
      alert("Original image not loaded.");
      return;
    }

    const parsedKernel = kernel.map((value, idx) => {
      const parsed = parseFloat(value);
      if (isNaN(parsed)) {
        alert(`Invalid kernel value at position ${idx + 1}`);
        throw new Error(`Invalid kernel value at position ${idx + 1}`);
      }
      return parsed;
    });

    const parsedMultiplier = parseFloat(kernelMultiplier);
    if (isNaN(parsedMultiplier)) {
      alert("Invalid kernel multiplier");
      return;
    }

    const finalKernel = parsedKernel.map((value) => value * parsedMultiplier);

    const canvas = canvasRef.current;
    if (!canvas) {
      alert("Canvas not initialized.");
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      alert("Failed to get canvas context.");
      return;
    }

    canvas.width = originalImageSize.width;
    canvas.height = originalImageSize.height;
    ctx.drawImage(originalImageRef.current!, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width, height } = imageData;

    try {
      const result = await invoke<ProcessedImage>("process_image", {
        kernel: finalKernel,
        image: Array.from(data),
        width,
        height,
      });

      const processedImageData = new ImageData(
        new Uint8ClampedArray(result.data),
        result.width,
        result.height
      );

      canvas.width = result.width;
      canvas.height = result.height;
      ctx.putImageData(processedImageData, 0, 0);

      const processedDataURL = canvas.toDataURL();
      setProcessedImage(processedDataURL);
    } catch (error) {
      console.error("Error processing image:", error);
      alert("Failed to process image.");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Image Processor</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Kernel Input</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <label
                htmlFor="kernelMultiplier"
                className="block text-sm font-medium text-muted-foreground mb-2"
              >
                Kernel Multiplier (e.g., 1/9 for blur):
              </label>
              <Input
                id="kernelMultiplier"
                value={kernelMultiplier}
                onChange={(e) => handleMultiplierChange(e.target.value)}
                className="w-full text-center"
                type="text"
                inputMode="decimal"
                pattern="[0-9./]*"
              />
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Enter values for the 3x3 convolution kernel:
            </p>
            <KernelInputGrid kernel={kernel} onChange={handleKernelChange} />
            <Button onClick={handleProcess} className="mt-6 w-full">
              Process Image
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Images</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="mb-2 font-medium">Original Image</p>
              <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                <img
                  ref={originalImageRef}
                  src="/test_image.png"
                  alt="Original Image"
                  className="absolute inset-0 w-full h-full object-contain"
                />
              </div>
            </div>
            <div>
              <p className="mb-2 font-medium">Processed Image</p>
              <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                {processedImage ? (
                  <img
                    src={processedImage}
                    alt="Processed Image"
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <canvas ref={canvasRef} style={{ display: "none" }}></canvas>
    </div>
  );
}

function KernelInputGrid({
  kernel,
  onChange,
}: {
  kernel: Array<string>;
  onChange: (index: number, value: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {kernel.map((value, index) => (
        <KernelInput
          key={index}
          value={value}
          onChange={(value) => onChange(index, value)}
        />
      ))}
    </div>
  );
}

function KernelInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-center"
      type="text"
      inputMode="decimal"
      pattern="[0-9.-]*"
      aria-label={`Kernel value ${value}`}
    />
  );
}

interface ProcessedImage {
  width: number;
  height: number;
  data: Array<number>;
}
