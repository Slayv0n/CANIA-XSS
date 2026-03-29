import { useTheme } from '../../context/ThemeContext';

export const Light = () => {
    const { theme } = useTheme();
    
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clipPath="url(#clip0_665_1192)">
        <path d="M9.99967 0.833313V2.49998M9.99967 17.5V19.1666M3.51634 3.51665L4.69967 4.69998M15.2997 15.3L16.483 16.4833M0.833008 9.99998H2.49967M17.4997 9.99998H19.1663M3.51634 16.4833L4.69967 15.3M15.2997 4.69998L16.483 3.51665M14.1663 9.99998C14.1663 12.3012 12.3009 14.1666 9.99967 14.1666C7.69849 14.1666 5.83301 12.3012 5.83301 9.99998C5.83301 7.69879 7.69849 5.83331 9.99967 5.83331C12.3009 5.83331 14.1663 7.69879 14.1663 9.99998Z"
        stroke={theme === 'light' ? '#4E4E4E' : '#D3D3D3'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </g>
        <defs>
        <clipPath id="clip0_665_1192">
        <rect width="20" height="20" fill="white"/>
        </clipPath>
        </defs>
        </svg>
    )
}
