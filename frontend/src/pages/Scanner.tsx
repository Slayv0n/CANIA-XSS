import { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Download } from '../assets/icons';
import CustomSelect from '../components/CustomSelect';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

type ScanStatus = 'idle' | 'scanning' | 'ready';

export function Scanner() {
  const { t } = useLanguage();
  const { hasSubscription } = useAuth();
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  const [url, setUrl] = useState('');
  const [scannedHost, setScannedHost] = useState('');
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [textIndex, setTextIndex] = useState(0);

  const [selectedAttack, setSelectedAttack] = useState('');
  const [selectedDepth, setSelectedDepth] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reportText, setReportText] = useState('');

  const reportRef = useRef<HTMLDivElement>(null);

  const scanTexts = [
    t('scanner.scanText1'),
    t('scanner.scanText2'),
    t('scanner.scanText3'),
  ];

  const attackTypes = [t('scanner.xss'), t('scanner.sql'), t('scanner.csrf'), t('scanner.idor'), t('scanner.allTypes')];
  const depthLevels = [t('scanner.low'), t('scanner.medium'), t('scanner.high')];

  useEffect(() => {
    if (scanStatus !== 'scanning') return;
    const interval = setInterval(() => {
      setTextIndex((prevIndex) => (prevIndex + 1) % scanTexts.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [scanStatus, scanTexts.length]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  },[]);

  useEffect(() => {
    if (taskId) {
        const token = localStorage.getItem('token');
        if (!token) return;

        setScanStatus('scanning');

        api.getTask(taskId, token)
            .then((task) => {
                setScannedHost(task.host);
                setReportText(task.reportContent || t('scanner.reportEmpty'));
                setScanStatus('ready');
            })
            .catch((err) => {
                console.error(err);
                setError(t('scanner.loadError'));
                setScanStatus('idle');
            });
    } else {
        setScanStatus('idle');
        setUrl('');
        setScannedHost('');
    }
  }, [taskId]);

  const startScan = async () => {
    setError(null);

    if (!url) { setError(t('scanner.errorNoUrl')); return; }
    if (!selectedAttack || !selectedDepth) { setError(t('scanner.errorNoOptions')); return; }
    if (!url.includes('.')) { setError(t('scanner.errorInvalidUrl')); return; }

    const token = localStorage.getItem('token');
    if (!token) { setError(t('scanner.errorNotAuth')); return; }

    const attackMap: Record<string, number> = { [t('scanner.xss')]: 1, [t('scanner.sql')]: 2, [t('scanner.allTypes')]: 1 };
    const depthMap: Record<string, number> = { [t('scanner.low')]: 1, [t('scanner.medium')]: 2, [t('scanner.high')]: 3 };

    try {
        setScannedHost(url);
        setScanStatus('scanning');
        setTextIndex(0);

        const taskData = {
            host: url,
            typeOfAttacks: [attackMap[selectedAttack] || 1],
            depth: depthMap[selectedDepth] || 1
        };

        const result = await api.createTask(taskData, token);

        const intervalId = setInterval(async () => {
            try {
                const checkTask = await api.getTask(result.id, token);
                if (checkTask.status === 5) {
                    setReportText(checkTask.reportContent || t('scanner.reportEmptyShort'));
                    setScanStatus('ready');
                    clearInterval(intervalId);
                }
            } catch (e) {
                console.error("Ошибка опроса статуса", e);
            }
        }, 2000);

    } catch (err: any) {
        setScanStatus('idle');
        setError(err.message || t('scanner.scanError'));
    }
  };

  const handleDownload = () => {
    const blob = new Blob([reportText], { type: 'text/markdown' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `CANIA_Report_${scannedHost.replace(/[^a-z0-9]/gi, '_')}.md`;
    link.click();
  };


  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        reportRef.current?.requestFullscreen().catch(err => {
            console.error("Ошибка фуллскрина:", err);
        });
    } else {
        document.exitFullscreen();
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-12 relative z-10 flex flex-col">

        {scanStatus !== 'ready' && (
            <div className="animate-fade-in">
                <section className="mb-12 mt-8">
                    <h1 className="text-4xl md:text-5xl font-bold uppercase text-main-text mb-4">
                        {t('scanner.title')}
                    </h1>
                    <p className="text-brand-red text-xs uppercase font-bold tracking-wider">
                        {t('scanner.warning')}
                    </p>
                </section>

                {error && (
                <div className="mb-6 bg-brand-red/10 border border-brand-red text-red-500 px-4 py-3 rounded-xl flex items-center gap-3">
                    <span className="text-sm font-medium">{error}</span>
                </div>
                )}

                <section className="flex flex-col md:flex-row gap-4 mb-8">
                    <input
                        type="text"
                        placeholder={t('scanner.placeholder')}
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={scanStatus === 'scanning'}
                        className="flex-1 bg-transparent border border-card-border p-4 rounded-sm text-main-text outline-none focus:border-brand-red transition-colors disabled:opacity-50"
                    />
                    <button
                        onClick={startScan}
                        disabled={!hasSubscription || scanStatus === 'scanning'}
                        className={`px-10 py-4 font-bold uppercase rounded-sm flex items-center justify-center gap-2 transition-all
                            ${!hasSubscription ? 'bg-gray-600 opacity-50 cursor-not-allowed' : 'bg-brand-red hover:bg-red-700 cursor-pointer'}`}
                    >
                        {scanStatus === 'scanning' ? t('scanner.scanningBtn') : t('scanner.auditBtn')} <span className="text-xl">→</span>
                    </button>
                </section>

                {!hasSubscription && (
                    <p className="text-brand-red text-[10px] -mt-6 mb-6 uppercase font-bold text-right">
                        {t('scanner.noSub')}
                    </p>
                )}

                <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
                    <CustomSelect value={selectedAttack} onChange={setSelectedAttack} options={attackTypes} placeholder={t('scanner.attackType')} />
                    <CustomSelect value={selectedDepth} onChange={setSelectedDepth} options={depthLevels} placeholder={t('scanner.depth')} />
                </section>

                {scanStatus === 'scanning' && (
                    <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
                        <div className="mb-8">
                            <svg className="w-16 h-16 text-brand-red animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <circle cx="12" cy="12" r="10" strokeDasharray="45 20" />
                            </svg>
                        </div>
                        <p key={textIndex} className="animate-slide-text font-mono text-sm md:text-base text-desc-text h-6 uppercase">
                            {scanTexts[textIndex]}
                        </p>
                    </div>
                )}
            </div>
        )}

        {scanStatus === 'ready' && (
            <div className="animate-fade-in flex-1 flex flex-col mt-4 md:mt-8">

                {!isFullscreen && (
                    <button
                        onClick={() => {
                            navigate('/scanner');
                            setScanStatus('idle');
                            setUrl('');
                        }}
                        className="text-desc-text hover:text-white mb-6 flex items-center gap-2 cursor-pointer w-fit uppercase text-sm font-bold tracking-wider"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                        {t('scanner.newScan')}
                    </button>
                )}

                <section className='flex justify-between items-center mb-6 shrink-0'>
                    <h2 className='text-2xl md:text-3xl font-bold uppercase tracking-wide'>
                        {t('scanner.reportTitle')} <span className="text-brand-red lowercase">{scannedHost}</span>
                    </h2>
                    <button
                        onClick={handleDownload}
                        className='flex items-center bg-brand-red hover:bg-red-700 py-3 px-8 rounded-sm font-bold uppercase gap-3 cursor-pointer transition-colors shadow-lg shadow-brand-red/20'
                    >
                        {t('scanner.download')} <Download />
                    </button>

                </section>

                <div
                    ref={reportRef}
                    className={`border border-card-border rounded-lg overflow-hidden bg-[#0A0A0A] flex flex-col relative transition-all duration-300 ${isFullscreen ? 'w-screen h-screen' : 'h-150'}`}
                >

                    <div className="flex justify-between items-center bg-[#151515] px-6 py-3 border-b border-card-border text-xs md:text-sm font-mono text-desc-text shrink-0 z-20">
                        <div className="flex-1 italic">*report_{scannedHost}.md*</div>

                        <div className="flex items-center gap-4 bg-black/50 px-4 py-1 rounded-full border border-card-border">
                            <button onClick={() => setZoom(z => Math.max(z - 10, 50))} className="hover:text-brand-red cursor-pointer select-none text-lg leading-none">—</button>
                            <span className="text-main-text min-w-11.25 text-center select-none">{zoom}%</span>
                            <button onClick={() => setZoom(z => Math.min(z + 10, 200))} className="hover:text-brand-red cursor-pointer select-none text-lg leading-none">+</button>
                        </div>

                        <div className="flex-1 flex justify-end">
                            <button onClick={toggleFullscreen} className="hover:text-white cursor-pointer p-2 bg-white/5 rounded-md hover:bg-white/10 transition-colors">
                                {isFullscreen ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v5H3M16 3v5h5M8 21v-5H3M16 21v-5h5" /></svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 relative min-h-0 bg-main-bg">
                        <div className="absolute inset-0 overflow-auto custom-scrollbar p-6 md:p-12 z-10">

                            <div
                                className="max-w-4xl mx-auto font-mono text-desc-text leading-relaxed"
                                style={{ fontSize: `${zoom}%` }}
                            >
                                <ReactMarkdown
                                    children={reportText.replace(/^[ \t]+/gm, '')}
                                    components={{
                                        h1: ({node, ...props}) => <h1 className="text-[2em] font-bold text-white mb-6 border-b border-white/10 pb-4 uppercase tracking-wide" {...props} />,
                                        h2: ({node, ...props}) => <h2 className="text-[1.5em] font-bold text-white mt-10 mb-4" {...props} />,
                                        p: ({node, ...props}) => {
                                            const text = String(props.children);
                                            const isLog = text.includes('[INFO]') || text.includes('[SUCCESS]');
                                            return <p className={`mb-3 text-[1em] ${isLog ? 'text-green-500 font-mono text-[0.9em]' : 'text-gray-300'}`} {...props} />;
                                        },
                                        ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-6 space-y-2 marker:text-brand-red text-[1em]" {...props} />,
                                        li: ({node, ...props}) => <li className="text-gray-300" {...props} />,
                                        strong: ({node, ...props}) => <strong className="text-brand-red font-bold" {...props} />,
                                    }}
                                />
                            </div>

                        </div>

                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 z-0 overflow-hidden">
                            <p className="font-black text-4xl md:text-8xl uppercase -rotate-12 select-none whitespace-nowrap">
                                CANIA REPORT PREVIEW
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </main>
      <Footer />
    </div>
  );
}
