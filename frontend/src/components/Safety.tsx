import { Forward } from '../assets/icons';

interface SafetyProps {
  onTryClick: () => void;
}

export default function Safety({ onTryClick }: SafetyProps) {
  const safetyItems = [
    {
      title: "Безопасность для вас",
      text: `Все сканирования выполняются в изолированной среде. Мы не сохраняем ваши данные, не передаём их третьим лицам и не используем для обучения моделей.
      После завершения аудита все временные файлы удаляются автоматически.`,
      spanClass: "md:col-start-1 md:col-span-2" 
    },
    {
      title: "Безопасность для цели",
      text: `Наши тестовые запросы не наносят вреда системе. 
      Они имитируют реальные атаки, но не эксплуатируют уязвимости — только обнаруживают их. 
      Вы можете остановить сканирование в любой момент.`,
      spanClass: "md:col-start-2 md:col-span-2"
    },
    {
      title: "Прозрачность и контроль",
      text: `Перед запуском вы выбираете типы атак, глубину сканирования и целевые параметры. 
      В отчёте — подробное описание каждой найденной уязвимости с 
      рекомендациями по исправлению. Никакой магии — только прозрачные результаты.`,
      spanClass: "md:col-start-1 md:col-span-2"
    }
  ];

  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl md:text-6xl font-bold uppercase mb-24 text-center text-main-text">
          КАК МЫ ГАРАНТИРУЕМ БЕЗОПАСНОСТЬ?
        </h2>
        <div className="flex flex-col">
          {safetyItems.map((item, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-3 w-full">
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 py-16 border-b border-light-red ${item.spanClass}`}>
                <h3 className="text-xl md:text-2xl font-bold uppercase leading-tight text-main-text">
                  {item.title}
                </h3>
                <p className="text-xs md:text-sm text-desc-text leading-relaxed self-end">
                  {item.text}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="w-full flex justify-end mt-20">
          <button
            onClick={onTryClick}
            className="bg-transparent border-brand-red border text-main-text px-10 py-4 rounded-4xl font-bold uppercase flex items-center gap-2 hover:bg-brand-red hover:text-white transition-colors duration-300 cursor-pointer group"
          >
            Запустить аудит <Forward />
          </button>
        </div>
      </div>
    </section>
  );
}