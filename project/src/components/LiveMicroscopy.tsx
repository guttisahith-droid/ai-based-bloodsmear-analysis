import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { ArrowLeft, Camera, Video as VideoIcon, Square, Play, Maximize, Image as ImageIcon, Trash2 } from 'lucide-react';

interface LiveMicroscopyProps {
  onBack: () => void;
}

interface CapturedFrame {
  id: string;
  imageData: string;
  timestamp: Date;
}

export function LiveMicroscopy({ onBack }: LiveMicroscopyProps) {
  const webcamRef = useRef<Webcam>(null);
  const [capturing, setCapturing] = useState(false);
  const [capturedFrames, setCapturedFrames] = useState<CapturedFrame[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<CapturedFrame | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const captureFrame = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      const newFrame: CapturedFrame = {
        id: Date.now().toString(),
        imageData: imageSrc,
        timestamp: new Date()
      };
      setCapturedFrames(prev => [newFrame, ...prev]);
    }
  }, [webcamRef]);

  const deleteFrame = (id: string) => {
    setCapturedFrames(prev => prev.filter(f => f.id !== id));
    if (selectedFrame?.id === id) {
      setSelectedFrame(null);
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Dashboard</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Live Microscopy</h2>
          <p className="text-gray-600">Connect your microscope camera for real-time analysis</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="relative bg-gray-900 aspect-video">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode }}
                  className="w-full h-full object-cover"
                />

                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <div className="bg-red-600 px-3 py-1 rounded-full flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="text-white text-sm font-medium">LIVE</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border-t border-gray-200 p-4">
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={captureFrame}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                  >
                    <Camera className="w-5 h-5" />
                    Capture Frame
                  </button>

                  <button
                    onClick={() => setCapturing(!capturing)}
                    className={`flex items-center gap-2 px-6 py-3 font-semibold rounded-lg transition-colors shadow-md ${
                      capturing
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-gray-600 text-white hover:bg-gray-700'
                    }`}
                  >
                    {capturing ? (
                      <>
                        <Square className="w-5 h-5" />
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        Start Recording
                      </>
                    )}
                  </button>

                  <button
                    onClick={toggleCamera}
                    className="p-3 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg transition-colors"
                    title="Switch Camera"
                  >
                    <VideoIcon className="w-5 h-5" />
                  </button>

                  <button
                    className="p-3 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg transition-colors"
                    title="Fullscreen"
                  >
                    <Maximize className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="font-semibold text-blue-900 mb-3">Live Analysis Tips</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Ensure proper lighting and focus on your microscope</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Capture multiple frames for comprehensive analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Recording feature saves continuous video for later review</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Captured frames can be analyzed immediately or saved</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-blue-600" />
                Captured Frames ({capturedFrames.length})
              </h3>

              {capturedFrames.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Camera className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm">No frames captured yet</p>
                  <p className="text-xs mt-1">Click "Capture Frame" to start</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {capturedFrames.map(frame => (
                    <div
                      key={frame.id}
                      className={`border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                        selectedFrame?.id === frame.id
                          ? 'border-blue-500 shadow-lg'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedFrame(frame)}
                    >
                      <img
                        src={frame.imageData}
                        alt={`Captured frame ${frame.id}`}
                        className="w-full h-32 object-cover"
                      />
                      <div className="bg-gray-50 p-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-900">
                            {frame.timestamp.toLocaleTimeString()}
                          </p>
                          <p className="text-xs text-gray-600">
                            {frame.timestamp.toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteFrame(frame.id);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {capturedFrames.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button className="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all">
                    Analyze All Frames
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
