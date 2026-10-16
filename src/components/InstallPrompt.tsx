'use client';

import React, { useEffect, useState } from 'react';
import { Download, Smartphone, X, Share2, PlusSquare, CheckCircle2 } from 'lucide-react';

interface InstallPromptProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: any;
  onInstall?: () => void;
}

export const InstallPrompt: React.FC<InstallPromptProps> = ({
  isOpen,
  onClose,
  deferredPrompt: propDeferredPrompt,
  onInstall: propOnInstall,
}) => {
  const [internalDeferredPrompt, setInternalDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const activePrompt = propDeferredPrompt || internalDeferredPrompt;

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const checkStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(checkStandalone);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Capture beforeinstallprompt event for Android / Chrome / Edge
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInternalDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (propOnInstall) {
      propOnInstall();
      onClose();
      return;
    }

    if (activePrompt) {
      activePrompt.prompt();
      const choiceResult = await activePrompt.userChoice;
      if (choiceResult?.outcome === 'accepted') {
        console.log('User accepted the PWA install prompt');
      }
      setInternalDeferredPrompt(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 relative animate-in fade-in slide-in-from-bottom-6 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 leading-tight">
              Download Mama Sela
            </h3>
            <p className="text-[11px] text-slate-500">Pasang aplikasi di layar utama HP</p>
          </div>
        </div>

        {isStandalone ? (
          <div className="p-3 bg-green-50 border border-green-200 rounded-2xl text-center space-y-1">
            <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto" />
            <p className="text-xs font-bold text-green-800">Aplikasi Sudah Terpasang!</p>
            <p className="text-[11px] text-green-600">
              Anda sedang menggunakan aplikasi Mama Sela versi terinstall.
            </p>
          </div>
        ) : isIOS ? (
          /* iOS Safari Guide */
          <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-700">
            <p className="font-bold text-slate-900 flex items-center gap-1.5 text-[11px]">
              <Share2 className="w-3.5 h-3.5 text-blue-600" />
              Cara Download di iPhone / iPad (Safari):
            </p>
            <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-slate-600">
              <li>
                Ketuk tombol <b>Bagikan (Share)</b> di bilah bawah browser Safari.
              </li>
              <li>
                Gulir ke bawah dan ketuk menu <b>"Tambahkan ke Layar Utama" (Add to Home Screen)</b>.
              </li>
              <li>
                Ketuk <b>Tambah (Add)</b> di pojok kanan atas layar HP Anda.
              </li>
            </ol>
            <p className="text-[10px] text-slate-400 text-center pt-1">
              Ikon aplikasi Mama Sela akan langsung muncul di beranda HP Anda!
            </p>
          </div>
        ) : (
          /* Android / Chrome Native Install */
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                Keuntungan Download Aplikasi:
              </p>
              <ul className="list-disc pl-4 text-[11px] space-y-0.5 text-blue-800">
                <li>Bisa dibuka langsung tanpa perlu buka browser.</li>
                <li>Tetap bisa diakses saat tidak ada koneksi internet (Offline).</li>
                <li>Loading lebih cepat dan tampilan full screen seperti aplikasi native.</li>
              </ul>
            </div>

            {activePrompt ? (
              <button
                onClick={handleInstallClick}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs transition active:scale-95 shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Pasang Sekarang (Download App)
              </button>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-1.5 text-xs text-slate-600">
                <p className="font-semibold">Cara Pasang di Browser:</p>
                <p className="text-[11px] text-slate-500">
                  Ketuk ikon titik tiga (⋮) di pojok kanan atas browser Anda, lalu pilih <b>"Install App"</b> atau <b>"Tambahkan ke Layar Utama"</b>.
                </p>
              </div>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-2xl text-xs transition"
        >
          Tutup
        </button>
      </div>
    </div>
  );
};
