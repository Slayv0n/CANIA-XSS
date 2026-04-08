// import { useLanguage } from '../context/LanguageContext';

interface PasswordStrengthProps {
  password?: string; // делаем опциональным на случай пустого поля
}

export default function PasswordStrength({ password = '' }: PasswordStrengthProps) {
//   const { t } = useLanguage();

  // 1. Считаем баллы (от 0 до 4)
  const getStrengthScore = (pass: string): number => {
    let score = 0;
    if (!pass) return score;

    // +1 балл за длину (больше 7 символов)
    if (pass.length > 7) score += 1;

    // +1 балл за наличие хотя бы одной цифры
    if (/[0-9]/.test(pass)) score += 1;

    // +1 балл за наличие и строчных, и заглавных букв
    if (/[a-zа-я]/.test(pass) && /[A-ZА-Я]/.test(pass)) score += 1;

    // +1 балл за спецсимволы (всё, что не буква и не цифра)
    if (/[^A-Za-z0-9А-Яа-я]/.test(pass)) score += 1;

    return score;
  };

  const score = getStrengthScore(password);

  // Если пароль пустой — вообще не рисуем компонент, чтобы не занимал место
  if (!password) return null;

  // 2. Определяем цвет полосок в зависимости от баллов
  const getScoreColor = () => {
    if (score <= 1) return 'bg-red-500'; // Слабый
    if (score === 2 || score === 3) return 'bg-yellow-500'; // Средний
    return 'bg-green-500'; // Надежный
  };

  // 3. Текст-подсказка
  const getScoreText = () => {
    if (score <= 1) return 'Слабый пароль';
    if (score === 2 || score === 3) return 'Средний пароль';
    return 'Надежный пароль';
  };

  // 4. Отрисовка
  return (
    <div className="flex flex-col gap-1 mt-1 animate-fade-in">
      {/* Контейнер для 4 полосочек */}
      <div className="flex gap-1 h-1.5 w-full">
        {/*
           Тут нам нужно нарисовать 4 div'а.
           Если индекс div'а меньше чем score -> красим его в getScoreColor()
           Иначе -> красим в серый (например, 'bg-card-border')
        */}
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i} 
            className={`${
                i < score ? getScoreColor() : 'bg-card-border'
              } h-full w-full rounded-sm`}
          />
        ))}

      </div>
      
      {/* Текст под полосками */}
      <span className="text-xs text-desc-text text-right">
        {getScoreText()}
      </span>
    </div>
  );
}