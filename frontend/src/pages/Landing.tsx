import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Hero from '../components/Hero';
import Features from '../components/Features';
import HowItWorks from '../components/HowItWorks';
import Safety from '../components/Safety';
import Prices from '../components/Prices';
import FAQ from '../components/FAQ';
import Footer from '../components/Footer';
import BackgroundDecor from '../components/BackgroundDecor';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';

export default function Landing() {
  const { isAuth } = useAuth();
  const { setLoginModal } = useUI();
  const navigate = useNavigate();

  const handleTryIt = () => {
    if (isAuth) navigate('/profile');
    else setLoginModal(true);
  };

  return (
    <>
      <Header />
      <main className="relative w-full overflow-hidden">
        <BackgroundDecor />
        <div className="relative z-10">
          <Hero onTryClick={handleTryIt} />
          <Features onTryClick={handleTryIt} />
          <HowItWorks />
          <Safety onTryClick={handleTryIt} />
          <Prices isModal={false} />
          <FAQ />
        </div>
      </main>
      <Footer />
    </>
  );
}