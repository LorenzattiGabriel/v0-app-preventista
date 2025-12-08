"use client"

import React, { useRef, useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Camera, RefreshCw, X, Check, FlipHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

interface CameraCaptureProps {
  onCapture: (file: File) => void
  className?: string
}

export function CameraCapture({ onCapture, className }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [activeDeviceId, setActiveDeviceId] = useState<string>("")
  const [cameraError, setCameraError] = useState<string | null>(null)

  // Initialize camera and get available devices
  const startCamera = async (deviceId?: string) => {
    try {
      setCameraError(null)
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          // Prefer environment (rear) camera on mobile by default if no deviceId specified
          facingMode: deviceId ? undefined : "environment",
        },
      }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(newStream)
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream
      }
      setIsCameraOpen(true)
    } catch (err) {
      console.error("Error accessing camera:", err)
      setCameraError("No se pudo acceder a la cámara. Verifique los permisos.")
      setIsCameraOpen(false)
    }
  }

  // Get list of video input devices
  const getDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter((device) => device.kind === "videoinput")
      setDevices(videoDevices)
      
      // If we have an active stream, try to find which device it's using
      if (stream) {
        const track = stream.getVideoTracks()[0]
        const settings = track.getSettings()
        if (settings.deviceId) {
          setActiveDeviceId(settings.deviceId)
        }
      }
    } catch (err) {
      console.error("Error enumerating devices:", err)
    }
  }, [stream])

  useEffect(() => {
    if (isCameraOpen) {
      getDevices()
    }
    return () => {
      // Cleanup: stop stream when component unmounts or camera closes
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [isCameraOpen, stream, getDevices])

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setIsCameraOpen(false)
    setCameraError(null)
  }

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext("2d")

      if (context) {
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height)

        // Convert to data URL for preview
        const dataUrl = canvas.toDataURL("image/jpeg")
        setCapturedImage(dataUrl)

        // Convert to File object for upload
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const file = new File([blob], `delivery_${Date.now()}.jpg`, {
                type: "image/jpeg",
              })
              onCapture(file)
            }
          },
          "image/jpeg",
          0.8, // Quality
        )
      }
      stopCamera()
    }
  }

  const handleRetake = () => {
    setCapturedImage(null)
    startCamera(activeDeviceId)
  }

  const handleSwitchCamera = () => {
    if (devices.length > 1) {
      // Find current index
      const currentIndex = devices.findIndex((d) => d.deviceId === activeDeviceId)
      // Get next index
      const nextIndex = (currentIndex + 1) % devices.length
      const nextDevice = devices[nextIndex]
      setActiveDeviceId(nextDevice.deviceId)
      startCamera(nextDevice.deviceId)
    } else {
        // If devices not listed properly, try toggling facingMode as fallback logic could be added here
        // For now, simpler to just restart without specific ID might flip it purely by chance on some browsers, 
        // but explicit device ID switching is more robust.
        // If we only have 1 device or enumeration failed to give labels/IDs, we might be stuck.
        startCamera()
    }
  }

  if (capturedImage) {
    return (
      <div className={cn("relative w-full aspect-video bg-black rounded-lg overflow-hidden", className)}>
        <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
        <div className="absolute bottom-4 right-4 flex gap-2">
           <Button variant="secondary" size="sm" onClick={handleRetake}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retomar
          </Button>
        </div>
      </div>
    )
  }

  if (isCameraOpen) {
    return (
      <div className={cn("relative w-full bg-black rounded-lg overflow-hidden", className)}>
        {/* Hidden canvas for capturing */}
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Video feed */}
        <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-auto aspect-[3/4] md:aspect-video object-cover"
        />

        {/* Camera Controls Overlay */}
        <div className="absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-b from-black/50 via-transparent to-black/50">
           <div className="flex justify-between items-start">
             <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={stopCamera}>
                <X className="h-6 w-6" />
             </Button>
             
             {devices.length > 1 && (
                 <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={handleSwitchCamera}>
                    <FlipHorizontal className="h-6 w-6" />
                 </Button>
             )}
           </div>

           <div className="flex justify-center pb-4">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-16 w-16 rounded-full border-4 border-white bg-transparent hover:bg-white/20 active:bg-white/40"
                onClick={handleCapture}
              >
                  <div className="h-12 w-12 rounded-full bg-white" />
              </Button>
           </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Button variant="outline" className="w-full h-32 flex flex-col gap-2 border-dashed" onClick={() => startCamera()}>
        <Camera className="h-8 w-8 text-muted-foreground" />
        <span className="text-muted-foreground">Tocar para tomar foto</span>
      </Button>
      {cameraError && (
          <p className="text-sm text-destructive text-center">{cameraError}</p>
      )}
    </div>
  )
}
