import { useTheme } from '../../context/ThemeContext';

export const Mail = () => {
    const { theme } = useTheme();
    
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18.3337 5.00001C18.3337 4.08334 17.5837 3.33334 16.667 3.33334H3.33366C2.41699 3.33334 1.66699 4.08334 1.66699 5.00001M18.3337 5.00001V15C18.3337 15.9167 17.5837 16.6667 16.667 16.6667H3.33366C2.41699 16.6667 1.66699 15.9167 1.66699 15V5.00001M18.3337 5.00001L10.0003 10.8333L1.66699 5.00001"
        stroke={theme === 'light' ? '#4E4E4E' : '#D3D3D3'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    )
}
