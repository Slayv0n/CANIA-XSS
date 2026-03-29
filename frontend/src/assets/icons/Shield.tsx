import { useTheme } from '../../context/ThemeContext';


export const Shield = ({ className = "w-5 h-5" }) => {
    const { theme } = useTheme();
    return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 5.75C6.46154 5.75 12 2 12 2C12 2 17.5385 5.75 20 5.75V11.375C20 19.5 12 22 12 22C12 22 4 19.5 4 11.375V5.75Z" stroke={theme === 'light' ? '#4E4E4E' : '#D3D3D3'} strokeWidth="2" strokeLinejoin="round"/>
    </svg>
    )
}
