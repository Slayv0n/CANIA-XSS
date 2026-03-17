import Footer from "../components/Footer";
import Header from "../components/Header";

interface NotFoundProps {
  onGoHome: () => void;
}

export default function NotFound({ onGoHome }: NotFoundProps) {
  return (
    <>
    <Header />
    <main className="flex-1 flex flex-col items-center justify-center text-center px-4 min-h-[60vh] relative z-10">
      <h2 className="text-3xl md:text-4xl font-bold uppercase text-main-text mb-2 font-title">
        Упс!
      </h2>
      <h1 className="text-[140px] md:text-[220px] font-black leading-none text-brand-red drop-shadow-[0_0_60px_rgba(195,28,26,0.6)] select-none font-title">
        404
      </h1>
      <p className="text-desc-text text-sm md:text-base max-w-md mt-6 leading-relaxed font-body">
        Страница где-то потерялась и мы не можем ее найти
        <br />
        Попробуйте вернуться на{' '}
        <button
          onClick={onGoHome}
          className="text-brand-red font-bold hover:underline cursor-pointer transition-colors"
        >
          главную.
        </button>
      </p>
    </main>
    <Footer />
    </>
  );
}