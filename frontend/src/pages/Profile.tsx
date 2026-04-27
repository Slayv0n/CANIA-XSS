import { useEffect, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { api, TaskItem } from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CloseIcon , Download, ArrowUpRight} from '../assets/icons';
import { useLanguage } from '../context/LanguageContext';


export function Profile() {
  const { t } = useLanguage();
  const [reports, setReports] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [subLoading, setSubLoading] = useState(true);
  const navigate = useNavigate();

  const { userEmail } = useAuth();

  // Маппинг названия тарифа с бэкенда на локализованный ключ
  // Старый вариант функции оставлен для справки (закомментирован)
  // const getLocalizedPlanName = (name: string): string => {
  //   const lower = name.toLowerCase();
  //   if (lower.includes('1 month') || lower.includes('1 месяц')) return t('profile.planMonth1');
  //   if (lower.includes('6 month') || lower.includes('6 месяц')) return t('profile.planMonth6');
  //   if (lower.includes('year') || lower.includes('год')) return t('profile.planYear1');
  //   return name; // fallback — показать как есть
  // };

  // Новый вариант, безопасный к `undefined`
  const getLocalizedPlanName = (name?: string): string => {
    if (!name) return '';
    const lower = name.toLowerCase();
    if (lower.includes('1 month') || lower.includes('1 месяц')) return t('profile.planMonth1');
    if (lower.includes('6 month') || lower.includes('6 месяц')) return t('profile.planMonth6');
    if (lower.includes('year') || lower.includes('год')) return t('profile.planYear1');
    return name; // fallback
  };

  const handleDownload = (e: React.MouseEvent, host: string) => {
    e.stopPropagation();
    const reportText = `ОТЧЕТ CANIA-XSS\nЦель: ${host}\nСтатус: Уязвимостей не найдено (MVP)\nДата: ${new Date().toLocaleString()}`;
    const blob = new Blob([reportText], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Cania_Report_${host.replace(/[^a-z0-9]/gi, '_')}.txt`;
    link.click();
  };

  const handleDelete = async (taskId: string) => {
    try {
        await api.deleteTask(taskId);
        setReports(reports.filter(report => report.id !== taskId));
    } catch (err) {
        console.error("Ошибка удаления отчета:", err);
    }
  };

  const handleCancelSub = async () => {
    try {
      await api.cancelSubscription();
      setSubscription(null);
    } catch (err) {
      console.error(err);
      alert(t('profile.subCancelError'));
    }
  };

  useEffect(() => {
    api.getMyTasks()
      .then((data) => {
        setReports(data);
      })
      .catch((err) => {
        console.error("Ошибка загрузки профиля:", err);
      })
      .finally(() => setLoading(false));

    api.getMySubscription()
      .then(setSubscription)
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setSubLoading(false));
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-main-bg">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:py-20 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">

            <div className="md:col-span-2 flex flex-col">
                <h1 className="text-3xl font-bold uppercase text-main-text mb-8">
                    {t('profile.title')}
                </h1>

                <div className="flex flex-col gap-4">
                    {loading ? (
                        // СКЕЛЕТОНЫ ЗАГРУЗКИ
                        <div className="flex flex-col gap-4">
                            {[1, 2, 3].map((skeleton) => (
                                <div 
                                    key={skeleton} 
                                    className="w-full h-22.5 bg-card-border/30 rounded-xl animate-pulse flex justify-between items-center p-6"
                                >
                                    <div className="flex flex-col gap-3 w-1/2">
                                        <div className="h-4 bg-card-border/50 rounded w-3/4"></div>
                                        <div className="h-3 bg-card-border/50 rounded w-1/4"></div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 bg-card-border/50 rounded-full"></div>
                                        <div className="w-10 h-10 bg-card-border/50 rounded-full"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : reports.length > 0 ? (
                        reports.map((report) => (
                            <div
                                key={report.id}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        navigate(`/scanner/${report.id}`);
                                    }
                                }}
                                onClick={() => navigate(`/scanner/${report.id}`)}
                                className="w-full flex justify-between items-center p-6 bg-card-bg border border-card-border rounded-xl hover:border-brand-red transition-colors duration-300 group cursor-pointer"
                            >
                                <div className="flex flex-col items-start gap-1 text-left">
                                    <span className="text-main-text font-medium uppercase text-sm">
                                        {t('profile.reportPrefix')} {report.host}
                                    </span>
                                    <span className={`text-[10px] uppercase font-bold ${report.status === 5 ? 'text-green-500' : 'text-brand-red'}`}>
                                        {report.status === 5 ? t('scanner.ready') : t('scanner.inProcess')}
                                    </span>
                                </div>

                                <div className="flex items-center gap-8">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(report.id);
                                        }}
                                        className="hover:bg-white/10 rounded-full text-desc-text hover:text-brand-red transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
                                        aria-label={t('profile.deleteReport')}
                                        title={t('profile.deleteReport')}
                                    >
                                        <CloseIcon />
                                    </button>

                                    <button
                                        onClick={(e) => handleDownload(e, report.host)}
                                        className="hover:bg-white/10 rounded-full text-desc-text hover:text-brand-red transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
                                        aria-label={t('profile.downloadReport')}
                                        title={t('profile.downloadReport')}
                                    >
                                        <Download />
                                    </button>

                                    <ArrowUpRight className="w-6 h-6 text-desc-text group-hover:text-brand-red transition-colors duration-300"/>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-10 border border-dashed border-card-border rounded-xl text-center">
                            <p className="text-desc-text">{t('profile.noReports')}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="md:col-span-1 flex flex-col">
                <div className="bg-card-bg border border-card-border rounded-xl p-8 min-h-125">

                    <h2 className="text-2xl font-bold uppercase text-main-text mb-12">
                        {t('profile.subTitle')}
                    </h2>

                    {subscription && (
                            <button
                                onClick={handleCancelSub}
                                style={{ marginTop: '30px', color: 'gray', fontSize: '12px', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                            >
                                {t('profile.devReset')}
                            </button>
                    )}

                    <div className="text-desc-text text-sm leading-relaxed flex flex-col gap-6">

                        <div>
                            <p className="text-desc-text text-xs uppercase tracking-wider mb-1">{t('profile.account')}</p>
                            <p className="font-bold text-main-text truncate" title={userEmail || ''}>
                                {userEmail || t('profile.unknown')}
                            </p>
                        </div>

                        {subLoading ? (
                            <p className="animate-pulse text-brand-red">{t('profile.checking')}</p>
                        ) : subscription ? (
                            <>
                                <div>
                                    <p className="text-desc-text text-xs uppercase tracking-wider mb-1">{t('profile.currentTariff')}</p>
                                    <p className="font-bold text-brand-red text-xl uppercase">
                                        {getLocalizedPlanName(subscription.name)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-desc-text text-xs uppercase tracking-wider mb-1">{t('profile.status')}</p>
                                    <p className="text-green-500 font-bold uppercase tracking-wider">
                                        {t('profile.active')}
                                    </p>
                                </div>
                                <div className="mt-4 pt-4 border-t border-card-border">
                                    <p className="text-xs opacity-70">
                                        {t('profile.unlimitedText')}
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <p className="text-desc-text text-xs uppercase tracking-wider mb-1">{t('profile.currentTariff')}</p>
                                    <p className="font-bold text-main-text text-xl uppercase">
                                        {t('profile.basic')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-desc-text text-xs uppercase tracking-wider mb-1">{t('profile.status')}</p>
                                    <p className="text-desc-text font-bold uppercase tracking-wider">
                                        {t('profile.active')}
                                    </p>
                                </div>
                                <div className="mt-4 pt-4 border-t border-card-border">
                                    <p className="text-xs opacity-50 mt-2">
                                        {t('pricing.noSubText')}
                                    </p>
                                </div>
                            </>
                        )}

                    </div>
                </div>
            </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
