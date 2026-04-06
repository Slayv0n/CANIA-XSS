// import { useTheme } from '../../context/ThemeContext';

export const Forward = ({ className = "w-5 h-5" }) => {
    // const { theme } = useTheme();
    // stroke={theme === 'light' ? '#4E4E4E' : '#D3D3D3'}
    return (
        <svg className={className} width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14.1495 3L25.1494 14M25.1494 14L14.1495 25M25.1494 14H3.14941"
        stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
)}
