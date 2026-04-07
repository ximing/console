import { useState, useEffect } from 'react';
import { X, Download, Copy, Check } from 'lucide-react';
import { view } from '@rabjs/react';
import { QRCodeSVG } from 'qrcode.react';
import type { AppVersionDto } from '@x-console/dto';

interface QRModalProps {
  visible: boolean;
  version: AppVersionDto | null;
  onClose: () => void;
}

export const QRModal = view((props: QRModalProps) => {
  const [copied, setCopied] = useState<'android' | 'ios' | null>(null);

  // Reset copied state when modal closes
  useEffect(() => {
    if (!props.visible) {
      setCopied(null);
    }
  }, [props.visible]);

  const handleCopyUrl = async (url: string, type: 'android' | 'ios') => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const handleDownloadQR = (url: string, platform: string) => {
    // Create a canvas to export the QR code
    const svg = document.getElementById(`qr-${platform}`);
    if (!svg) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      if (ctx) {
        ctx.scale(2, 2);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      }

      const link = document.createElement('a');
      link.download = `qr-${platform}-${props.version?.version || 'unknown'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    // Properly encode SVG for UTF-8 to handle Unicode characters in URLs
      const encoder = new TextEncoder();
      const data = encoder.encode(svgData);
      const base64 = btoa(String.fromCharCode(...data));
      img.src = 'data:image/svg+xml;base64,' + base64;
  };

  if (!props.visible || !props.version) return null;

  const hasAndroid = !!props.version.androidUrl;
  const hasIos = !!props.version.iosUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={props.onClose}
      />

      {/* Modal */}
      <div className="relative bg-white/95 dark:bg-zinc-800/95 backdrop-blur-xl rounded-xl shadow-xl w-[400px] max-w-[90vw] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-zinc-700">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-zinc-50">
              Version {props.version.version}
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">
              Build {props.version.buildNumber}
            </p>
          </div>
          <button
            onClick={props.onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-all"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-6">
          {!hasAndroid && !hasIos && (
            <div className="text-center py-8 text-gray-500 dark:text-zinc-500">
              <p>No download URLs configured for this version.</p>
            </div>
          )}

          {/* Android QR */}
          {hasAndroid && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                  Android
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => props.version.androidUrl && handleCopyUrl(props.version.androidUrl, 'android')}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-all"
                    title="Copy URL"
                  >
                    {copied === 'android' ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                  <button
                    onClick={() => props.version.androidUrl && handleDownloadQR(props.version.androidUrl, 'android')}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-all"
                    title="Download QR"
                  >
                    <Download className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
              <div className="flex justify-center bg-white p-4 rounded-lg">
                <QRCodeSVG
                  id="qr-android"
                  value={props.version.androidUrl || ''}
                  size={180}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-zinc-500 truncate text-center">
                {props.version.androidUrl}
              </p>
            </div>
          )}

          {/* iOS QR */}
          {hasIos && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                  iOS
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => props.version.iosUrl && handleCopyUrl(props.version.iosUrl, 'ios')}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-all"
                    title="Copy URL"
                  >
                    {copied === 'ios' ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                  <button
                    onClick={() => props.version.iosUrl && handleDownloadQR(props.version.iosUrl, 'ios')}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-all"
                    title="Download QR"
                  >
                    <Download className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
              <div className="flex justify-center bg-white p-4 rounded-lg">
                <QRCodeSVG
                  id="qr-ios"
                  value={props.version.iosUrl || ''}
                  size={180}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-zinc-500 truncate text-center">
                {props.version.iosUrl}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
