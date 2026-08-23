import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  QrCode, Camera, Upload, Search, CheckCircle2, AlertCircle,
  Clock, Check, Undo2, Printer, Phone,
  RefreshCw, X, CreditCard
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function QRScannerModal({
  isOpen,
  onClose,
  delegates = [],
  onToggleArrival,
  onApprovePayment,
  onPrintBadge,
  initialPassId = null
}) {
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scannedPassId, setScannedPassId] = useState(initialPassId || '');
  const [matchedDelegate, setMatchedDelegate] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [scanMode, setScanMode] = useState('camera'); // 'camera', 'upload', 'manual'
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');

  const html5QrCodeRef = useRef(null);
  const fileInputRef = useRef(null);
  const scannerContainerId = 'confiq-qr-reader';

  // Play audio chime on successful scan
  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
      // Audio context might be restricted
    }
  };

  // Helper to extract Pass ID from QR code text (can be raw ID or full URL)
  const extractPassId = (qrText) => {
    if (!qrText) return '';
    const trimmed = qrText.trim();
    
    // Check if it's a URL with scan= or pass_id= or id=
    try {
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.includes('?')) {
        const url = new URL(trimmed.startsWith('http') ? trimmed : `https://example.com/${trimmed}`);
        const scanParam = url.searchParams.get('scan') || url.searchParams.get('pass_id') || url.searchParams.get('id');
        if (scanParam) return scanParam.trim();
      }
    } catch (e) {
      // Not a valid URL, continue with regex
    }

    // Match CONFIQ Pass ID pattern: CF-2026-XXXX or CF-XXXX or any alphanumeric pattern
    const match = trimmed.match(/CF-\d{4}-\d+/i) || trimmed.match(/CF-\d+/i) || trimmed.match(/CF-[A-Za-z0-9-]+/i);
    if (match) {
      return match[0].toUpperCase();
    }

    return trimmed;
  };

  // Find delegate by Pass ID or phone or name
  const findDelegate = (query) => {
    if (!query || !delegates.length) return null;
    const clean = query.trim().toLowerCase();
    return delegates.find(d => 
      (d.id && d.id.toLowerCase() === clean) ||
      (d.pass_id && d.pass_id.toLowerCase() === clean) ||
      (d.phone && d.phone.replace(/\D/g, '') === clean.replace(/\D/g, '') && clean.replace(/\D/g, '').length >= 10) ||
      (d.fullName && d.fullName.toLowerCase() === clean)
    ) || null;
  };

  // Handle successful scan
  const handleScanSuccess = (decodedText) => {
    const passId = extractPassId(decodedText);
    if (!passId) return;

    playBeep();
    setScannedPassId(passId);
    
    const found = findDelegate(passId);
    setMatchedDelegate(found);

    if (!found) {
      setActionSuccessMsg(`Pass ID scanned: ${passId} (Not found in database)`);
    } else {
      setActionSuccessMsg(`Scanned: ${found.fullName} (${found.id})`);
    }

    // Pause scanner temporarily so user can review details
    stopScanner();
  };

  // Initialize and start live camera scanner
  const startScanner = async () => {
    setCameraError('');
    try {
      // Check available cameras
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length) {
        setCameras(devices);
        const preferredCam = selectedCameraId || devices.find(d => /back|rear|environment/i.test(d.label))?.id || devices[0].id;
        setSelectedCameraId(preferredCam);

        if (!html5QrCodeRef.current) {
          html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);
        }

        const qrConfig = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        };

        await html5QrCodeRef.current.start(
          preferredCam,
          qrConfig,
          (decodedText) => {
            handleScanSuccess(decodedText);
          },
          (errorMessage) => {
            // Ignore frame parse errors
          }
        );
        setScannerActive(true);
      } else {
        setCameraError('No camera detected on this device.');
      }
    } catch (err) {
      console.error('Camera scanner error:', err);
      setCameraError(err.message || 'Unable to access camera. Please allow camera permissions.');
      setScannerActive(false);
    }
  };

  // Stop camera scanner
  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setScannerActive(false);
  };

  // Switch camera
  const handleSwitchCamera = async (camId) => {
    setSelectedCameraId(camId);
    await stopScanner();
    setTimeout(() => {
      startScanner();
    }, 200);
  };

  // Handle image file upload scanning
  const handleFileUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);
      }
      const decodedText = await html5QrCodeRef.current.scanFile(file, true);
      handleScanSuccess(decodedText);
    } catch (err) {
      alert('Could not find or decode a QR code in this image. Please try a clearer photo or enter Pass ID manually.');
    }
  };

  // Manual search submit
  const handleManualSearch = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    const passId = extractPassId(manualInput);
    setScannedPassId(passId);
    const found = findDelegate(passId);
    setMatchedDelegate(found);
    if (!found) {
      setActionSuccessMsg(`No delegate found for "${manualInput}"`);
    } else {
      setActionSuccessMsg(`Found: ${found.fullName}`);
    }
  };

  // Sync initialPassId prop if passed
  useEffect(() => {
    if (initialPassId && isOpen) {
      const passId = extractPassId(initialPassId);
      setScannedPassId(passId);
      const found = findDelegate(passId);
      setMatchedDelegate(found);
    }
  }, [initialPassId, isOpen, delegates]);

  // Keep matchedDelegate in sync if delegates state updates in parent
  useEffect(() => {
    if (scannedPassId && delegates.length) {
      const found = findDelegate(scannedPassId);
      if (found) {
        setMatchedDelegate(found);
      }
    }
  }, [delegates, scannedPassId]);

  // Start / stop scanner based on modal visibility and active mode
  useEffect(() => {
    if (isOpen && scanMode === 'camera' && !matchedDelegate) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen, scanMode, matchedDelegate]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop();
          }
          html5QrCodeRef.current.clear();
        } catch (e) {}
      }
    };
  }, []);

  if (!isOpen) return null;

  const isArrived = matchedDelegate && (matchedDelegate.arrived === true || matchedDelegate.attendanceStatus === 'ARRIVED');
  const paymentStatus = (matchedDelegate?.paymentStatus || 'PENDING_VERIFICATION').toUpperCase();
  const isPaid = paymentStatus.includes('PAID');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-emerald-800/30 text-gray-800 my-auto animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#17472B] via-[#1f5a38] to-[#17472B] text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
              <QrCode className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                Pass Scanner & Arrival Check-In
              </h2>
              <p className="text-xs text-emerald-200 font-medium">Scan delegate QR code to identify and record arrival</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scan Mode Switcher */}
        <div className="flex border-b border-gray-200 bg-gray-50/80 p-1.5 gap-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setScanMode('camera'); setMatchedDelegate(null); }}
            className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              scanMode === 'camera' && !matchedDelegate
                ? 'bg-[#17472B] text-white shadow'
                : 'text-gray-600 hover:bg-gray-200/70'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Camera Scanner</span>
          </button>

          <button
            type="button"
            onClick={() => { setScanMode('upload'); }}
            className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              scanMode === 'upload'
                ? 'bg-[#17472B] text-white shadow'
                : 'text-gray-600 hover:bg-gray-200/70'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload Image</span>
          </button>

          <button
            type="button"
            onClick={() => { setScanMode('manual'); }}
            className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              scanMode === 'manual'
                ? 'bg-[#17472B] text-white shadow'
                : 'text-gray-600 hover:bg-gray-200/70'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Manual Lookup</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 space-y-4">

          {/* If matched delegate found */}
          {matchedDelegate ? (
            <div className="space-y-4">
              
              {/* Status Alert Banner */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                isArrived 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-center gap-3">
                  {isArrived ? (
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shrink-0">
                      <Clock className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-black uppercase tracking-wider">
                      {isArrived ? 'Delegate Checked In / Arrived' : 'Arrival Pending Check-In'}
                    </div>
                    <div className="text-xs font-semibold opacity-90">
                      {isArrived 
                        ? `Arrival recorded: ${matchedDelegate.arrivedAt ? new Date(matchedDelegate.arrivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Just now'}`
                        : 'Delegate has not been marked as arrived at the venue.'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleArrival(matchedDelegate.id, !isArrived)}
                  className={`px-4 py-2.5 rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer ${
                    isArrived
                      ? 'bg-gray-200 hover:bg-red-100 hover:text-red-700 text-gray-700'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white animate-pulse'
                  }`}
                >
                  {isArrived ? (
                    <>
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Undo Check-In</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-amber-300" />
                      <span>Check In Now</span>
                    </>
                  )}
                </button>
              </div>

              {/* Delegate Full Details Card */}
              <div className="bg-gradient-to-br from-[#17472B] to-[#0f341f] text-white p-5 rounded-3xl shadow-xl relative overflow-hidden border border-emerald-800/80">
                
                <div className="flex items-start justify-between gap-3 border-b border-emerald-700/60 pb-3 mb-3">
                  <div>
                    <span className="text-[10px] font-mono font-black text-amber-300 bg-black/40 px-2.5 py-1 rounded-lg border border-amber-400/30 inline-block mb-1.5">
                      {matchedDelegate.id}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                      {matchedDelegate.fullName}
                    </h3>
                    <p className="text-xs text-emerald-200 font-medium">
                      Age: {matchedDelegate.age} yrs • {matchedDelegate.status}
                    </p>
                  </div>

                  {/* QR Code Preview Thumbnail */}
                  <div className="p-1.5 bg-white rounded-xl shadow-inner shrink-0">
                    <QRCodeSVG
                      value={matchedDelegate.id}
                      size={54}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="bg-black/30 p-2.5 rounded-xl border border-emerald-800/40">
                    <span className="text-[10px] text-gray-300 uppercase font-bold block">Study Range</span>
                    <span className="font-extrabold text-[#C5DF9F]">{matchedDelegate.studyRange || 'N/A'}</span>
                  </div>

                  <div className="bg-black/30 p-2.5 rounded-xl border border-emerald-800/40">
                    <span className="text-[10px] text-gray-300 uppercase font-bold block">Birudam / Sanad</span>
                    <span className="font-semibold text-white truncate block">
                      {(matchedDelegate.sanad && matchedDelegate.sanad !== 'N/A') ? matchedDelegate.sanad : ((matchedDelegate.birudam && matchedDelegate.birudam !== 'N/A') ? matchedDelegate.birudam : 'N/A')}
                    </span>
                  </div>

                  <div className="bg-black/30 p-2.5 rounded-xl border border-emerald-800/40 col-span-2">
                    <span className="text-[10px] text-gray-300 uppercase font-bold block">Institution / Campus / Position</span>
                    <span className="font-medium text-gray-100 block">
                      {matchedDelegate.status === 'Student' ? (matchedDelegate.campus || 'N/A') : (matchedDelegate.position || 'N/A')}
                    </span>
                  </div>

                  <div className="bg-black/30 p-2.5 rounded-xl border border-emerald-800/40">
                    <span className="text-[10px] text-gray-300 uppercase font-bold block">Phone / Mobile</span>
                    <span className="font-mono font-bold text-white">{matchedDelegate.phone || 'N/A'}</span>
                  </div>

                  <div className="bg-black/30 p-2.5 rounded-xl border border-emerald-800/40">
                    <span className="text-[10px] text-gray-300 uppercase font-bold block">Payment Status</span>
                    <span className={`font-black text-xs inline-flex items-center gap-1 ${
                      isPaid ? 'text-emerald-300' : 'text-amber-300'
                    }`}>
                      {isPaid ? 'PAID (₹200)' : 'PENDING VERIFICATION'}
                    </span>
                  </div>
                </div>

                {matchedDelegate.utrNumber && matchedDelegate.utrNumber !== 'N/A' && (
                  <div className="mt-2.5 p-2 bg-black/40 rounded-xl border border-emerald-700/40 flex items-center justify-between text-xs font-mono">
                    <span className="text-gray-300 text-[11px]">UTR / Ref:</span>
                    <span className="font-bold text-amber-300">{matchedDelegate.utrNumber}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {!isPaid && (
                  <button
                    type="button"
                    onClick={() => onApprovePayment && onApprovePayment(matchedDelegate)}
                    className="p-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow"
                    title="Inspect Receipt & Verify Payment"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Verify & Approve</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onPrintBadge && onPrintBadge(matchedDelegate)}
                  className="p-2.5 bg-[#17472B] hover:bg-[#1f5a38] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Pass Badge</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const cleanPhone = (matchedDelegate.whatsapp || matchedDelegate.phone || '').replace(/\D/g, '');
                    window.open(`https://api.whatsapp.com/send?phone=91${cleanPhone}&text=Assalamu%20Alaikum%20${encodeURIComponent(matchedDelegate.fullName)},%20welcome%20to%20CONFIQ%202026!%20Pass%20ID:%20${matchedDelegate.id}`, '_blank');
                  }}
                  className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMatchedDelegate(null);
                    setScannedPassId('');
                    setManualInput('');
                    if (scanMode === 'camera') startScanner();
                  }}
                  className="col-span-2 sm:col-span-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-emerald-800" />
                  <span>Scan Another Delegate</span>
                </button>
              </div>

            </div>
          ) : (
            /* Scanner View when no delegate is selected yet */
            <div className="space-y-4">
              
              {/* Camera Scanner Mode */}
              {scanMode === 'camera' && (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-w-xs mx-auto border-2 border-emerald-600 shadow-xl flex items-center justify-center">
                    <div id={scannerContainerId} className="w-full h-full"></div>
                    {!scannerActive && !cameraError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-4 text-center">
                        <RefreshCw className="w-8 h-8 text-amber-300 animate-spin mb-2" />
                        <p className="text-xs font-semibold">Starting camera...</p>
                      </div>
                    )}
                  </div>

                  {cameraError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Camera Access Issue</p>
                        <p>{cameraError}</p>
                        <button
                          type="button"
                          onClick={startScanner}
                          className="mt-2 px-3 py-1 bg-red-600 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                        >
                          Retry Camera
                        </button>
                      </div>
                    </div>
                  )}

                  {cameras.length > 1 && (
                    <div className="flex items-center justify-between text-xs text-gray-600 bg-gray-100 p-2 rounded-xl">
                      <span className="font-medium">Camera:</span>
                      <select
                        value={selectedCameraId}
                        onChange={(e) => handleSwitchCamera(e.target.value)}
                        className="text-xs bg-white border border-gray-300 rounded-lg px-2 py-1 font-semibold"
                      >
                        {cameras.map(c => (
                          <option key={c.id} value={c.id}>{c.label || `Camera ${c.id.slice(0, 5)}`}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Upload Image Mode */}
              {scanMode === 'upload' && (
                <div className="space-y-3">
                  <div
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    className="border-2 border-dashed border-emerald-600/40 hover:border-emerald-600 rounded-2xl p-8 text-center cursor-pointer bg-emerald-50/50 hover:bg-emerald-50 transition-all flex flex-col items-center justify-center gap-2"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-extrabold text-gray-800">Upload Badge or QR Code Photo</p>
                    <p className="text-xs text-gray-500">Tap to select photo from gallery or file manager</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              )}

              {/* Manual Lookup Mode */}
              <div className="space-y-2">
                <form onSubmit={handleManualSearch} className="flex gap-2">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Enter Pass ID (e.g. CF-2026-5357) or Phone..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#17472B]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-[#17472B] hover:bg-[#20603B] text-white rounded-xl font-extrabold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                    <span>Search</span>
                  </button>
                </form>

                {actionSuccessMsg && (
                  <p className="text-xs font-semibold text-gray-600 bg-gray-100 p-2 rounded-xl text-center">
                    {actionSuccessMsg}
                  </p>
                )}
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
