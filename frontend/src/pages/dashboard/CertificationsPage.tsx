import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import type { CourseCertificate } from '../../types/course';
import { getMyCertificates } from '../../services/courseService';
import Toast from '../../components/Toast';

function formatIssuedDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function gradeFromScore(score: number): { letter: 'A' | 'B' | 'C'; className: string } | null {
  if (score >= 90) return { letter: 'A', className: 'bg-emerald-600/90 text-white border-emerald-500/50' };
  if (score >= 80) return { letter: 'B', className: 'bg-blue-600/90 text-white border-blue-500/50' };
  if (score >= 70) return { letter: 'C', className: 'bg-amber-600/90 text-white border-amber-500/50' };
  return null;
}

const CertificateCardSkeleton: React.FC = () => (
  <div className="rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-950/40 to-zinc-900/80 p-6 animate-pulse">
    <div className="h-3 w-3/4 rounded bg-amber-500/20 mb-4" />
    <div className="h-8 w-full rounded bg-amber-500/15 mb-3" />
    <div className="h-4 w-1/2 rounded bg-zinc-700/50 mb-2" />
    <div className="h-4 w-2/5 rounded bg-zinc-700/50 mb-4" />
    <div className="h-px bg-amber-500/20 mb-4" />
    <div className="h-4 w-1/3 rounded bg-zinc-700/50" />
  </div>
);

const CertificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState<CourseCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [printingCertificateId, setPrintingCertificateId] = useState<string | null>(null);

  const clearPrinting = useCallback(() => {
    setPrintingCertificateId(null);
  }, []);

  useEffect(() => {
    window.addEventListener('afterprint', clearPrinting);
    return () => window.removeEventListener('afterprint', clearPrinting);
  }, [clearPrinting]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const data = await getMyCertificates();
        if (!cancelled) {
          setCertificates(data);
          setLoadError(false);
        }
      } catch {
        if (!cancelled) {
          setCertificates([]);
          setLoadError(true);
          setToast({ type: 'error', message: 'Failed to load certificates' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePrint = (certificateId: string) => {
    setPrintingCertificateId(certificateId);
    window.requestAnimationFrame(() => {
      window.print();
    });
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="h-9 w-48 rounded-lg bg-zinc-800 animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CertificateCardSkeleton />
          <CertificateCardSkeleton />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <p className="text-zinc-300 mb-6">We could not load your certificates. Please try again.</p>
        <button
          type="button"
          onClick={() => {
            setLoadError(false);
            setLoading(true);
            void getMyCertificates()
              .then((data) => {
                setCertificates(data);
                setLoadError(false);
              })
              .catch(() => {
                setLoadError(true);
                setToast({ type: 'error', message: 'Failed to load certificates' });
              })
              .finally(() => setLoading(false));
          }}
          className="inline-flex rounded-lg border border-amber-500/50 bg-amber-500/10 px-5 py-2.5 text-sm font-semibold text-amber-100 hover:bg-amber-500/20"
        >
          Retry
        </button>
      </div>
    );
  }

  if (certificates.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 mb-6">
          <Shield className="w-8 h-8 text-amber-400" aria-hidden />
        </div>
        <h1 className="text-2xl font-semibold text-zinc-100 mb-2">No certificates yet</h1>
        <p className="text-zinc-400 mb-8">Complete a course to earn your first certificate</p>
        <button
          type="button"
          onClick={() => navigate('/dashboard/courses')}
          className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-900/30 hover:from-amber-400 hover:to-amber-500 transition-colors"
        >
          Browse Courses
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-wrap items-center gap-3 mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 tracking-tight">My Certificates</h1>
        <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-0.5 text-sm font-medium text-amber-200">
          {certificates.length}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {certificates.map((cert) => {
          const grade = gradeFromScore(cert.final_score);
          const isPrinting = printingCertificateId === cert.id;
          return (
            <article
              key={cert.id}
              className={`print-certificate flex flex-col rounded-xl border-2 border-amber-500/35 bg-gradient-to-br from-amber-950/50 via-zinc-900/90 to-zinc-950 p-6 shadow-xl shadow-black/40 ring-1 ring-amber-500/10 ${
                isPrinting ? 'printing-active' : ''
              }`}
            >
              <p className="text-xs font-bold tracking-[0.2em] text-amber-400/95 mb-3">
                🏆 CERTIFICATE OF COMPLETION
              </p>
              <h2 className="text-xl md:text-2xl font-bold text-amber-50 leading-snug mb-4">{cert.course_title}</h2>
              <dl className="space-y-2 text-sm text-zinc-300 mb-4">
                <div>
                  <dt className="sr-only">Certificate number</dt>
                  <dd>Certificate No: {cert.certificate_number}</dd>
                </div>
                <div>
                  <dt className="sr-only">Final score</dt>
                  <dd>Final Score: {cert.final_score}%</dd>
                </div>
                <div>
                  <dt className="sr-only">Issued</dt>
                  <dd>Issued: {formatIssuedDate(cert.issued_at)}</dd>
                </div>
              </dl>
              <div className="border-t border-amber-500/25 my-2" role="presentation" />
              <p className="text-zinc-200 font-medium mb-6">{cert.trainee_username}</p>

              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 no-print">
                {grade ? (
                  <span
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-lg font-bold ${grade.className}`}
                  >
                    {grade.letter}
                  </span>
                ) : (
                  <span className="text-xs text-zinc-500">Score below course threshold</span>
                )}
                <button
                  type="button"
                  onClick={() => handlePrint(cert.id)}
                  className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/20 transition-colors"
                >
                  Download
                </button>
              </div>

              {grade && (
                <div className="hidden print:flex print:mt-4 print:items-center print:justify-center">
                  <span
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-full border-2 text-xl font-bold ${grade.className}`}
                  >
                    {grade.letter}
                  </span>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default CertificationsPage;
