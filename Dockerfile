# Используем базовый образ Kali Linux
FROM kalilinux/kali-rolling

# Обновляем список пакетов и устанавливаем инструменты
RUN apt update && apt install -y \
    nmap \
    gobuster \
    whatweb \
    whois \
    dnsutils \
    curl \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Создаем директорию для wordlist'ов и копируем туда common.txt
RUN mkdir -p /usr/share/wordlists/dirb/
COPY common.txt /usr/share/wordlists/dirb/common.txt

# Устанавливаем рабочую директорию
WORKDIR /app

# Команда по умолчанию
CMD ["sleep", "infinity"]