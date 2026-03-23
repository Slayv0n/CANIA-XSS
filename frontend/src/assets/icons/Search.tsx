import { useTheme } from '../../context/AppContext';
export const Search = ({ className = "w-5 h-5" }) => {
    const { theme } = useTheme();
    return (
        <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" 
        stroke={theme === 'light' ? '#4E4E4E' : '#D3D3D3'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    )
    
}
// stroke="#E9E9E9" дефолтное значение